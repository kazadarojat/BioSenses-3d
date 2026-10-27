import React, { useState } from 'react';
import { SENSORY_PATHWAYS, SensoryPathway } from '../data/pathwayData';
import { 
  BookOpen, 
  HelpCircle, 
  Activity, 
  Stethoscope, 
  ChevronRight, 
  CheckCircle2, 
  Layers,
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';

export const BiochemistryDeepDive: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mysteries' | 'comparison' | 'clinical'>('mysteries');
  const [selectedSenseId, setSelectedSenseId] = useState<string>('optik');

  const selectedPathway = SENSORY_PATHWAYS.find((p) => p.id === selectedSenseId) || SENSORY_PATHWAYS[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Selector Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <span>Kajian Ilmiah & Komparasi Biokimia Sistem Indra</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Eksplorasi fenomena transduksi unik, paradoks gradien ionik, dan relevansi farmakologi klinis
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab('mysteries')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'mysteries' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Misteri Biokimia Unik
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'comparison' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tabel Komparasi 6 Indra
          </button>
          <button
            onClick={() => setActiveTab('clinical')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'clinical' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Korelasi Klinis & Obat
          </button>
        </div>
      </div>

      {/* Tab 1: Misteri Biokimia Unik */}
      {activeTab === 'mysteries' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sense Selection List */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Pilih Jalur Indra:
            </span>
            {SENSORY_PATHWAYS.map((p) => {
              const isSelected = p.id === selectedSenseId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedSenseId(p.id)}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-950/80 border-sky-500/70 text-white shadow-sm ring-1 ring-sky-500/30'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-sky-400">{p.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">0{p.number}</span>
                  </div>
                  <div className="text-xs font-medium text-slate-200">{p.indonesianSense}</div>
                </button>
              );
            })}
          </div>

          {/* Deep Explanation Panel */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800 font-semibold inline-block mb-2">
                Paradoks & Keunikan Molekuler {selectedPathway.title}
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {selectedPathway.uniqueBiochemicalMystery.question}
              </h3>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 leading-relaxed text-slate-200 text-sm">
              {selectedPathway.uniqueBiochemicalMystery.explanation}
            </div>

            {/* Step Highlights */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Ringkasan Jalur Transduksi:
              </span>
              <div className="p-3 bg-slate-850 rounded-lg border border-slate-800 font-mono text-xs text-sky-300 leading-relaxed overflow-x-auto">
                {selectedPathway.tagline}
              </div>
            </div>

            {/* Special highlight for Cochlear 6 Mechanical Pillars */}
            {selectedPathway.id === 'koklear' && selectedPathway.detailedDescriptions && (
              <div className="mt-2 flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 block">
                  6 Deskripsi Rinci Mekanika Koklea:
                </span>
                <div className="space-y-2">
                  {selectedPathway.detailedDescriptions.map((desc, i) => (
                    <div key={i} className="text-xs p-2.5 rounded bg-slate-850 border border-slate-800 text-slate-300">
                      <strong className="text-sky-300">{desc.split(':')[0]}:</strong>
                      <span>{desc.split(':')[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Tabel Komparasi 6 Jalur Biokimia Indra */}
      {activeTab === 'comparison' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 font-semibold">Sistem Indra</th>
                <th className="py-3 px-3 font-semibold">Organ & Sel Reseptor</th>
                <th className="py-3 px-3 font-semibold">Reseptor Utama</th>
                <th className="py-3 px-3 font-semibold">Second Messenger / Enzim</th>
                <th className="py-3 px-3 font-semibold">Kanal Ion Kunci</th>
                <th className="py-3 px-3 font-semibold">Arus Ionik Utama</th>
                <th className="py-3 px-3 font-semibold">Potensial Membran</th>
                <th className="py-3 px-3 font-semibold">Neurotransmitter Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-850/60 transition-colors">
                <td className="py-3 px-3 font-bold text-amber-400 whitespace-nowrap">1. Optik</td>
                <td className="py-3 px-3">Retina (Sel Batang / Kerucut)</td>
                <td className="py-3 px-3">Rhodopsin (11-cis-retinal)</td>
                <td className="py-3 px-3">Transducin (Gt) → PDE6 (cGMP ↓)</td>
                <td className="py-3 px-3">Kanal Kation CNG (Tertutup)</td>
                <td className="py-3 px-3">Blokade influks Na+ & Ca2+</td>
                <td className="py-3 px-3 font-mono text-purple-300">Hiperpolarisasi (-40 → -70 mV)</td>
                <td className="py-3 px-3 text-rose-300">Glutamat ↓ (Menurun)</td>
              </tr>
              <tr className="hover:bg-slate-850/60 transition-colors">
                <td className="py-3 px-3 font-bold text-rose-400 whitespace-nowrap">2. Integumen</td>
                <td className="py-3 px-3">Kulit (Ujung Saraf C & Aδ)</td>
                <td className="py-3 px-3">Kanal Termal TRPV1-4</td>
                <td className="py-3 px-3">Aktivasi Langsung Termal / Entalpi</td>
                <td className="py-3 px-3">TRPV1 Pori Kation Terbuka</td>
                <td className="py-3 px-3">Influks Na+ & Ca2+</td>
                <td className="py-3 px-3 font-mono text-teal-300">Depolarisasi Generator</td>
                <td className="py-3 px-3">Substansi P & Glutamat</td>
              </tr>
              <tr className="hover:bg-slate-850/60 transition-colors">
                <td className="py-3 px-3 font-bold text-emerald-400 whitespace-nowrap">3. Olfaktori</td>
                <td className="py-3 px-3">Silia Reseptor Olfaktori</td>
                <td className="py-3 px-3">Olfactory GPCR (Ribuan tipe)</td>
                <td className="py-3 px-3">Golf → Adenylyl Cyclase III (cAMP ↑)</td>
                <td className="py-3 px-3">CNG Kation + ANO2 (Kanal Cl-)</td>
                <td className="py-3 px-3">Influks Ca2+/Na+ + Efluks Cl- Keluar</td>
                <td className="py-3 px-3 font-mono text-teal-300">Depolarisasi Kuat</td>
                <td className="py-3 px-3">Glutamat (ke Bulbus Olfaktorius)</td>
              </tr>
              <tr className="hover:bg-slate-850/60 transition-colors">
                <td className="py-3 px-3 font-bold text-pink-400 whitespace-nowrap">4. Gustatori (Manis)</td>
                <td className="py-3 px-3">Kuncup Pengecap (Sel Tipe II)</td>
                <td className="py-3 px-3">Heterodimer T1R2 + T1R3</td>
                <td className="py-3 px-3">Gustducin → PLCβ2 → IP3 → Ca2+ RE</td>
                <td className="py-3 px-3">TRPM5 + Hemichannel CALHM1/3</td>
                <td className="py-3 px-3">Influks Na+ (TRPM5)</td>
                <td className="py-3 px-3 font-mono text-teal-300">Depolarisasi Sel</td>
                <td className="py-3 px-3 font-bold text-amber-300">ATP Non-vesikular (ke P2X2/3)</td>
              </tr>
              <tr className="hover:bg-slate-850/60 transition-colors">
                <td className="py-3 px-3 font-bold text-sky-400 whitespace-nowrap">5. Vestibular</td>
                <td className="py-3 px-3">Makula Sakulus (Sel Rambut)</td>
                <td className="py-3 px-3">Kompleks MET (TMC1/2 + Tip Links)</td>
                <td className="py-3 px-3">Mekanik Langsung (Inersia Otolit)</td>
                <td className="py-3 px-3">MET Channel + Cav1.3 (VGCC)</td>
                <td className="py-3 px-3 font-bold text-sky-300">Influks K+ Endolimfe (+80 mV)</td>
                <td className="py-3 px-3 font-mono text-teal-300">Depolarisasi Bertahap</td>
                <td className="py-3 px-3 text-rose-300">Glutamat (Ribbon Synapse)</td>
              </tr>
              <tr className="hover:bg-slate-850/60 transition-colors">
                <td className="py-3 px-3 font-bold text-indigo-400 whitespace-nowrap">6. Koklear</td>
                <td className="py-3 px-3">Organ Corti (Inner Hair Cell)</td>
                <td className="py-3 px-3">Tangga Stereosilia + Tip Links (TMC1)</td>
                <td className="py-3 px-3">Mekanik Geser (Shear Membran)</td>
                <td className="py-3 px-3">Kanal MET + Cav1.3 (VGCC)</td>
                <td className="py-3 px-3 font-bold text-sky-300">Influks K+ Endolimfe (+80 mV)</td>
                <td className="py-3 px-3 font-mono text-teal-300">Depolarisasi Cepat Phase-Lock</td>
                <td className="py-3 px-3 text-rose-300">Glutamat (ke N. Koklearis)</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Relevansi Klinis & Farmakologi */}
      {activeTab === 'clinical' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SENSORY_PATHWAYS.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-white text-sm">{p.title}</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{p.primaryOrgan}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {p.keyClinicalRelevance}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
