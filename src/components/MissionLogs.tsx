import { CHAPTERS } from '@/src/data/chapters';
import { OPERATIVES } from '@/src/data/characters';
import { GameMode, OperativeId, SaveData } from '@/src/types/game';
import { BookOpen, Play, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface MissionLogsProps {
  save: SaveData;
  onLaunchLevel: (levelId: number, mode: GameMode) => void;
  onClearLogs: () => void;
  onBack: () => void;
}

type LogFilter = 'all' | 'ghost' | 'boss' | 'microfilm';

export function MissionLogs({
  save,
  onLaunchLevel,
  onClearLogs,
  onBack,
}: MissionLogsProps) {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [operativeFilter, setOperativeFilter] = useState<OperativeId | 'all'>('all');
  const [chapterFilter, setChapterFilter] = useState<number | 'all'>('all');

  const logs = save.missionLogs ?? [];

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (filter === 'ghost' && entry.alarmsTriggered > 0) return false;
      if (filter === 'boss' && entry.levelId % 10 !== 0 && entry.levelId <= 100) return false;
      if (filter === 'microfilm' && !entry.optionalCompleted) return false;
      if (operativeFilter !== 'all' && entry.operativeId !== operativeFilter) return false;
      if (chapterFilter !== 'all' && entry.chapter !== chapterFilter) return false;
      return true;
    });
  }, [logs, filter, operativeFilter, chapterFilter]);

  const ghostLogCount = logs.filter((l) => l.alarmsTriggered === 0).length;
  const chaptersLogged = new Set(logs.map((l) => l.chapter)).size;

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs text-slate-400">
            THE VEIL Field Ledger · {logs.length} Recorded {logs.length === 1 ? 'Entry' : 'Entries'}
          </div>
          <h1 className="font-display text-4xl font-bold text-white">Mission Logs</h1>
        </div>
        <div className="flex items-center gap-3">
          {logs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-300 hover:text-rose-200 text-xs font-medium border border-slate-800 hover:border-rose-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Logs</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Back to Menu
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-[#0d1524] border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Total Field Entries</div>
          <div className="font-mono-tabular text-3xl font-semibold text-white">{logs.length}</div>
        </div>
        <div className="p-5 rounded-xl bg-[#0d1524] border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Undetected Operations</div>
          <div className="font-mono-tabular text-3xl font-semibold text-emerald-300">{ghostLogCount}</div>
        </div>
        <div className="p-5 rounded-xl bg-[#0d1524] border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Chapters Chronicled</div>
          <div className="font-mono-tabular text-3xl font-semibold text-cyan-300">{chaptersLogged} / 10</div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0d1524] border border-slate-800 rounded-xl">
          {(
            [
              ['all', 'All Logs'],
              ['ghost', 'Zero Alarms'],
              ['boss', 'Boss Encounters'],
              ['microfilm', 'Microfilm Recovered'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filter === key
                  ? 'bg-cyan-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by operative"
            value={operativeFilter}
            onChange={(e) => setOperativeFilter(e.target.value as OperativeId | 'all')}
            className="px-3 py-2 rounded-lg bg-[#0d1524] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">All Operatives</option>
            {Object.values(OPERATIVES).map((op) => (
              <option key={op.id} value={op.id}>
                {op.codename}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by chapter"
            value={chapterFilter}
            onChange={(e) =>
              setChapterFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="px-3 py-2 rounded-lg bg-[#0d1524] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="all">All Chapters</option>
            {CHAPTERS.map((ch) => (
              <option key={ch.id} value={ch.id}>
                Ch {ch.id}: {ch.title}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Log Entries List */}
      {logs.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#0d1524] border border-slate-800 text-center space-y-4">
          <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-semibold text-white">No Field Entries Yet</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Complete any infiltration mission to record an automated after-action narrative entry in your ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onLaunchLevel(save.unlockedLevel, GameMode.CAMPAIGN)}
            className="px-5 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Deploy Mission {save.unlockedLevel}</span>
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#0d1524] border border-slate-800 text-center text-sm text-slate-400">
          No log entries match the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((entry) => {
            const operative = OPERATIVES[entry.operativeId];
            return (
              <article
                key={entry.id}
                className="p-5 sm:p-6 rounded-xl bg-[#0d1524] border border-slate-800 flex flex-col sm:flex-row gap-5 items-start justify-between"
              >
                <div className="flex items-start gap-4 flex-1">
                  <img
                    src={operative.portraitUrl}
                    alt={operative.codename}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                      <span className="text-cyan-300 font-medium">{entry.levelCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Chapter {entry.chapter}: {entry.chapterTitle}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Rank {entry.rank}</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.timeSec}s</span>
                      <span aria-hidden="true">·</span>
                      <span className={entry.alarmsTriggered === 0 ? 'text-emerald-300' : 'text-amber-300'}>
                        {entry.alarmsTriggered === 0 ? 'Undetected' : `${entry.alarmsTriggered} Alarm${entry.alarmsTriggered > 1 ? 's' : ''}`}
                      </span>
                      {entry.recordedAtIso && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{formatTimestamp(entry.recordedAtIso)}</span>
                        </>
                      )}
                    </div>

                    <h2 className="font-display text-2xl font-bold text-white">
                      {entry.levelName}
                    </h2>

                    <p className="text-sm text-slate-300 leading-relaxed">
                      {entry.narrative}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onLaunchLevel(entry.levelId, entry.mode)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Replay</span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
