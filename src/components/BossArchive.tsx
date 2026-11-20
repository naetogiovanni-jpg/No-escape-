import { BOSS_LIST } from '@/src/data/bosses';
import { GameMode, SaveData } from '@/src/types/game';
import { CheckCircle2, Lock, Play } from 'lucide-react';

interface BossArchiveProps {
  save: SaveData;
  onLaunchLevel: (levelId: number, mode: GameMode) => void;
  onBack: () => void;
}

export function BossArchive({ save, onLaunchLevel, onBack }: BossArchiveProps) {
  const defeatedCount = Object.values(save.bossRecords).filter((b) => b.defeated).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs text-slate-400">
            Classified Dossiers · {defeatedCount} of {BOSS_LIST.length} Targets Neutralized
          </div>
          <h1 className="font-display text-4xl font-bold text-white">Boss Archive</h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium border border-slate-700 transition-colors cursor-pointer"
        >
          Back to Menu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {BOSS_LIST.map((boss) => {
          const rec = save.bossRecords[boss.id];
          const secretUnlocked = !boss.isSecret || save.unlockedSecretBosses.includes(boss.id);
          const campaignUnlocked = boss.isSecret
            ? secretUnlocked
            : save.unlockedLevel >= boss.levelNumber || save.newGamePlusUnlocked;

          return (
            <div
              key={boss.id}
              className="p-6 rounded-xl bg-[#0d1524] border border-slate-800 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium" style={{ color: boss.accentColor }}>
                      {boss.isSecret ? 'Secret Encounter' : `Chapter ${boss.chapter} Boss · Level ${boss.levelNumber}`}
                      {boss.recurringAppearances && boss.recurringAppearances.length > 0
                        ? ` · Returns Level ${boss.recurringAppearances.join(', ')}`
                        : ''}
                    </div>
                    <h2 className="font-display text-3xl font-bold text-white">{boss.name}</h2>
                    <div className="text-xs text-slate-400">{boss.title}</div>
                  </div>

                  <div className="text-right text-xs font-mono-tabular">
                    {rec?.defeated ? (
                      <span className="text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Defeated {rec.bestTimeSec ? `(${rec.bestTimeSec}s)` : ''}
                      </span>
                    ) : rec?.encountered ? (
                      <span className="text-amber-300">Encountered ({rec.encountersCount}x)</span>
                    ) : (
                      <span className="text-slate-500">Unencountered</span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">{boss.lore}</p>
                <div className="text-xs text-slate-400">
                  <span className="text-slate-200 font-medium">Personality:</span> {boss.personality}
                </div>

                {boss.isSecret && !secretUnlocked && boss.unlockHint && (
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-amber-200">
                    Unlock Condition: {boss.unlockHint}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  {boss.phases.map((p) => (
                    <div key={p.phase} className="p-3 rounded-lg bg-[#090f1b] border border-slate-800/80 space-y-1">
                      <div className="text-[11px] font-mono-tabular text-slate-400">Phase {p.phase}</div>
                      <div className="text-xs font-semibold text-slate-100">{p.title}</div>
                      <div className="text-[11px] text-slate-400 leading-snug">{p.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="text-xs text-slate-400">{boss.firstAppearanceText}</span>
                <button
                  type="button"
                  disabled={!campaignUnlocked}
                  onClick={() => onLaunchLevel(boss.levelNumber, GameMode.BOSS_RUSH)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    campaignUnlocked
                      ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer'
                      : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  {campaignUnlocked ? <Play className="w-3.5 h-3.5 fill-current" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{campaignUnlocked ? 'Engage Boss' : 'Locked'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
