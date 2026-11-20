import { BOSSES } from '@/src/data/bosses';
import { CHAPTERS } from '@/src/data/chapters';
import { OPERATIVES } from '@/src/data/characters';
import { LevelRegistry } from '@/src/levels/LevelRegistry';
import { GameMode, MissionLogEntry, OperativeId } from '@/src/types/game';

export interface CreateMissionLogParams {
  levelId: number;
  operativeId: OperativeId;
  mode: GameMode;
  timeSec: number;
  alarmsTriggered: number;
  optionalCompleted: boolean;
  rank: 'S' | 'A' | 'B' | 'C';
}

export function generateMissionLogEntry(params: CreateMissionLogParams): MissionLogEntry {
  const level = LevelRegistry.getLevel(params.levelId);
  const chapter = CHAPTERS[level.chapter - 1] ?? CHAPTERS[0];
  const operative = OPERATIVES[params.operativeId];
  const boss = level.bossId ? BOSSES[level.bossId] : null;

  const stealthClause =
    params.alarmsTriggered === 0
      ? getQuietVoiceLine(params.operativeId, chapter.location)
      : params.alarmsTriggered === 1
      ? `A single proximity alert forced a quick route pivot through ${chapter.location}, yet containment never closed.`
      : `${params.alarmsTriggered} security alerts echoed across ${chapter.location} before extraction cleared the perimeter.`;

  const objectiveClause = boss
    ? `Confronted ${boss.name} inside ${level.name} and neutralized their defenses across all three phases.`
    : level.isEscapeLevel
    ? `Overrode the mainframe in ${level.name} and outran the emergency lockdown countdown to the extraction point.`
    : `Secured classified intelligence and overridden relays inside ${level.name}.`;

  const optionalClause = params.optionalCompleted
    ? ' Hidden VEIL microfilm was recovered from a concealed alcove along the route.'
    : '';

  const modeTag =
    params.mode === GameMode.GHOST_PROTOCOL
      ? ' Logged under strict Ghost Protocol.'
      : params.mode === GameMode.NEW_GAME_PLUS
      ? ' Completed under heightened New Game Plus security.'
      : params.mode === GameMode.TIME_TRIAL
      ? ' Executed under Time Trial pace.'
      : '';

  const narrative = `${operative.codename} infiltrated ${chapter.location} (${level.code}: ${level.name}). ${objectiveClause} ${stealthClause}${optionalClause}${modeTag}`;

  return {
    id: `log_${params.levelId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    levelId: params.levelId,
    levelCode: level.code,
    levelName: level.name,
    chapter: level.chapter,
    chapterTitle: chapter.title,
    operativeId: params.operativeId,
    mode: params.mode,
    rank: params.rank,
    timeSec: params.timeSec,
    alarmsTriggered: params.alarmsTriggered,
    optionalCompleted: params.optionalCompleted,
    narrative,
    recordedAtIso: new Date().toISOString(),
  };
}

function getQuietVoiceLine(operativeId: OperativeId, location: string): string {
  switch (operativeId) {
    case OperativeId.VEX:
      return `Slipped past every patrol line in ${location} without tripping a single sensor.`;
    case OperativeId.NOVA:
      return `Bypassed optical telemetry across ${location} cleanly—zero trace left on the network.`;
    case OperativeId.RAVEN:
      return `Moved unseen through ${location}'s blind angles; the guards never knew anyone entered.`;
    case OperativeId.GHOST:
    default:
      return `Vanished through ${location} with zero alarms—another silent entry on THE VEIL ledger.`;
  }
}
