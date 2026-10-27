import React, { useState } from 'react';
import { SENSORY_PATHWAYS, SensoryPathway } from './data/pathwayData';
import { Navbar } from './components/Navbar';
import { ThreePathwayViewer } from './components/ThreePathwayViewer';
import { PathwayExplorer } from './components/PathwayExplorer';
import { BiochemistryDeepDive } from './components/BiochemistryDeepDive';
import { QuizPlatform } from './components/QuizPlatform';
import { soundEffects } from './audio/soundEffects';
import { 
  Eye, 
  Thermometer, 
  Wind, 
  Smile, 
  Compass, 
  Volume2, 
  Sparkles, 
  GraduationCap, 
  ArrowRight,
  HelpCircle,
  BookOpen
} from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'pathways' | 'deepdive' | 'quiz'>('pathways');
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>('optik');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);

  const currentPathway = SENSORY_PATHWAYS.find((p) => p.id === selectedPathwayId) || SENSORY_PATHWAYS[0];

  const handleSelectPathway = (pathwayId: string) => {
    setSelectedPathwayId(pathwayId);
    setCurrentStepIndex(0);
    setAutoPlay(false);
    soundEffects.playStepSound('stimulus');
  };

  const getPathwayIcon = (id: string) => {
    switch (id) {
      case 'optik': return <Eye className="w-4 h-4 text-amber-400" />;
      case 'integumen': return <Thermometer className="w-4 h-4 text-rose-400" />;
      case 'olfaktori': return <Wind className="w-4 h-4 text-emerald-400" />;
      case 'gustatori': return <Smile className="w-4 h-4 text-pink-400" />;
      case 'vestibular': return <Compass className="w-4 h-4 text-sky-400" />;
      case 'koklear': return <Volume2 className="w-4 h-4 text-indigo-400" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Bar Navigation */}
      <Navbar activeView={activeView} onNavigate={setActiveView} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Sensory Pathway Selector Bar (Always visible in Pathways view) */}
        {activeView === 'pathways' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                6 Jalur Mekanisme Biokimia Sistem Indra
              </span>
              <span className="text-xs text-sky-400 font-mono">
                Pilih jalur untuk visualisasi 3D
              </span>
            </div>

            {/* 6 Pathway Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {SENSORY_PATHWAYS.map((p) => {
                const isSelected = p.id === selectedPathwayId;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPathway(p.id)}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-sky-500 shadow-md ring-1 ring-sky-500/30'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-850 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1 rounded-md bg-slate-800 border border-slate-700">
                        {getPathwayIcon(p.id)}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 font-bold">
                        0{p.number}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-white truncate block">
                      {p.title}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                      {p.indonesianSense.split(' ')[0]} {p.indonesianSense.split(' ')[1] || ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 1: PATHWAYS 3D & DETAILED EXPLORER */}
        {activeView === 'pathways' && (
          <div className="flex flex-col gap-8">
            {/* 3D WebGL Canvas Section */}
            <section aria-label="Visualisasi 3D Jalur Biokimia">
              <ThreePathwayViewer
                pathway={currentPathway}
                currentStepIndex={currentStepIndex}
                onStepChange={setCurrentStepIndex}
                autoPlay={autoPlay}
                onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
              />
            </section>

            {/* Pathway Flow Diagram & Details Section */}
            <section aria-label="Penjelasan Tahap Transduksi">
              <PathwayExplorer
                pathway={currentPathway}
                currentStepIndex={currentStepIndex}
                onSelectStep={setCurrentStepIndex}
              />
            </section>
          </div>
        )}

        {/* VIEW 2: BIOCHEMISTRY DEEP DIVE & COMPARISON */}
        {activeView === 'deepdive' && (
          <section aria-label="Kajian Ilmiah Biokimia">
            <BiochemistryDeepDive />
          </section>
        )}

        {/* VIEW 3: AUTOMATIC EVALUATION QUIZ */}
        {activeView === 'quiz' && (
          <section aria-label="Kuis Evaluasi Otomatis">
            <QuizPlatform />
          </section>
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            BioSense 3D · Platform Edukasi Mekanisme Transduksi Biokimia Sistem Indra Manusia
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Retina</span>
            <span aria-hidden="true">·</span>
            <span>Kulit TRPV</span>
            <span aria-hidden="true">·</span>
            <span>Silia Olfaktori</span>
            <span aria-hidden="true">·</span>
            <span>Taste Bud T1R2/T1R3</span>
            <span aria-hidden="true">·</span>
            <span>Sakulus</span>
            <span aria-hidden="true">·</span>
            <span>Organ Corti</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
