import React from 'react';

interface NavbarProps {
  activeView: 'pathways' | 'deepdive' | 'quiz';
  onNavigate: (view: 'pathways' | 'deepdive' | 'quiz') => void;
  onOpenQuizModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/90 sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('pathways');
        }}
        className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-sky-400 transition-colors"
      >
        BioSense 3D
      </a>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onNavigate('pathways')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'pathways' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Visualisasi 3D Jalur Indra
        </button>
        <button
          onClick={() => onNavigate('deepdive')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'deepdive' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Kajian & Komparasi Biokimia
        </button>
        <button
          onClick={() => onNavigate('quiz')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeView === 'quiz' ? 'text-sky-400 font-semibold' : ''
          }`}
        >
          Kuis Evaluasi Otomatis
        </button>
      </nav>

      {/* Zone 3: 1 primary action button */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onNavigate('quiz')}
          className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
        >
          Mulai Uji Kompetensi
        </button>
      </div>
    </header>
  );
};
