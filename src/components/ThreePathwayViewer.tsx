import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SensoryPathway, PathwayStep } from '../data/pathwayData';
import { soundEffects } from '../audio/soundEffects';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Camera, 
  Volume2, 
  VolumeX,
  ChevronDown,
  ChevronUp,
  Tag,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles
} from 'lucide-react';

interface ThreePathwayViewerProps {
  pathway: SensoryPathway;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  autoPlay: boolean;
  onToggleAutoPlay: () => void;
}

interface AnnotationLabel {
  text: string;
  pos: THREE.Vector3;
  subtext?: string;
  color?: string;
}

export const ThreePathwayViewer: React.FC<ThreePathwayViewerProps> = ({
  pathway,
  currentStepIndex,
  onStepChange,
  autoPlay,
  onToggleAutoPlay,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'receptor' | 'channel' | 'synapse'>('overview');
  const [isMuted, setIsMuted] = useState(soundEffects.getMuted());
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'cellular' | 'molecular'>('cellular');
  const [labels2D, setLabels2D] = useState<{ text: string; x: number; y: number; subtext?: string; color?: string }[]>([]);

  // Three.js Core Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const pathwayGroupRef = useRef<THREE.Group | null>(null);
  const currentPathwayIdRef = useRef<string>(pathway.id);

  // Dynamic Camera & Interaction
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 5.5, 17));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.5, 0));
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.5, 0));
  const zoomFactorRef = useRef<number>(1);

  // Animation values
  const animTimeRef = useRef<number>(0);
  const activeAnnotationsRef = useRef<AnnotationLabel[]>([]);
  const animatedChannelPoreRef = useRef<THREE.Object3D | null>(null);
  const animatedStereociliaRef = useRef<THREE.Object3D | null>(null);
  const animatedBasilarMembraneRef = useRef<THREE.Object3D | null>(null);
  const animatedParticlesRef = useRef<THREE.Points | null>(null);
  const animatedLightConeRef = useRef<THREE.Mesh | null>(null);

  const currentStep: PathwayStep = pathway.steps[currentStepIndex] || pathway.steps[0];

  // Camera presets
  const applyCameraPreset = (preset: 'overview' | 'receptor' | 'channel' | 'synapse') => {
    setCameraPreset(preset);
    switch (preset) {
      case 'overview':
        targetCamPosRef.current.set(0, 5.5, 17);
        targetLookAtRef.current.set(0, 0.5, 0);
        break;
      case 'receptor':
        targetCamPosRef.current.set(-2.5, 3.8, 9.5);
        targetLookAtRef.current.set(-1.2, 1.8, 0);
        break;
      case 'channel':
        targetCamPosRef.current.set(2.4, 3.2, 8.5);
        targetLookAtRef.current.set(1.2, 1.2, 0);
        break;
      case 'synapse':
        targetCamPosRef.current.set(3.5, -2.5, 10);
        targetLookAtRef.current.set(1.8, -2.8, 0);
        break;
    }
  };

  const handleZoom = (delta: number) => {
    zoomFactorRef.current = THREE.MathUtils.clamp(zoomFactorRef.current + delta, 0.6, 2.0);
    if (cameraRef.current) {
      targetCamPosRef.current.multiplyScalar(delta > 0 ? 0.88 : 1.12);
    }
  };

  const handleToggleAudio = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
  };

  const handleNextStep = () => {
    if (currentStepIndex < pathway.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      onStepChange(nextIdx);
      soundEffects.playStepSound(pathway.steps[nextIdx].category);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      onStepChange(prevIdx);
      soundEffects.playStepSound(pathway.steps[prevIdx].category);
    }
  };

  // Auto-play interval
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      const nextIdx = currentStepIndex >= pathway.steps.length - 1 ? 0 : currentStepIndex + 1;
      onStepChange(nextIdx);
      soundEffects.playStepSound(pathway.steps[nextIdx].category);
    }, 2800 / speedMultiplier);

    return () => clearInterval(interval);
  }, [autoPlay, currentStepIndex, pathway, speedMultiplier, onStepChange]);

  // =========================================================================
  // HIGH-FIDELITY PROCEDURAL 3D ANATOMICAL MODEL BUILDER
  // Built to faithfully match real histology and cryo-EM protein structures
  // =========================================================================
  const buildPathwaySpecificModel = (pathwayId: string, scene: THREE.Scene, isSoftwareGl: boolean) => {
    if (pathwayGroupRef.current) {
      scene.remove(pathwayGroupRef.current);
      pathwayGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      });
    }

    const group = new THREE.Group();
    pathwayGroupRef.current = group;
    activeAnnotationsRef.current = [];
    animatedChannelPoreRef.current = null;
    animatedStereociliaRef.current = null;
    animatedBasilarMembraneRef.current = null;
    animatedLightConeRef.current = null;

    // PBR Material Palette
    const membraneSlabMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
    });
    const lipidHeadMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.15,
      clearcoat: 0.4,
    });
    const lipidInnerHeadMat = new THREE.MeshPhysicalMaterial({
      color: 0x818cf8,
      roughness: 0.3,
      metalness: 0.1,
    });

    // ------------------------------------------------------------------------
    // 1. JALUR OPTIK: Anatomi Sel Batang Retina Utuh (Rod Photoreceptor Cell)
    // Outer Segment Discs + Connecting Cilium + Inner Segment + Spherule Synapse
    // ------------------------------------------------------------------------
    if (pathwayId === 'optik') {
      const rodCellGroup = new THREE.Group();
      rodCellGroup.position.set(-1.0, 0, 0);

      // (A) Segmen Luar (Outer Segment) - Packed with 10 Lamellar Discs
      const outerSegmentHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 2.8, 6.5, 32, 1, true),
        new THREE.MeshPhysicalMaterial({
          color: 0x0f172a,
          roughness: 0.2,
          transmission: isSoftwareGl ? 0 : 0.85,
          transparent: true,
          opacity: isSoftwareGl ? 0.25 : 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      outerSegmentHousing.position.y = 3.5;
      rodCellGroup.add(outerSegmentHousing);

      // Disc lamellae stack
      const discGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.22, 32);
      const discMat = new THREE.MeshPhysicalMaterial({
        color: 0x334155,
        roughness: 0.35,
        metalness: 0.2,
        clearcoat: 0.3,
      });

      for (let i = 0; i < 8; i++) {
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.position.y = 1.0 + i * 0.65;
        rodCellGroup.add(disc);

        // Phospholipid rim edge
        const discEdge = new THREE.Mesh(
          new THREE.TorusGeometry(2.5, 0.1, 12, 32),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
        );
        discEdge.rotation.x = Math.PI / 2;
        discEdge.position.y = 1.0 + i * 0.65;
        rodCellGroup.add(discEdge);
      }

      // Rhodopsin 7-TM helical bundle inside disc 4
      const rhodopsinGroup = new THREE.Group();
      rhodopsinGroup.position.set(-0.9, 2.95, 0);
      const helixGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 12);
      const helixMat = new THREE.MeshPhysicalMaterial({
        color: 0xf43f5e,
        roughness: 0.2,
        metalness: 0.3,
        clearcoat: 0.7,
      });
      for (let h = 0; h < 7; h++) {
        const ang = (h / 7) * Math.PI * 2;
        const helix = new THREE.Mesh(helixGeo, helixMat);
        helix.position.set(Math.cos(ang) * 0.32, 0, Math.sin(ang) * 0.32);
        rhodopsinGroup.add(helix);
      }

      // Chromophore 11-cis-retinal inside
      const retinalMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.05, 12, 16),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.7 })
      );
      retinalMesh.rotation.x = Math.PI / 2;
      rhodopsinGroup.add(retinalMesh);
      rodCellGroup.add(rhodopsinGroup);

      // Transducin (Gt) Gα/Gβ/Gγ heterotrimer
      const transducinGroup = new THREE.Group();
      transducinGroup.position.set(-0.2, 2.6, 0.5);
      const gAlpha = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 }));
      const gBeta = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 }));
      const gGamma = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3 }));
      gBeta.position.set(0.26, 0, 0);
      gGamma.position.set(0.2, 0.18, 0);
      transducinGroup.add(gAlpha, gBeta, gGamma);
      rodCellGroup.add(transducinGroup);

      // PDE6 catalytic enzyme
      const pdeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.45, 0.6),
        new THREE.MeshPhysicalMaterial({ color: 0xa855f7, roughness: 0.3, metalness: 0.2 })
      );
      pdeMesh.position.set(0.9, 2.95, 0);
      rodCellGroup.add(pdeMesh);

      // CNG Cation Channel on Plasma Membrane
      const cngChannel = new THREE.Group();
      cngChannel.position.set(2.8, 2.95, 0);
      const cngPore = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.14, 16, 32),
        new THREE.MeshPhysicalMaterial({ color: 0x6366f1, roughness: 0.25, metalness: 0.35, clearcoat: 0.5 })
      );
      cngPore.rotation.y = Math.PI / 2;
      cngChannel.add(cngPore);
      animatedChannelPoreRef.current = cngPore;
      rodCellGroup.add(cngChannel);

      // (B) Connecting Cilium (Silia Penghubung Sempit)
      const ciliumStalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 1.0, 16),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 })
      );
      ciliumStalk.position.y = -0.2;
      rodCellGroup.add(ciliumStalk);

      // (C) Segmen Dalam (Inner Segment) - Packed with Mitochondria (Ellipsoid)
      const innerSegmentHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.2, 3.2, 32),
        new THREE.MeshPhysicalMaterial({
          color: 0x1e293b,
          roughness: 0.4,
          transparent: true,
          opacity: 0.75,
        })
      );
      innerSegmentHousing.position.y = -2.2;
      rodCellGroup.add(innerSegmentHousing);

      // Mitochondria cluster (energy generator for Na+/K+ ATPase)
      const mitoMat = new THREE.MeshPhysicalMaterial({ color: 0xf97316, roughness: 0.3, clearcoat: 0.3 });
      const mitoGeo = new THREE.CapsuleGeometry(0.2, 0.6, 8, 16);
      for (let m = 0; m < 6; m++) {
        const ang = (m / 6) * Math.PI * 2;
        const mito = new THREE.Mesh(mitoGeo, mitoMat);
        mito.position.set(Math.cos(ang) * 1.1, -1.8 + (m % 2) * 0.4, Math.sin(ang) * 1.1);
        mito.rotation.z = (Math.random() - 0.5) * 0.4;
        rodCellGroup.add(mito);
      }

      // (D) Spherule Synaptic Terminal below
      const spherule = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45 })
      );
      spherule.position.y = -4.5;
      rodCellGroup.add(spherule);

      // Synaptic Ribbon & Glutamate Vesicles inside spherule
      const ribbonBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.0, 12),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 })
      );
      ribbonBar.position.set(0, -4.5, 0.8);
      rodCellGroup.add(ribbonBar);

      const vesMat = new THREE.MeshPhysicalMaterial({ color: 0xec4899, roughness: 0.2, clearcoat: 0.5 });
      for (let v = 0; v < 14; v++) {
        const ves = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), vesMat);
        const ang = (v / 14) * Math.PI * 2;
        ves.position.set(Math.cos(ang) * 0.35, -4.5 + (v % 3) * 0.15 - 0.15, 0.8 + Math.sin(ang) * 0.35);
        rodCellGroup.add(ves);
      }

      // Incoming Light Ray Cone
      const lightConeGeo = new THREE.ConeGeometry(2.2, 6.5, 32, 1, true);
      const lightConeMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const lightCone = new THREE.Mesh(lightConeGeo, lightConeMat);
      lightCone.position.set(-0.9, 6.5, 0);
      lightCone.rotation.x = Math.PI;
      animatedLightConeRef.current = lightCone;
      rodCellGroup.add(lightCone);

      group.add(rodCellGroup);

      activeAnnotationsRef.current = [
        { text: 'Segmen Luar Sel Batang (Outer Segment)', pos: new THREE.Vector3(-1.0, 5.5, 2.0), color: '#38bdf8' },
        { text: 'Rhodopsin (7-TM) + 11-cis-Retinal', pos: new THREE.Vector3(-1.9, 3.2, 0), color: '#f43f5e' },
        { text: 'Transducin (Gt) & PDE6', pos: new THREE.Vector3(-0.1, 2.6, 0.8), color: '#a855f7' },
        { text: 'Kanal Kation CNG (Arus Gelap)', pos: new THREE.Vector3(1.8, 3.2, 0), color: '#6366f1' },
        { text: 'Silia Penghubung (Connecting Cilium)', pos: new THREE.Vector3(-1.0, -0.2, 1.2), color: '#94a3b8' },
        { text: 'Mitokondria Segmen Dalam (Pemasok ATP)', pos: new THREE.Vector3(-1.0, -2.0, 1.8), color: '#f97316' },
        { text: 'Pita Sinaps Spherule (Eksositosis Glutamat)', pos: new THREE.Vector3(-1.0, -4.5, 1.6), color: '#ec4899' },
      ];
    }

    // ------------------------------------------------------------------------
    // 2. JALUR INTEGUMEN: Lapisan Kulit & Kanal TRPV1 Berdasar Struktur Cryo-EM
    // Epidermis Stratum Corneum + Ujung Saraf Bebas + Tetramer TRPV1 S1-S6 & ARD
    // ------------------------------------------------------------------------
    else if (pathwayId === 'integumen') {
      const skinGroup = new THREE.Group();

      // Stratum Corneum (Lapisan Kulit Terluar)
      const corneum = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85, transparent: true, opacity: 0.4 })
      );
      corneum.position.y = 4.0;
      skinGroup.add(corneum);

      // Stratum Basale / Epidermal Layer
      const epidermis = new THREE.Mesh(
        new THREE.BoxGeometry(14, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7, transparent: true, opacity: 0.35 })
      );
      epidermis.position.y = 2.8;
      skinGroup.add(epidermis);

      // Free Nerve Ending Axon Terminal Membrane Bilayer
      const slab = new THREE.Mesh(new THREE.BoxGeometry(12, 0.7, 7), membraneSlabMat);
      slab.position.y = 0.5;
      skinGroup.add(slab);

      // Phospholipid heads uniform grid
      const headGeo = new THREE.SphereGeometry(0.14, 12, 12);
      for (let x = -5.5; x <= 5.5; x += 0.55) {
        for (let z = -3.0; z <= 3.0; z += 0.55) {
          if (Math.abs(x) < 1.1 && Math.abs(z) < 1.1) continue; // Leave central pore open
          const up = new THREE.Mesh(headGeo, lipidHeadMat);
          up.position.set(x, 0.9, z);
          const down = new THREE.Mesh(headGeo, lipidInnerHeadMat);
          down.position.set(x, 0.1, z);
          skinGroup.add(up, down);
        }
      }

      // Authentic TRPV1 Tetrameric Channel Architecture (Cryo-EM PDB 7L29 format)
      const trpvTetramer = new THREE.Group();
      trpvTetramer.position.set(0, 0.5, 0);

      // 4 Subunits (S1-S4 Voltage/Thermal Sensor + S5-S6 Pore Domain + Cytosolic ARD)
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const subGroup = new THREE.Group();
        subGroup.position.set(Math.cos(ang) * 0.85, 0, Math.sin(ang) * 0.85);
        subGroup.rotation.y = -ang;

        // S5-S6 Inner Pore Helices (Scarlet)
        const poreHelix = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.24, 1.6, 14),
          new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.25, clearcoat: 0.6 })
        );
        poreHelix.position.set(0, 0, 0);
        subGroup.add(poreHelix);

        // S1-S4 Outer Thermal Sensor Bundle (Orange)
        const sensorBundle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.26, 1.4, 12),
          new THREE.MeshPhysicalMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.2 })
        );
        sensorBundle.position.set(0.42, 0, 0);
        subGroup.add(sensorBundle);

        // Cytosolic Ankyrin Repeat Domain (ARD Fingers underneath)
        const ardFinger = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.8, 0.4),
          new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.15 })
        );
        ardFinger.position.set(0.15, -0.9, 0);
        subGroup.add(ardFinger);

        trpvTetramer.add(subGroup);
      }

      // Central Ion Conduction Pore Ring
      const trpvPoreRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.12, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.8 })
      );
      trpvPoreRing.rotation.x = Math.PI / 2;
      trpvPoreRing.position.y = 0.3;
      animatedChannelPoreRef.current = trpvPoreRing;
      trpvTetramer.add(trpvPoreRing);
      skinGroup.add(trpvTetramer);

      // Thermal Shimmer Waves (Heat 40°C radiating into skin)
      const heatGroup = new THREE.Group();
      heatGroup.name = 'heatWaves';
      for (let h = 0; h < 4; h++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.4 + h * 0.9, 0.05, 12, 32),
          new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.6 - h * 0.12 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 2.0 + h * 0.6;
        heatGroup.add(ring);
      }
      skinGroup.add(heatGroup);

      // Sensory Axon shaft propagating potential action
      const axonShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 4.0, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45 })
      );
      axonShaft.position.set(0, -2.5, 0);
      skinGroup.add(axonShaft);

      group.add(skinGroup);

      activeAnnotationsRef.current = [
        { text: 'Stratum Corneum & Epidermis Kulit', pos: new THREE.Vector3(0, 4.2, 0), color: '#f59e0b' },
        { text: 'Stimulus Termal (Suhu ≥40°C)', pos: new THREE.Vector3(0, 2.6, 2.2), color: '#f97316' },
        { text: 'Kanal TRPV1 Tetramer (Cryo-EM S1-S6)', pos: new THREE.Vector3(0, 1.4, 1.6), color: '#ef4444' },
        { text: 'Domain Ankyrin Repeat Intraseluler (ARD)', pos: new THREE.Vector3(0, -0.6, 1.4), color: '#d97706' },
        { text: 'Influks Na+ & Ca2+ → Potensial Aksi Akson C/Aδ', pos: new THREE.Vector3(0, -2.5, 1.4), color: '#38bdf8' },
      ];
    }

    // ------------------------------------------------------------------------
    // 3. JALUR OLFAKTORI: Neuron Sensorik Olfaktori Bipolar & Silia di Mukosa
    // Mucus Layer + Knob Olfaktori + Silia + Lamina Cribrosa + Bulbus Olfaktorius
    // ------------------------------------------------------------------------
    else if (pathwayId === 'olfaktori') {
      const olfEpithGroup = new THREE.Group();

      // Mucus Layer on Top (disekresikan kelenjar Bowman)
      const mucus = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.8, 8),
        new THREE.MeshPhysicalMaterial({
          color: 0x059669,
          transparent: true,
          opacity: 0.25,
          roughness: 0.1,
          depthWrite: false,
        })
      );
      mucus.position.y = 3.2;
      olfEpithGroup.add(mucus);

      // Olfactory Dendritic Knob (Knob pembengkakan apikal)
      const knob = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
      );
      knob.position.set(-2.0, 1.8, 0);
      olfEpithGroup.add(knob);

      // Olfactory Cilia projecting into mucus (4 long slender cilia)
      const ciliumCurveGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.5, 16);
      ciliumCurveGeo.translate(0, 2.75, 0);
      const cilMat = new THREE.MeshPhysicalMaterial({
        color: 0x10b981,
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.4,
      });

      for (let c = 0; c < 4; c++) {
        const cil = new THREE.Mesh(ciliumCurveGeo, cilMat);
        cil.position.set(-2.0, 1.8, 0);
        cil.rotation.z = -Math.PI / 2.5 + c * 0.25;
        cil.rotation.y = (c - 1.5) * 0.3;
        olfEpithGroup.add(cil);
      }

      // Highlighted Ciliary Membrane (Enlarged detail on right cilium)
      const ciliumFocus = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 9, 32),
        new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.15, clearcoat: 0.3 })
      );
      ciliumFocus.rotation.z = Math.PI / 2;
      ciliumFocus.position.set(1.5, 1.2, 0);
      olfEpithGroup.add(ciliumFocus);

      // GPCR with Odorant Molecule
      const olfGpcr = new THREE.Group();
      olfGpcr.position.set(-1.0, 2.7, 0);
      const gpcrBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 1.2, 16),
        new THREE.MeshPhysicalMaterial({ color: 0x059669, roughness: 0.25, metalness: 0.3, clearcoat: 0.6 })
      );
      olfGpcr.add(gpcrBarrel);

      const odorantMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.24),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.7 })
      );
      odorantMesh.position.y = 0.75;
      olfGpcr.add(odorantMesh);
      olfEpithGroup.add(olfGpcr);

      // Golf Protein Trimer
      const golfAlpha = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
      );
      golfAlpha.position.set(-0.8, 1.7, 0.4);
      olfEpithGroup.add(golfAlpha);

      // Adenylyl Cyclase III
      const ac3 = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.75, 0.75),
        new THREE.MeshPhysicalMaterial({ color: 0xa855f7, roughness: 0.3, metalness: 0.25 })
      );
      ac3.position.set(1.0, 2.7, 0);
      olfEpithGroup.add(ac3);

      // CNG Cation Channel (Ca2+ & Na+ Influx)
      const cngOlf = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.14, 16, 32),
        new THREE.MeshPhysicalMaterial({ color: 0x3b82f6, roughness: 0.25, metalness: 0.3 })
      );
      cngOlf.rotation.x = Math.PI / 2;
      cngOlf.position.set(2.8, 2.7, 0);
      olfEpithGroup.add(cngOlf);

      // Anoctamin-2 (ANO2 / TMEM16B) Ca2+-activated Cl- Channel (Cl- EFFLUX OUT!)
      const ano2Channel = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.16, 16, 32),
        new THREE.MeshPhysicalMaterial({ color: 0x22c55e, roughness: 0.2, metalness: 0.35, clearcoat: 0.5 })
      );
      ano2Channel.rotation.x = Math.PI / 2;
      ano2Channel.position.set(4.6, 2.7, 0);
      animatedChannelPoreRef.current = ano2Channel;
      olfEpithGroup.add(ano2Channel);

      // Bipolar Soma & Basal Axon passing through Lamina Cribrosa
      const somaBipolar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.6, 3.2, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45 })
      );
      somaBipolar.position.set(-2.0, -1.0, 0);
      olfEpithGroup.add(somaBipolar);

      // Lamina Cribrosa Bone Plate
      const bonePlate = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75 })
      );
      bonePlate.position.y = -3.2;
      olfEpithGroup.add(bonePlate);

      // Axon penetrating bone hole
      const axonPene = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 2.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
      );
      axonPene.position.set(-2.0, -3.8, 0);
      olfEpithGroup.add(axonPene);

      group.add(olfEpithGroup);

      activeAnnotationsRef.current = [
        { text: 'Lapisan Mukus & Silia Olfaktori', pos: new THREE.Vector3(-2.0, 3.8, 0), color: '#10b981' },
        { text: 'GPCR Olfaktori + Molekul Odoran', pos: new THREE.Vector3(-1.0, 3.4, 0), color: '#34d399' },
        { text: 'Adenylyl Cyclase III (cAMP ↑)', pos: new THREE.Vector3(1.0, 3.4, 0), color: '#c084fc' },
        { text: 'Kanal CNG (Influks Ca2+ & Na+)', pos: new THREE.Vector3(2.8, 3.4, 0), color: '#60a5fa' },
        { text: 'Kanal ANO2 (Efluks Cl- Keluar → Depolarisasi)', pos: new THREE.Vector3(4.6, 3.4, 0), color: '#4ade80' },
        { text: 'Akson Menembus Lamina Cribrosa Tulang Tapis', pos: new THREE.Vector3(-2.0, -3.8, 1.2), color: '#94a3b8' },
      ];
    }

    // ------------------------------------------------------------------------
    // 4. JALUR GUSTATORI: Anatomi Kuncup Pengecap Lidah & Sel Tipe II (Rasa Manis)
    // Onion Taste Bud + Taste Pore + Heterodimer T1R2/T1R3 + RE Ca2+ + CALHM1/3
    // ------------------------------------------------------------------------
    else if (pathwayId === 'gustatori') {
      const tasteBudGroup = new THREE.Group();

      // Tongue Epithelial Surface & Taste Pore
      const tongueEpithelium = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.6, transparent: true, opacity: 0.5 })
      );
      tongueEpithelium.position.y = 3.6;
      tasteBudGroup.add(tongueEpithelium);

      // Taste Bud Onion Housing Outline (Cutaway view)
      const budHousing = new THREE.Mesh(
        new THREE.SphereGeometry(3.6, 32, 24, 0, Math.PI * 1.4),
        new THREE.MeshPhysicalMaterial({
          color: 0x500724,
          roughness: 0.45,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        })
      );
      budHousing.scale.set(0.9, 1.3, 0.9);
      budHousing.position.y = 0.5;
      tasteBudGroup.add(budHousing);

      // Type II Taste Receptor Cell (Spindle-shaped Light Cell in center)
      const cellBody = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.3, 5.0, 32),
        new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.35, clearcoat: 0.3 })
      );
      cellBody.position.set(0, 0.8, 0);
      tasteBudGroup.add(cellBody);

      // Apical Microvilli projecting into Taste Pore Saliva
      const microvilliGroup = new THREE.Group();
      microvilliGroup.position.set(0, 3.3, 0);
      const mvGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12);
      for (let m = -0.7; m <= 0.7; m += 0.22) {
        const mv = new THREE.Mesh(mvGeo, new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 }));
        mv.position.set(m, 0.4, (Math.random() - 0.5) * 0.4);
        microvilliGroup.add(mv);
      }
      tasteBudGroup.add(microvilliGroup);

      // Heterodimer T1R2 + T1R3 GPCR (Venus Flytrap Extracellular Domain)
      const t1rGroup = new THREE.Group();
      t1rGroup.position.set(-0.6, 3.6, 0);
      const vfd1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 16, 16),
        new THREE.MeshPhysicalMaterial({ color: 0xf43f5e, roughness: 0.25, metalness: 0.3 })
      );
      const vfd2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 16, 16),
        new THREE.MeshPhysicalMaterial({ color: 0xfb7185, roughness: 0.25, metalness: 0.3 })
      );
      vfd1.position.x = -0.25;
      vfd2.position.x = 0.25;
      t1rGroup.add(vfd1, vfd2);

      // Sugar Tastant (Glucose/Sucrose)
      const sugarMol = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.24),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.6 })
      );
      sugarMol.position.set(0, 0.45, 0);
      t1rGroup.add(sugarMol);
      tasteBudGroup.add(t1rGroup);

      // Endoplasmic Reticulum (Tubular Ca2+ store with IP3R3 channel)
      const erGroup = new THREE.Group();
      erGroup.position.set(-0.3, 1.2, 0);
      const erGeo = new THREE.TorusGeometry(0.9, 0.25, 16, 32);
      const erMat = new THREE.MeshPhysicalMaterial({
        color: 0x10b981,
        roughness: 0.3,
        metalness: 0.15,
        transparent: true,
        opacity: 0.85,
      });
      const erMesh = new THREE.Mesh(erGeo, erMat);
      erMesh.rotation.x = Math.PI / 3;
      erGroup.add(erMesh);

      const ip3rPore = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.07, 12, 24),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 })
      );
      ip3rPore.position.set(0.4, 0.2, 0.6);
      erGroup.add(ip3rPore);
      tasteBudGroup.add(erGroup);

      // TRPM5 Channel in plasma membrane
      const trpm5Channel = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.12, 16, 32),
        new THREE.MeshPhysicalMaterial({ color: 0xeab308, roughness: 0.25, metalness: 0.3 })
      );
      trpm5Channel.rotation.y = Math.PI / 2;
      trpm5Channel.position.set(1.6, 1.2, 0);
      tasteBudGroup.add(trpm5Channel);

      // CALHM1/CALHM3 Wide-Pore Hexameric Hemichannel (ATP Non-Vesicular Efflux)
      const calhmChannel = new THREE.Group();
      calhmChannel.position.set(1.6, -1.2, 0);
      const calhmPore = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.18, 16, 32),
        new THREE.MeshPhysicalMaterial({ color: 0x8b5cf6, roughness: 0.2, metalness: 0.35, clearcoat: 0.6 })
      );
      calhmPore.rotation.y = Math.PI / 2;
      calhmChannel.add(calhmPore);
      animatedChannelPoreRef.current = calhmPore;
      tasteBudGroup.add(calhmChannel);

      // Gustatory Afferent Nerve Terminal (N. VII / IX) with P2X2/P2X3
      const nerveTerminal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.6, 3.5, 24),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45 })
      );
      nerveTerminal.position.set(2.6, -2.6, 0);
      nerveTerminal.rotation.z = -Math.PI / 6;
      tasteBudGroup.add(nerveTerminal);

      group.add(tasteBudGroup);

      activeAnnotationsRef.current = [
        { text: 'Pori Pengecap (Taste Pore) & Mikrovili', pos: new THREE.Vector3(0, 4.0, 0), color: '#f43f5e' },
        { text: 'Heterodimer T1R2+T1R3 (Venus Flytrap Domain)', pos: new THREE.Vector3(-0.6, 4.2, 1.2), color: '#fb7185' },
        { text: 'Retikulum Endoplasma (Stok Ca2+ & IP3R3)', pos: new THREE.Vector3(-0.3, 1.6, 1.2), color: '#34d399' },
        { text: 'Kanal Kation TRPM5 (Influks Na+)', pos: new THREE.Vector3(2.2, 1.6, 0), color: '#eab308' },
        { text: 'Hemichannel CALHM1/3 (Pelepasan ATP Non-Vesikular)', pos: new THREE.Vector3(2.4, -0.8, 0), color: '#a855f7' },
        { text: 'Serabut Saraf Aferen Gustatori (P2X2/P2X3)', pos: new THREE.Vector3(3.2, -3.2, 0), color: '#38bdf8' },
      ];
    }

    // ------------------------------------------------------------------------
    // 5. JALUR VESTIBULAR: Makula Sakulus Nyata (Otolitik, Otoconia, Striola, Sel Rambut)
    // Hexagonal Calcite Otoconia + Gelatinous Matrix + Striola + Stereocilia Staircase
    // ------------------------------------------------------------------------
    else if (pathwayId === 'vestibular') {
      const maculaGroup = new THREE.Group();

      // Gelatinous Otolithic Membrane Sublayer
      const otolithSlab = new THREE.Mesh(
        new THREE.BoxGeometry(12, 1.0, 7),
        new THREE.MeshPhysicalMaterial({
          color: 0x0284c7,
          transparent: true,
          opacity: isSoftwareGl ? 0.35 : 0.5,
          roughness: 0.1,
          transmission: isSoftwareGl ? 0 : 0.8,
          depthWrite: false,
        })
      );
      otolithSlab.position.y = 4.2;
      maculaGroup.add(otolithSlab);

      // Authentic Faceted Calcite Otoconia Crystals (CaCO3)
      // Crystal habit: Barrel-shaped hexagonal prism with rhombohedral pointed ends!
      const otoconiaPrismGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 6);
      const otoconiaMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.7,
        clearcoat: 0.9,
      });

      for (let ox = -4.5; ox <= 4.5; ox += 0.7) {
        for (let oz = -2.5; oz <= 2.5; oz += 0.7) {
          const crystal = new THREE.Mesh(otoconiaPrismGeo, otoconiaMat);
          crystal.position.set(ox + (Math.random() - 0.5) * 0.2, 5.0, oz + (Math.random() - 0.5) * 0.2);
          crystal.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
          maculaGroup.add(crystal);
        }
      }

      // Striola demarcation line (Garis Striola pemisah polaritas)
      const striolaLine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 7),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
      );
      striolaLine.rotation.x = Math.PI / 2;
      striolaLine.position.set(-1.8, 4.75, 0);
      maculaGroup.add(striolaLine);

      // Hair Cell Body (Type I Flask-shaped & Type II Cylindrical)
      const hairCell = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 0.9, 3.2, 24),
        new THREE.MeshPhysicalMaterial({ color: 0x334155, roughness: 0.35 })
      );
      hairCell.position.set(0.5, 0.5, 0);
      maculaGroup.add(hairCell);

      // Hair Cell Apical Cuticular Plate
      const cuticularPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.3, 0.3, 24),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
      );
      cuticularPlate.position.set(0.5, 2.1, 0);
      maculaGroup.add(cuticularPlate);

      // Stereocilia Staircase Bundle (3 Tiers + 1 Kinocilium)
      const ciliaBundle = new THREE.Group();
      ciliaBundle.position.set(0.5, 2.25, 0);
      animatedStereociliaRef.current = ciliaBundle;

      const cilCyl = new THREE.CylinderGeometry(0.07, 0.07, 1, 16);
      cilCyl.translate(0, 0.5, 0);

      // Row 1 (Short H 1.2)
      for (let x = -0.6; x <= 0.6; x += 0.25) {
        const c = new THREE.Mesh(cilCyl, new THREE.MeshPhysicalMaterial({ color: 0xa855f7, roughness: 0.25 }));
        c.scale.set(1, 1.2, 1);
        c.position.set(x, 0, -0.4);
        ciliaBundle.add(c);
      }
      // Row 2 (Medium H 2.0)
      for (let x = -0.5; x <= 0.5; x += 0.22) {
        const c = new THREE.Mesh(cilCyl, new THREE.MeshPhysicalMaterial({ color: 0x8b5cf6, roughness: 0.25 }));
        c.scale.set(1, 2.0, 1);
        c.position.set(x, 0, 0);
        ciliaBundle.add(c);
      }
      // Row 3 (Tall H 2.8)
      for (let x = -0.4; x <= 0.4; x += 0.2) {
        const c = new THREE.Mesh(cilCyl, new THREE.MeshPhysicalMaterial({ color: 0x6366f1, roughness: 0.25 }));
        c.scale.set(1, 2.8, 1);
        c.position.set(x, 0, 0.4);
        ciliaBundle.add(c);
      }

      // Tall Kinocilium with apical bulb (H 3.8)
      const kinoMat = new THREE.MeshPhysicalMaterial({ color: 0xec4899, emissive: 0xbe185d, emissiveIntensity: 0.4 });
      const kino = new THREE.Mesh(cilCyl, kinoMat);
      kino.scale.set(1.2, 3.8, 1.2);
      kino.position.set(0, 0, 0.8);
      const kinoBulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), kinoMat);
      kinoBulb.position.set(0, 3.8, 0);
      kino.add(kinoBulb);
      ciliaBundle.add(kino);

      // Tip links connecting rows
      const tipLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 1.2, -0.4),
        new THREE.Vector3(0, 2.0, 0),
        new THREE.Vector3(0, 2.8, 0.4),
        new THREE.Vector3(0, 3.8, 0.8),
      ]);
      const tipLine = new THREE.Line(tipLineGeo, new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 2 }));
      ciliaBundle.add(tipLine);

      maculaGroup.add(ciliaBundle);

      // Basolateral Ribbon Synapse & Cav1.3 Ca2+ channel
      const ribbon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.0, 16),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 })
      );
      ribbon.position.set(0.5, -0.6, 0.7);
      maculaGroup.add(ribbon);

      const vesMat = new THREE.MeshPhysicalMaterial({ color: 0xf43f5e, roughness: 0.2, clearcoat: 0.5 });
      for (let v = 0; v < 12; v++) {
        const ves = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), vesMat);
        const ang = (v / 12) * Math.PI * 2;
        ves.position.set(0.5 + Math.cos(ang) * 0.3, -0.6 + (v % 3) * 0.15 - 0.15, 0.7 + Math.sin(ang) * 0.3);
        maculaGroup.add(ves);
      }

      // Supporting Epithelial Base of Sacculus
      const maculaBase = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.8, 7),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
      );
      maculaBase.position.y = -1.5;
      maculaGroup.add(maculaBase);

      // Lift Motion Vector Arrows
      const liftArrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.8, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      liftArrow.position.set(-3.5, 3.0, 0);
      maculaGroup.add(liftArrow);

      group.add(maculaGroup);

      activeAnnotationsRef.current = [
        { text: 'Kristal Otoconia CaCO3 (Calcite Hexagonal Prisms)', pos: new THREE.Vector3(0, 5.6, 0), color: '#ffffff' },
        { text: 'Membran Otolitik Gelatinosa', pos: new THREE.Vector3(3.2, 4.4, 0), color: '#38bdf8' },
        { text: 'Garis Striola (Pemisah Polaritas Sel Rambut)', pos: new THREE.Vector3(-1.8, 4.9, 1.2), color: '#f59e0b' },
        { text: 'Defleksi Tangga Stereosilia → Kinocilium', pos: new THREE.Vector3(0.5, 3.4, 1.2), color: '#ec4899' },
        { text: 'Endolimfe (+80 mV) → Influks K+ Kanal MET', pos: new THREE.Vector3(2.5, 2.5, 0), color: '#f43f5e' },
        { text: 'Pita Sinaps & Pelepasan Vesikel Glutamat', pos: new THREE.Vector3(0.5, -0.6, 1.4), color: '#fb7185' },
      ];
    }

    // ------------------------------------------------------------------------
    // 6. JALUR KOKLEAR: Penampang Melintang Organ Corti & Skala Duktus Koklearis
    // Membran Tektoria + Membran Basilaris + Sel Rambut Dalam + Pilar Corti
    // ------------------------------------------------------------------------
    else if (pathwayId === 'koklear') {
      const organCortiGroup = new THREE.Group();

      // Lower Basilar Membrane (Resonating Elastic Floor)
      const basilarMembrane = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.6, 7),
        new THREE.MeshPhysicalMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.25 })
      );
      basilarMembrane.position.y = -2.2;
      animatedBasilarMembraneRef.current = basilarMembrane;
      organCortiGroup.add(basilarMembrane);

      // Upper Tectorial Membrane (Gelatinous Overhanging Roof attached to Spiral Limbus)
      const tectorialMembrane = new THREE.Mesh(
        new THREE.BoxGeometry(11, 0.65, 5.5),
        new THREE.MeshPhysicalMaterial({
          color: 0x7c3aed,
          transparent: true,
          opacity: isSoftwareGl ? 0.35 : 0.65,
          roughness: 0.15,
          clearcoat: 0.5,
          depthWrite: false,
        })
      );
      tectorialMembrane.position.set(0.6, 3.4, 0);
      tectorialMembrane.rotation.z = -0.1;
      organCortiGroup.add(tectorialMembrane);

      // Pillar Cells & Tunnel of Corti (Terowongan Corti berbentuk segitiga kokoh)
      const pillarInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 })
      );
      pillarInner.position.set(0.8, -0.6, 0);
      pillarInner.rotation.z = -Math.PI / 8;
      const pillarOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 })
      );
      pillarOuter.position.set(2.0, -0.6, 0);
      pillarOuter.rotation.z = Math.PI / 8;
      organCortiGroup.add(pillarInner, pillarOuter);

      // Inner Hair Cell (IHC) - Pear-shaped Primary Auditory Sensor
      const ihcBody = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 0.9, 3.2, 24),
        new THREE.MeshPhysicalMaterial({ color: 0x334155, roughness: 0.35 })
      );
      ihcBody.position.set(-0.8, -0.6, 0);
      organCortiGroup.add(ihcBody);

      // Stereocilia Staircase Bundle on Inner Hair Cell
      const cochlearCiliaBundle = new THREE.Group();
      cochlearCiliaBundle.position.set(-0.8, 1.0, 0);
      animatedStereociliaRef.current = cochlearCiliaBundle;

      const cilCyl = new THREE.CylinderGeometry(0.07, 0.07, 1, 16);
      cilCyl.translate(0, 0.5, 0);

      // Row 1 (Short H 1.2)
      for (let x = -0.5; x <= 0.5; x += 0.25) {
        const c = new THREE.Mesh(cilCyl, new THREE.MeshPhysicalMaterial({ color: 0xa855f7, roughness: 0.2 }));
        c.scale.set(1, 1.2, 1);
        c.position.set(x, 0, -0.3);
        cochlearCiliaBundle.add(c);
      }
      // Row 2 (Medium H 1.8)
      for (let x = -0.4; x <= 0.4; x += 0.2) {
        const c = new THREE.Mesh(cilCyl, new THREE.MeshPhysicalMaterial({ color: 0x8b5cf6, roughness: 0.2 }));
        c.scale.set(1, 1.8, 1);
        c.position.set(x, 0, 0);
        cochlearCiliaBundle.add(c);
      }
      // Row 3 (Tall H 2.6 - Tips in proximity to Tectorial Membrane)
      for (let x = -0.35; x <= 0.35; x += 0.18) {
        const c = new THREE.Mesh(cilCyl, new THREE.MeshPhysicalMaterial({ color: 0x6366f1, roughness: 0.2 }));
        c.scale.set(1, 2.6, 1);
        c.position.set(x, 0, 0.3);
        cochlearCiliaBundle.add(c);
      }

      // Tip links connecting short to tallest stereocilia
      const tipGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 1.2, -0.3),
        new THREE.Vector3(0, 1.8, 0),
        new THREE.Vector3(0, 2.6, 0.3),
      ]);
      const tipLine = new THREE.Line(tipGeo, new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 2 }));
      cochlearCiliaBundle.add(tipLine);

      organCortiGroup.add(cochlearCiliaBundle);

      // Acoustic Pressure Wave Visualizer (Sound traveling wave ripples)
      const waveRingsGroup = new THREE.Group();
      waveRingsGroup.name = 'soundWaveRings';
      for (let r = 0; r < 4; r++) {
        const waveRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.2 + r * 0.9, 0.05, 12, 32),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 - r * 0.12 })
        );
        waveRing.rotation.y = Math.PI / 2;
        waveRing.position.set(-5.5 + r * 1.2, 0.5, 0);
        waveRingsGroup.add(waveRing);
      }
      organCortiGroup.add(waveRingsGroup);

      // Basolateral Ribbon Synapse with Glutamate Vesicles
      const ribbon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 })
      );
      ribbon.position.set(-0.8, -1.8, 0.8);
      organCortiGroup.add(ribbon);

      const vesMat = new THREE.MeshPhysicalMaterial({ color: 0xf43f5e, roughness: 0.2, clearcoat: 0.5 });
      for (let v = 0; v < 14; v++) {
        const ves = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), vesMat);
        const ang = (v / 14) * Math.PI * 2;
        ves.position.set(-0.8 + Math.cos(ang) * 0.32, -1.8 + (v % 3) * 0.18 - 0.18, 0.8 + Math.sin(ang) * 0.32);
        organCortiGroup.add(ves);
      }

      // Spiral Ganglion Afferent Auditory Nerve Fibers (N. Koklearis / N. VIII)
      const auditoryNerve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 3.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
      );
      auditoryNerve.position.set(-2.5, -3.2, 0);
      auditoryNerve.rotation.z = Math.PI / 4;
      organCortiGroup.add(auditoryNerve);

      group.add(organCortiGroup);

      activeAnnotationsRef.current = [
        { text: 'Membran Tektoria (Atap Geser Gelatinosa)', pos: new THREE.Vector3(0.6, 4.0, 0), color: '#a855f7' },
        { text: 'Gaya Geser & Defleksi Tangga Stereosilia', pos: new THREE.Vector3(-0.8, 2.2, 0.6), color: '#f43f5e' },
        { text: 'Endolimfe Skala Media (+80 mV) → Influks K+', pos: new THREE.Vector3(3.2, 1.5, 0), color: '#38bdf8' },
        { text: 'Pilar Corti & Terowongan Corti', pos: new THREE.Vector3(1.4, -0.6, 1.2), color: '#94a3b8' },
        { text: 'Membran Basilaris (Osilasi Resonansi Traveling Wave)', pos: new THREE.Vector3(0, -2.8, 0), color: '#64748b' },
        { text: 'Pita Sinaps & Saraf Koklearis (N. VIII)', pos: new THREE.Vector3(-2.0, -2.5, 1.2), color: '#fb7185' },
      ];
    }

    // ------------------------------------------------------------------------
    // ION PARTICLES STREAM FOR TRANSDUCTION FLUX
    // ------------------------------------------------------------------------
    const pCount = 140;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pCols = new Float32Array(pCount * 3);

    for (let p = 0; p < pCount; p++) {
      pPos[p * 3 + 0] = (Math.random() - 0.5) * 4;
      pPos[p * 3 + 1] = 1.0 + Math.random() * 2.8;
      pPos[p * 3 + 2] = (Math.random() - 0.5) * 3;

      pCols[p * 3 + 0] = 0.98;
      pCols[p * 3 + 1] = 0.75;
      pCols[p * 3 + 2] = 0.18;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCols, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
    });
    const pPoints = new THREE.Points(pGeo, pMat);
    animatedParticlesRef.current = pPoints;
    group.add(pPoints);

    scene.add(group);
  };

  // Three.js Mount & Animation Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0e1a);
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 5.5, 17);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Studio Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.25);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
    keyLight.position.set(8, 14, 11);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    rimLight.position.set(-9, -3, -7);
    scene.add(rimLight);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(36, 36);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070a13,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5.0;
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);

    // Build model
    buildPathwaySpecificModel(pathway.id, scene, isSoftwareGl);

    // Interactive Drag to Rotate & Wheel to Zoom
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let sceneRotY = 0;
    let sceneRotX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      sceneRotY += deltaX * 0.006;
      sceneRotX = Math.max(-0.45, Math.min(0.55, sceneRotX + deltaY * 0.006));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Window Resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let frameId = 0;
    let lastTime = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      animTimeRef.current += delta;

      // Camera Damping
      if (cameraRef.current) {
        cameraRef.current.position.x = THREE.MathUtils.damp(cameraRef.current.position.x, targetCamPosRef.current.x, 3.5, delta);
        cameraRef.current.position.y = THREE.MathUtils.damp(cameraRef.current.position.y, targetCamPosRef.current.y, 3.5, delta);
        cameraRef.current.position.z = THREE.MathUtils.damp(cameraRef.current.position.z, targetCamPosRef.current.z, 3.5, delta);

        currentLookAtRef.current.x = THREE.MathUtils.damp(currentLookAtRef.current.x, targetLookAtRef.current.x, 3.5, delta);
        currentLookAtRef.current.y = THREE.MathUtils.damp(currentLookAtRef.current.y, targetLookAtRef.current.y, 3.5, delta);
        currentLookAtRef.current.z = THREE.MathUtils.damp(currentLookAtRef.current.z, targetLookAtRef.current.z, 3.5, delta);
        cameraRef.current.lookAt(currentLookAtRef.current);
      }

      // Smooth manual scene rotation
      scene.rotation.y = THREE.MathUtils.damp(scene.rotation.y, sceneRotY, 6, delta);
      scene.rotation.x = THREE.MathUtils.damp(scene.rotation.x, sceneRotX, 6, delta);

      // Traveling wave oscillation on Cochlear basilar membrane
      if (animatedBasilarMembraneRef.current) {
        animatedBasilarMembraneRef.current.position.y = -2.2 + Math.sin(animTimeRef.current * 4) * 0.12;
      }

      // Particle physics
      if (animatedParticlesRef.current) {
        const posAttr = animatedParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] -= (0.9 + (i % 4) * 0.25) * delta;
          if (positions[i * 3 + 1] < -2.5) {
            positions[i * 3 + 1] = 2.8;
            positions[i * 3 + 0] = (Math.random() - 0.5) * 3;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
          }
        }
        posAttr.needsUpdate = true;
      }

      // Project 2D Labels from 3D coordinates
      if (cameraRef.current && showLabels && activeAnnotationsRef.current.length > 0) {
        const projLabels: { text: string; x: number; y: number; subtext?: string; color?: string }[] = [];
        const tempV = new THREE.Vector3();

        activeAnnotationsRef.current.forEach((ann) => {
          tempV.copy(ann.pos);
          tempV.applyMatrix4(scene.matrixWorld);
          tempV.project(cameraRef.current!);

          if (tempV.z < 1) {
            const screenX = (tempV.x * 0.5 + 0.5) * width;
            const screenY = (-(tempV.y * 0.5) + 0.5) * height;
            projLabels.push({
              text: ann.text,
              x: screenX,
              y: screenY,
              subtext: ann.subtext,
              color: ann.color || '#38bdf8',
            });
          }
        });
        setLabels2D(projLabels);
      } else {
        setLabels2D([]);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Re-build 3D model whenever sensory pathway changes
  useEffect(() => {
    if (sceneRef.current && rendererRef.current) {
      currentPathwayIdRef.current = pathway.id;
      const isSoftwareGl = rendererRef.current.getPixelRatio() === 1;
      buildPathwaySpecificModel(pathway.id, sceneRef.current, isSoftwareGl);
      applyCameraPreset('overview');
    }
  }, [pathway.id]);

  // Update dynamic animation when current step changes
  useEffect(() => {
    if (!currentStep) return;

    // Stereocilia bending trigger
    if (animatedStereociliaRef.current) {
      if (
        currentStep.shortLabel.includes('DEFLEKSI') || 
        currentStep.shortLabel.includes('KINOCILIUM') || 
        currentStep.shortLabel.includes('TEGANG')
      ) {
        animatedStereociliaRef.current.rotation.z = 0.32; // Excitation tilt towards kinocilium
      } else {
        animatedStereociliaRef.current.rotation.z = 0.04;
      }
    }

    // Channel pore dilation trigger
    if (animatedChannelPoreRef.current) {
      if (currentStep.visual3DHint.action === 'open') {
        animatedChannelPoreRef.current.scale.set(1.6, 1.6, 1.6);
      } else if (currentStep.visual3DHint.action === 'close') {
        animatedChannelPoreRef.current.scale.set(0.3, 0.3, 0.3);
      } else {
        animatedChannelPoreRef.current.scale.set(1.0, 1.0, 1.0);
      }
    }

    // Light ray visibility
    if (animatedLightConeRef.current) {
      const isLightActive = pathway.id === 'optik' && currentStepIndex <= 2;
      (animatedLightConeRef.current.material as THREE.MeshBasicMaterial).opacity = isLightActive ? 0.45 : 0;
    }

    // Ion particle colors
    if (animatedParticlesRef.current) {
      const colAttr = animatedParticlesRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const colors = colAttr.array as Float32Array;

      let r = 0.98, g = 0.75, b = 0.18; // Default Na+ Gold
      if (currentStep.shortLabel.includes('K+')) {
        r = 0.78; g = 0.25; b = 0.95; // Magenta K+
      } else if (currentStep.shortLabel.includes('Ca2+')) {
        r = 0.95; g = 0.3; b = 0.2; // Amber/Red Ca2+
      } else if (currentStep.shortLabel.includes('Cl-')) {
        r = 0.1; g = 0.85; b = 0.35; // Emerald Cl-
      } else if (currentStep.shortLabel.includes('ATP')) {
        r = 0.85; g = 0.2; b = 0.9; // Fuchsia ATP
      }

      for (let i = 0; i < 140; i++) {
        colors[i * 3 + 0] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      colAttr.needsUpdate = true;
    }

    // Camera preset auto-focus
    const hint = currentStep.visual3DHint;
    if (hint.targetObject === 'receptor' || (pathway.id === 'optik' && currentStepIndex <= 3)) {
      applyCameraPreset('receptor');
    } else if (hint.targetObject === 'channel' || hint.targetObject === 'ion_flow') {
      applyCameraPreset('channel');
    } else if (hint.targetObject === 'vesicle') {
      applyCameraPreset('synapse');
    }
  }, [currentStep, currentStepIndex, pathway.id]);

  return (
    <div className="relative w-full h-[640px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none">
      {/* 3D WebGL Canvas Isolated Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 2D Screen Labels projected from 3D coordinates */}
      {showLabels && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {labels2D.map((lbl, idx) => (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-full transition-transform duration-75 ease-out flex flex-col items-center pointer-events-none"
              style={{ left: `${lbl.x}px`, top: `${lbl.y}px` }}
            >
              <div 
                className="px-2.5 py-1 rounded-md bg-slate-900/95 border border-slate-700/80 shadow-md text-[11px] font-semibold text-white whitespace-nowrap flex items-center gap-1.5"
                style={{ borderColor: `${lbl.color}88` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lbl.color }} />
                <span>{lbl.text}</span>
              </div>
              <div className="w-0.5 h-3" style={{ backgroundColor: `${lbl.color}88` }} />
            </div>
          ))}
        </div>
      )}

      {/* Top Header HUD: Minimal Title & Active Step Focus */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none z-10">
        <div className="flex flex-col gap-1 max-w-xl pointer-events-auto bg-slate-900/95 border border-slate-800 rounded-xl p-3.5 text-slate-200 shadow-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-sky-400 uppercase tracking-wider">{pathway.title}</span>
            <span aria-hidden="true">·</span>
            <span>{pathway.primaryOrgan}</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-mono">Tahap {currentStepIndex + 1}/{pathway.steps.length}</span>
          </div>
          <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>{currentStep.shortLabel}</span>
            {currentStep.membranePotentialChange && (
              <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                ΔV: {currentStep.membranePotentialChange}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
            {currentStep.description}
          </p>
        </div>

        {/* Quick Toolbar: Label Toggle & Audio & Zoom */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? 'Sembunyikan Label Anatomi 3D' : 'Tampilkan Label Anatomi 3D'}
            className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
              showLabels
                ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom(0.15)}
            title="Perbesar Kamera (+)"
            className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoom(-0.15)}
            title="Perkecil Kamera (-)"
            className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleAudio}
            title={isMuted ? 'Nyalakan Audio Sintesis' : 'Bisukan Audio'}
            className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>
        </div>
      </div>

      {/* Unified Bottom Control Dock (Collapsible, Zero Viewport Occlusion) */}
      <div 
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl transition-all duration-300 ease-in-out z-20 flex flex-col items-center pointer-events-auto ${
          hudCollapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setHudCollapsed(!hudCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/95 border-t border-x border-slate-700 rounded-t-lg text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer shadow-md"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Buka Kontrol Simulasi 3D</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sembunyikan Dock (Tampilan Bersih)</span>
            </>
          )}
        </button>

        {/* Dock Interior Card */}
        <div className="w-full bg-slate-900/95 border border-slate-800 rounded-b-xl rounded-t-sm p-3.5 shadow-2xl flex flex-col gap-3">
          {/* Top Scrubber: Step-by-Step Interactive Timeline Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {pathway.steps.map((s, idx) => {
              const isActive = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    onStepChange(idx);
                    soundEffects.playStepSound(s.category);
                  }}
                  title={`Tahap ${idx + 1}: ${s.shortLabel}`}
                  className={`flex-1 min-w-[70px] py-1.5 px-2 rounded text-left transition-all text-xs font-medium truncate shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md ring-1 ring-sky-400'
                      : isPast
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                      : 'bg-slate-850 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono text-[10px] block opacity-75">{idx + 1}.</span>
                  <span className="truncate block font-semibold">{s.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Controls Row: Playback + Camera Presets + Speed */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800 pt-2.5">
            {/* Playback Button Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className="p-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Tahap Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={onToggleAutoPlay}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  autoPlay
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'bg-sky-600 text-white hover:bg-sky-500'
                }`}
              >
                {autoPlay ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Jeda</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Putar Otomatis</span>
                  </>
                )}
              </button>

              <button
                onClick={handleNextStep}
                disabled={currentStepIndex === pathway.steps.length - 1}
                className="p-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Tahap Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  onStepChange(0);
                  applyCameraPreset('overview');
                  soundEffects.playStepSound('stimulus');
                }}
                className="p-1.5 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Ulangi dari Awal"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Angles Presets */}
            <div className="flex items-center gap-1 bg-slate-850 p-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] px-1.5 flex items-center gap-1 font-medium">
                <Camera className="w-3 h-3" /> Sudut Pandang:
              </span>
              <button
                onClick={() => applyCameraPreset('overview')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  cameraPreset === 'overview' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Penuh
              </button>
              <button
                onClick={() => applyCameraPreset('receptor')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  cameraPreset === 'receptor' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reseptor
              </button>
              <button
                onClick={() => applyCameraPreset('channel')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  cameraPreset === 'channel' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kanal Ion
              </button>
              <button
                onClick={() => applyCameraPreset('synapse')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  cameraPreset === 'synapse' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sinaps
              </button>
            </div>

            {/* Playback Speed Multiplier */}
            <div className="flex items-center gap-1 bg-slate-850 p-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] px-1 font-medium">Kecepatan:</span>
              {[0.5, 1, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeedMultiplier(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    speedMultiplier === spd ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
