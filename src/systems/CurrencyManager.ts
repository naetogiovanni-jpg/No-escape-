import { CreditBreakdown, GameMode } from '@/src/types/game';

export interface MissionRewardInput {
  levelId: number;
  mode: GameMode;
  rank: 'S' | 'A' | 'B' | 'C';
  intelFound: number;
  hiddenRoomsFound: number;
  collectiblesFound: number;
  optionalCompleted: boolean;
  alarmsTriggered: number;
}

export class CurrencyManager {
  public static calculateMissionReward(input: MissionRewardInput): CreditBreakdown {
    const chapter = Math.max(1, Math.ceil(input.levelId / 10));
    const missionClear = 100;
    const modeBonus =
      input.mode === GameMode.GHOST_PROTOCOL
        ? 30
        : input.mode === GameMode.CHALLENGE
        ? 25
        : input.mode === GameMode.BOSS_RUSH
        ? 40
        : 0;
    const difficultyBonus = (chapter - 1) * 12 + modeBonus;
    const rankBonus = input.rank === 'S' ? 100 : input.rank === 'A' ? 50 : 0;
    const intelCount = Math.max(0, input.intelFound) + Math.max(0, input.collectiblesFound);
    const intelBonus = intelCount * 25;
    const hiddenRoomsBonus = Math.max(0, input.hiddenRoomsFound) * 40;
    const optionalBonus = input.optionalCompleted ? 35 : 0;
    const ghostBonus = input.alarmsTriggered === 0 ? 45 : 0;

    const total =
      missionClear +
      difficultyBonus +
      rankBonus +
      intelBonus +
      hiddenRoomsBonus +
      optionalBonus +
      ghostBonus;

    return {
      missionClear,
      difficultyBonus,
      rankBonus,
      intelBonus,
      hiddenRoomsBonus,
      optionalBonus,
      ghostBonus,
      total,
    };
  }

  public static canAfford(balance: number, cost: number): boolean {
    return balance >= cost && cost >= 0;
  }

  public static formatCredits(amount: number): string {
    return `${Math.max(0, Math.floor(amount)).toLocaleString()} SC`;
  }
}
