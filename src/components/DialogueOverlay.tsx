import { DialogueSequence } from '@/src/types/game';
import { useState } from 'react';

interface DialogueOverlayProps {
  sequence: DialogueSequence;
  onChoiceMade: (consequenceKey: string, label: string, trustDelta: number) => void;
  onComplete: () => void;
}

export function DialogueOverlay({ sequence, onChoiceMade, onComplete }: DialogueOverlayProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const currentLine = sequence.lines[lineIndex];

  if (!currentLine) return null;

  const advance = () => {
    if (lineIndex + 1 < sequence.lines.length) {
      setLineIndex(lineIndex + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-[#0d1524] border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-200">{sequence.title}</span>
          <button
            type="button"
            onClick={onComplete}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Skip Briefing
          </button>
        </div>

        <div className="p-6 flex flex-col sm:flex-row gap-6 items-start">
          {currentLine.portraitUrl ? (
            <img
              src={currentLine.portraitUrl}
              alt={currentLine.speakerName}
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-xl object-cover border border-slate-700 shrink-0"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center font-display text-2xl font-bold shrink-0"
              style={{ color: currentLine.accentColor }}
            >
              {currentLine.speakerName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <div className="text-sm font-semibold" style={{ color: currentLine.accentColor }}>
                {currentLine.speakerName}
              </div>
              <p className="text-base text-slate-100 leading-relaxed">
                {currentLine.text}
              </p>
            </div>

            {currentLine.choices && currentLine.choices.length > 0 ? (
              <div className="flex flex-col gap-2 pt-2">
                {currentLine.choices.map((choice) => (
                  <button
                    key={choice.label}
                    type="button"
                    onClick={() => {
                      onChoiceMade(choice.consequenceKey, choice.label, choice.trustDelta ?? 0);
                      advance();
                    }}
                    className="text-left px-4 py-2.5 rounded-lg bg-slate-800/80 hover:bg-cyan-400/15 border border-slate-700 hover:border-cyan-400 text-sm text-slate-100 transition-colors cursor-pointer"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={advance}
                  className="px-5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                >
                  {lineIndex + 1 < sequence.lines.length ? 'Continue' : 'Begin Mission'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
