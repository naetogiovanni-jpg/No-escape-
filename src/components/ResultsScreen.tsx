import { LevelEndPayload } from '@/src/systems/EventBus';
import { GameMode } from '@/src/types/game';

interface ResultsScreenProps {
  result: LevelEndPayload;
  mode: GameMode;
  endingSummary?: string | null;
  onReplay: () => void;
  onNextLevel: () => void;
  onMainMenu: () => void;
}

export function ResultsScreen({
  result,
  mode,
  endingSummary,
  onReplay,
  onNextLevel,
  onMainMenu,
}: ResultsScreenProps) {
  const canAdvance = result.victory && result.levelId < 100;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-[#0d1524] border border-slate-800 rounded-xl p-7 space-y-6">
        <div className="space-y-1.5">
          <div className={`text-xs font-medium ${result.victory ? 'text-emerald-300' : 'text-rose-400'}`}>
            {result.victory ? 'Extraction Successful' : 'Infiltration Failed'} · Mission {result.levelId}
          </div>
          <h2 className="font-display text-4xl font-bold text-white">
            {result.victory ? `Rank ${result.rank}` : 'Mission Compromised'}
          </h2>
          {!result.victory && result.reason && (
            <p className="text-sm text-rose-200/90">{result.reason}</p>
          )}
          {endingSummary && (
            <p className="text-sm text-cyan-200 leading-relaxed pt-2 border-t border-slate-800">
              {endingSummary}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 border-y border-slate-800 py-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Clear Time</div>
            <div className="font-mono-tabular text-lg font-semibold text-white">
              {result.elapsedSec}s
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Alarms</div>
            <div className="font-mono-tabular text-lg font-semibold text-white">
              {result.alarmsTriggered}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Ghost Status</div>
            <div className="text-lg font-semibold text-white">
              {result.alarmsTriggered === 0 && result.victory ? 'Undetected' : 'Detected'}
            </div>
          </div>
        </div>

        {result.creditBreakdown && result.creditBreakdown.total > 0 && (
          <div className="bg-[#090f1b] border border-amber-500/30 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-amber-300">Shadow Credits Earned</span>
              <span className="font-mono-tabular text-lg font-bold text-amber-300">
                +{result.creditBreakdown.total} SC
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Mission Clear</span>
                <span className="font-mono-tabular text-white">+{result.creditBreakdown.missionClear}</span>
              </div>
              {result.creditBreakdown.difficultyBonus > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Difficulty Bonus</span>
                  <span className="font-mono-tabular text-white">+{result.creditBreakdown.difficultyBonus}</span>
                </div>
              )}
              {result.creditBreakdown.rankBonus > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Rank {result.rank} Bonus</span>
                  <span className="font-mono-tabular text-cyan-300">+{result.creditBreakdown.rankBonus}</span>
                </div>
              )}
              {result.creditBreakdown.intelBonus > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Intel & Dossiers</span>
                  <span className="font-mono-tabular text-white">+{result.creditBreakdown.intelBonus}</span>
                </div>
              )}
              {result.creditBreakdown.hiddenRoomsBonus > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Hidden Rooms</span>
                  <span className="font-mono-tabular text-white">+{result.creditBreakdown.hiddenRoomsBonus}</span>
                </div>
              )}
              {result.creditBreakdown.optionalBonus > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Optional Objective</span>
                  <span className="font-mono-tabular text-white">+{result.creditBreakdown.optionalBonus}</span>
                </div>
              )}
              {result.creditBreakdown.ghostBonus > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>Ghost Undetected</span>
                  <span className="font-mono-tabular">+{result.creditBreakdown.ghostBonus}</span>
                </div>
              )}
            </div>
            {typeof result.newBalance === 'number' && (
              <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-xs text-slate-400">
                <span>Updated Shadow Credits Balance</span>
                <span className="font-mono-tabular font-semibold text-amber-200">
                  {result.newBalance.toLocaleString()} SC
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {canAdvance && (
            <button
              type="button"
              onClick={onNextLevel}
              className="flex-1 py-2.5 px-5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              {mode === GameMode.BOSS_RUSH ? 'Next Boss' : `Next Mission (${result.levelId + 1})`}
            </button>
          )}
          <button
            type="button"
            onClick={onReplay}
            className="py-2.5 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="py-2.5 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-sm border border-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
