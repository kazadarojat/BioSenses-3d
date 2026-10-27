import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { QUIZ_QUESTIONS, QuizQuestion } from '../data/quizData';
import { SENSORY_PATHWAYS } from '../data/pathwayData';
import { soundEffects } from '../audio/soundEffects';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  RotateCcw, 
  Award, 
  ArrowRight, 
  ListOrdered, 
  Check, 
  ChevronRight,
  TrendingUp,
  Brain,
  AlertCircle
} from 'lucide-react';

export const QuizPlatform: React.FC = () => {
  const [filterPathway, setFilterPathway] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [orderedItems, setOrderedItems] = useState<{ id: string; label: string }[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, { isCorrect: boolean; userSelection: any }>>({});
  const [showSummary, setShowSummary] = useState<boolean>(false);

  // Filtered question set
  const filteredQuestions = QUIZ_QUESTIONS.filter((q) => {
    if (filterPathway === 'all') return true;
    return q.pathwayId === filterPathway;
  });

  const currentQ: QuizQuestion | undefined = filteredQuestions[currentIndex];

  // Initialize ordering items when question changes
  React.useEffect(() => {
    if (currentQ && currentQ.type === 'ordering' && currentQ.orderingItems) {
      // Shuffle ordering items initially so user has to order them
      const shuffled = [...currentQ.orderingItems].sort(() => Math.random() - 0.5);
      setOrderedItems(shuffled);
    }
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
  }, [currentIndex, filterPathway]);

  // Handle reorder movement
  const moveOrderItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedItems.length) return;
    const updated = [...orderedItems];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setOrderedItems(updated);
  };

  // Submit Answer
  const handleSubmitAnswer = () => {
    if (!currentQ || isAnswerSubmitted) return;

    let isCorrect = false;

    if (currentQ.type === 'multiple-choice' || currentQ.type === 'clinical-case') {
      if (selectedOption === null) return;
      isCorrect = selectedOption === currentQ.correctOptionIndex;
    } else if (currentQ.type === 'ordering' && currentQ.correctOrderIds) {
      const currentOrderIds = orderedItems.map((item) => item.id);
      isCorrect = currentOrderIds.every((id, idx) => id === currentQ.correctOrderIds![idx]);
    }

    if (isCorrect) {
      soundEffects.playQuizCorrect();
    } else {
      soundEffects.playQuizIncorrect();
    }

    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        isCorrect,
        userSelection: currentQ.type === 'ordering' ? orderedItems : selectedOption,
      },
    }));

    setIsAnswerSubmitted(true);
  };

  // Move to next question or show summary
  const handleNextQuestion = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSummary(true);
      // Confetti trigger if score >= 70%
      const totalAnswered = Object.keys(userAnswers).length;
      const totalCorrect = Object.values(userAnswers).filter((a) => a.isCorrect).length;
      if (totalCorrect / Math.max(1, totalAnswered) >= 0.7) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (_) {}
      }
    }
  };

  // Restart Quiz
  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setUserAnswers({});
    setShowSummary(false);
  };

  // Score metrics
  const totalCorrect = Object.values(userAnswers).filter((a) => a.isCorrect).length;
  const scorePercentage = Math.round((totalCorrect / Math.max(1, filteredQuestions.length)) * 100);

  // Breakdown by sense
  const senseBreakdown = SENSORY_PATHWAYS.map((path) => {
    const questionsOfSense = filteredQuestions.filter((q) => q.pathwayId === path.id);
    const correctOfSense = questionsOfSense.filter((q) => userAnswers[q.id]?.isCorrect).length;
    return {
      title: path.title,
      name: path.indonesianSense,
      total: questionsOfSense.length,
      correct: correctOfSense,
    };
  }).filter((s) => s.total > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Quiz Header & Pathway Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Brain className="w-5 h-5 text-sky-400" />
              <span>Kuis Evaluasi Otomatis Mekanisme Biokimia Indra</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Uji penguasaan konsep fototransduksi, termoreseptor TRPV, silia olfaktori, rasa manis, sakulus, dan koklea
            </p>
          </div>

          <button
            onClick={handleRestartQuiz}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mulai Ulang Kuis</span>
          </button>
        </div>

        {/* Pathway Filter Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3.5 pb-1">
          <button
            onClick={() => {
              setFilterPathway('all');
              setCurrentIndex(0);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
              filterPathway === 'all'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-850 text-slate-400 hover:text-white'
            }`}
          >
            Semua Jalur ({QUIZ_QUESTIONS.length})
          </button>
          {SENSORY_PATHWAYS.map((p) => {
            const count = QUIZ_QUESTIONS.filter((q) => q.pathwayId === p.id).length;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setFilterPathway(p.id);
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  filterPathway === p.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-850 text-slate-400 hover:text-white'
                }`}
              >
                {p.title} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Quiz Card */}
      {!showSummary && currentQ ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-5">
          {/* Question Meta Bar */}
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sky-400 font-bold bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                Soal {currentIndex + 1} dari {filteredQuestions.length}
              </span>
              <span className="text-slate-400 capitalize">
                Tipe: <strong className="text-slate-200">{currentQ.type.replace('-', ' ')}</strong>
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Tingkat: {currentQ.difficulty}
            </span>
          </div>

          {/* Question Text */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-sky-400 mb-1">
              {currentQ.title}
            </h3>
            <p className="text-base font-semibold text-white leading-relaxed">
              {currentQ.question}
            </p>
          </div>

          {/* QUESTION TYPE 1: Multiple Choice & Clinical Case */}
          {(currentQ.type === 'multiple-choice' || currentQ.type === 'clinical-case') && currentQ.options && (
            <div className="flex flex-col gap-2.5">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctOptionIndex;

                let stateClasses = 'bg-slate-850 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700';

                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    stateClasses = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500';
                  } else if (isSelected && !isCorrect) {
                    stateClasses = 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-500';
                  } else {
                    stateClasses = 'bg-slate-900/60 border-slate-850 text-slate-500 opacity-60';
                  }
                } else if (isSelected) {
                  stateClasses = 'bg-sky-950/80 border-sky-400 text-white ring-1 ring-sky-400';
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerSubmitted}
                    onClick={() => setSelectedOption(idx)}
                    className={`text-left p-3.5 rounded-lg border transition-all flex items-start gap-3 cursor-pointer ${stateClasses}`}
                  >
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 shrink-0 mt-0.5">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-xs sm:text-sm leading-relaxed flex-1">{option}</span>
                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {isAnswerSubmitted && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* QUESTION TYPE 2: Pathway Step Reordering Challenge */}
          {currentQ.type === 'ordering' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-slate-400">
                Gunakan tombol panah naik/turun untuk menyusun urutan biokimia yang tepat dari awal hingga akhir:
              </span>
              <div className="flex flex-col gap-2">
                {orderedItems.map((item, idx) => {
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-850 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sky-400 bg-sky-950 px-2 py-1 rounded border border-sky-800 shrink-0">
                          Urutan {idx + 1}
                        </span>
                        <span className="text-slate-200 font-medium leading-relaxed">{item.label}</span>
                      </div>

                      {!isAnswerSubmitted && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => moveOrderItem(idx, idx - 1)}
                            disabled={idx === 0}
                            className="px-2 py-1 bg-slate-800 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Pindah ke Atas"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveOrderItem(idx, idx + 1)}
                            disabled={idx === orderedItems.length - 1}
                            className="px-2 py-1 bg-slate-800 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Pindah ke Bawah"
                          >
                            ▼
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Answer Feedback & Scientific Rationale */}
          {isAnswerSubmitted && (
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-3 text-xs leading-relaxed">
              <div className="flex items-center gap-2">
                {userAnswers[currentQ.id]?.isCorrect ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Jawaban Anda Tepat!
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Jawaban Kurang Tepat
                  </span>
                )}
                <span className="text-slate-500">·</span>
                <span className="text-slate-400 font-mono">Konsep: {currentQ.biochemicalKeyConcept}</span>
              </div>
              <p className="text-slate-300">
                <strong className="text-white block mb-0.5">Penjelasan Ilmiah:</strong>
                {currentQ.scientificExplanation}
              </p>
            </div>
          )}

          {/* Action Button: Submit or Next */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            {!isAnswerSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={currentQ.type !== 'ordering' && selectedOption === null}
                className="px-5 py-2.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs cursor-pointer shadow-md"
              >
                Periksa & Evaluasi Jawaban
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors text-xs cursor-pointer shadow-md"
              >
                <span>{currentIndex < filteredQuestions.length - 1 ? 'Soal Berikutnya' : 'Lihat Hasil Evaluasi Lengkap'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : showSummary ? (
        /* Evaluation Summary Report */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold block mb-1">
                Laporan Hasil Evaluasi Otomatis
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Ringkasan Kompetensi Biokimia Sistem Indra
              </h3>
            </div>
            <div className="p-3 bg-slate-850 rounded-lg border border-slate-800 flex items-center gap-3">
              <Award className="w-8 h-8 text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Skor Akhir</span>
                <span className="text-xl font-mono font-bold text-white tabular-nums">
                  {scorePercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Performance Breakdown by Sense */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">
              Tingkat Penguasaan per Jalur Indra:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {senseBreakdown.map((s, idx) => {
                const pct = Math.round((s.correct / s.total) * 100);
                return (
                  <div key={idx} className="p-3 bg-slate-850 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{s.title}</span>
                      <span className="font-mono text-sky-400">{s.correct}/{s.total} ({pct}%)</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              onClick={handleRestartQuiz}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-500 transition-colors text-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ulangi Kuis Sekarang</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
