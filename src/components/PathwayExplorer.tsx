import React, { useState } from 'react';
import { SensoryPathway, PathwayStep } from '../data/pathwayData';
import { soundEffects } from '../audio/soundEffects';
import { 
  ArrowRight, 
  Activity, 
  Info, 
  FileText, 
  ListOrdered, 
  Zap, 
  Layers, 
  HelpCircle,
  Eye,
  Thermometer,
  Wind,
  Smile,
  Compass,
  Volume2
} from 'lucide-react';

interface PathwayExplorerProps {
  pathway: SensoryPathway;
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
}

export const PathwayExplorer: React.FC<PathwayExplorerProps> = ({
  pathway,
  currentStepIndex,
  onSelectStep,
}) => {
  const [koklearViewMode, setKoklearViewMode] = useState<'pendek' | 'lengkap'>('pendek');
  const activeStep: PathwayStep = pathway.steps[currentStepIndex] || pathway.steps[0];

  const getCategoryColor = (cat: PathwayStep['category']) => {
    switch (cat) {
      case 'stimulus':
        return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
      case 'receptor':
        return 'border-rose-500/40 bg-rose-500/10 text-rose-300';
      case 'g-protein':
        return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
      case 'enzyme':
        return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300';
      case 'second-messenger':
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
      case 'channel':
        return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300';
      case 'ion':
        return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300';
      case 'potential':
        return 'border-teal-500/40 bg-teal-500/10 text-teal-300';
      case 'neurotransmitter':
      case 'vesicle':
        return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
      default:
        return 'border-slate-500/40 bg-slate-500/10 text-slate-300';
    }
  };

  const getSenseIcon = (id: string) => {
    switch (id) {
      case 'optik': return <Eye className="w-5 h-5 text-amber-400" />;
      case 'integumen': return <Thermometer className="w-5 h-5 text-rose-400" />;
      case 'olfaktori': return <Wind className="w-5 h-5 text-emerald-400" />;
      case 'gustatori': return <Smile className="w-5 h-5 text-pink-400" />;
      case 'vestibular': return <Compass className="w-5 h-5 text-sky-400" />;
      case 'koklear': return <Volume2 className="w-5 h-5 text-indigo-400" />;
      default: return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
              {getSenseIcon(pathway.id)}
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-sky-400">{pathway.title}</span>
                <span aria-hidden="true">·</span>
                <span>{pathway.sensoryType}</span>
                <span aria-hidden="true">·</span>
                <span>{pathway.steps.length} Langkah Biokimia</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{pathway.indonesianSense}</h2>
            </div>
          </div>

          {/* Koklear Version Switcher if viewing Koklear */}
          {pathway.id === 'koklear' && (
            <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700 self-start md:self-auto">
              <button
                onClick={() => setKoklearViewMode('pendek')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  koklearViewMode === 'pendek'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Label Pendek (19 Tahap)
              </button>
              <button
                onClick={() => setKoklearViewMode('lengkap')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  koklearViewMode === 'lengkap'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Deskripsi Lengkap (6 Pilar Mekanika)
              </button>
            </div>
          )}
        </div>

        {/* Tagline Flow summary */}
        <div className="mt-4 p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 font-mono text-xs text-sky-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {pathway.tagline}
        </div>

        {/* Biological context specs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="p-2.5 bg-slate-850 rounded-lg border border-slate-800">
            <span className="text-slate-500 block mb-0.5">Organ Reseptor</span>
            <span className="text-slate-200 font-medium">{pathway.primaryOrgan}</span>
          </div>
          <div className="p-2.5 bg-slate-850 rounded-lg border border-slate-800">
            <span className="text-slate-500 block mb-0.5">Sel Tranduser</span>
            <span className="text-slate-200 font-medium">{pathway.receptorCell}</span>
          </div>
          <div className="p-2.5 bg-slate-850 rounded-lg border border-slate-800">
            <span className="text-slate-500 block mb-0.5">Bentuk Stimulus Fisik</span>
            <span className="text-slate-200 font-medium">{pathway.stimulusType}</span>
          </div>
        </div>
      </div>

      {/* Koklear Special Full Mechanical Description Mode */}
      {pathway.id === 'koklear' && koklearViewMode === 'lengkap' && pathway.detailedDescriptions && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-indigo-400">
            <FileText className="w-4 h-4" />
            <span>Versi Deskripsi Lengkap: 6 Pilar Mekanika & Transduksi Koklea</span>
          </div>
          <div className="flex flex-col gap-3">
            {pathway.detailedDescriptions.map((desc, idx) => {
              const [header, ...body] = desc.split(': ');
              return (
                <div key={idx} className="p-3.5 bg-slate-850 rounded-lg border border-slate-800 flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800 shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="text-xs leading-relaxed">
                    <span className="font-bold text-slate-100 block mb-1 uppercase tracking-tight text-[11px] text-sky-300">
                      {header}
                    </span>
                    <span className="text-slate-300">{body.join(': ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Step-by-Step Flow Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ListOrdered className="w-4 h-4 text-sky-400" />
            <span>Diagram Alir Jalur Biokimia (Klik untuk Simulasi 3D)</span>
          </div>
          <span className="text-xs text-slate-400">
            Aktif: <strong className="text-white">{activeStep.shortLabel}</strong>
          </span>
        </div>

        {/* Step Buttons Chain with Clean Scrolling Track */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-700">
          {pathway.steps.map((step, idx) => {
            const isSelected = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => {
                    onSelectStep(idx);
                    soundEffects.playStepSound(step.category);
                  }}
                  className={`group relative text-left py-2.5 px-3.5 rounded-lg border transition-all cursor-pointer shrink-0 min-w-[130px] ${
                    isSelected
                      ? 'border-sky-400 bg-sky-950/80 text-white shadow-lg ring-1 ring-sky-400'
                      : isCompleted
                      ? 'border-slate-700 bg-slate-850/90 text-slate-200 hover:border-slate-600'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold text-sky-400">
                      0{idx + 1}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-sky-400' : isCompleted ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </div>
                  <span className="font-bold text-xs tracking-tight block truncate text-white">
                    {step.shortLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                    {step.cellularLocation}
                  </span>
                </button>
                {idx < pathway.steps.length - 1 && (
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isCompleted ? 'text-sky-500' : 'text-slate-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Step Deep-Dive Inspector Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold">
              Tahap {currentStepIndex + 1}
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">{activeStep.fullName}</h3>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-md border font-medium capitalize ${getCategoryColor(activeStep.category)}`}>
            {activeStep.category}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                Deskripsi Fisiologis
              </span>
              <p className="text-slate-300 leading-relaxed text-sm">
                {activeStep.description}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                Mekanisme Molekuler & Biokimia
              </span>
              <p className="text-slate-300 leading-relaxed">
                {activeStep.biochemicalDetails}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div>
              <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                Lokalisasi Seluler
              </span>
              <span className="text-white font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                {activeStep.cellularLocation}
              </span>
            </div>

            {activeStep.ionOrMolecule && (
              <div>
                <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  Ion / Molekul Terlibat
                </span>
                <span className="font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 inline-block">
                  {activeStep.ionOrMolecule}
                </span>
              </div>
            )}

            {activeStep.membranePotentialChange && (
              <div>
                <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  Perubahan Potensial Membran (ΔV)
                </span>
                <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 font-semibold inline-flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {activeStep.membranePotentialChange}
                </span>
              </div>
            )}

            <div>
              <span className="text-slate-400 block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                Aksi Visualisasi 3D
              </span>
              <span className="text-slate-300 capitalize">
                Objek: <strong className="text-white">{activeStep.visual3DHint.targetObject}</strong> · Aksi: <strong className="text-sky-400">{activeStep.visual3DHint.action}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
