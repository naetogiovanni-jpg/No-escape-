import { CHAPTERS } from '@/src/data/chapters';
import { LevelRegistry } from '@/src/levels/LevelRegistry';
import { GameMode, SaveData } from '@/src/types/game';
import { CheckCircle2, Lock, Play, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

interface MissionArchivesProps {
  save: SaveData;
  onLaunchLevel: (levelId: number, mode: GameMode) => void;
  onBack: () => void;
}

export function MissionArchives({ save, onLaunchLevel, onBack }: MissionArchivesProps) {
  const defaultChapter = Math.ceil(save.unlockedLevel / 10);
  const [selectedChapterId, setSelectedChapterId] = useState<number>(Math.min(10, Math.max(1, defaultChapter)));
  const [validationStatus, setValidationStatus] = useState<string | null>(null);

  const chapter = CHAPTERS[selectedChapterId - 1];
  const levels = useMemo(() => {
    const start = (selectedChapterId - 1) * 10 + 1;
    return Array.from({ length: 10 }, (_, idx) => LevelRegistry.getLevel(start + idx));
  }, [selectedChapterId]);

  const handleRunValidator = () => {
    const res = LevelRegistry.validateAll100Levels();
    setValidationStatus(
      res.failed === 0
        ? `Verified all ${res.passed} campaign and secret levels: 0 pathfinding errors.`
        : `Checked ${res.passed + res.failed} levels: ${res.failed} warnings.`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs text-slate-400">
            Campaign Progress · Level {save.unlockedLevel} of 100 Unlocked
          </div>
          <h1 className="font-display text-4xl font-bold text-white">Mission Archives</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRunValidator}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verify Level Paths</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Back to Menu
          </button>
        </div>
      </div>

      {validationStatus && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs font-medium">
          {validationStatus}
        </div>
      )}

      {/* 10 Chapter Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#0d1524] border border-slate-800 rounded-xl">
        {CHAPTERS.map((ch) => {
          const active = ch.id === selectedChapterId;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => setSelectedChapterId(ch.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-cyan-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              Ch {ch.id}: {ch.title}
            </button>
          );
        })}
      </div>

      {/* Selected Chapter Overview */}
      <section className="p-6 rounded-xl bg-[#0d1524] border border-slate-800 flex flex-col lg:flex-row justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-medium" style={{ color: chapter.palette.accentHex }}>
            Chapter {chapter.id} · Levels {chapter.levelRange[0]}–{chapter.levelRange[1]} · {chapter.location}
          </div>
          <h2 className="font-display text-3xl font-bold text-white">{chapter.title}</h2>
          <p className="text-sm text-slate-300 leading-relaxed">{chapter.storySummary}</p>
          <p className="text-xs text-slate-400 pt-1">
            Chapter Mechanics: {chapter.mechanicsSummary}
          </p>
        </div>
        <div className="flex flex-col justify-between items-start lg:items-end gap-3 shrink-0">
          <div className="text-xs text-slate-400">Chapter Palette</div>
          <div className="flex items-center gap-1.5">
            {[
              chapter.palette.floorHex,
              chapter.palette.wallHex,
              chapter.palette.wallTrimHex,
              chapter.palette.accentHex,
            ].map((hex) => (
              <div
                key={hex}
                className="w-7 h-7 rounded border border-slate-700"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 10 Levels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {levels.map((lvl) => {
          const unlocked = lvl.id <= save.unlockedLevel || save.newGamePlusUnlocked;
          const record = save.levelRecords[lvl.id];

          return (
            <div
              key={lvl.id}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${
                unlocked
                  ? 'bg-[#0d1524] border-slate-800'
                  : 'bg-[#090e18] border-slate-800/40 opacity-60'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                  <span>{lvl.code}</span>
                  <span>
                    {lvl.isBossLevel
                      ? 'Boss'
                      : lvl.isEscapeLevel
                      ? 'Escape'
                      : record?.rank
                      ? `Rank ${record.rank}`
                      : `Lv ${lvl.id}`}
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold text-white truncate" title={lvl.name}>
                  {lvl.name}
                </h3>

                <div className="text-xs text-slate-400 space-y-0.5">
                  <div>{lvl.enemies.length > 0 ? `${lvl.enemies.length} Patrols · ${lvl.cameras.length} Cameras` : 'Arena Encounter'}</div>
                  {record && (
                    <div className="flex items-center gap-1.5 text-emerald-300 font-mono-tabular">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {record.bestTimeSec}s {record.ghostProtocolCleared ? '· Ghost' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={!unlocked}
                onClick={() =>
                  onLaunchLevel(
                    lvl.id,
                    save.newGamePlusActive ? GameMode.NEW_GAME_PLUS : GameMode.CAMPAIGN
                  )
                }
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  unlocked
                    ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer'
                    : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                {unlocked ? <Play className="w-3.5 h-3.5 fill-current" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{unlocked ? 'Deploy' : 'Locked'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
