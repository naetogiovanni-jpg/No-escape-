import { AwarenessState, EnemyAIState } from '@/src/types/game';

export class EnemyAwareness {
  public static resolveAwareness(aiState: EnemyAIState, suspicion: number): AwarenessState {
    if (aiState === EnemyAIState.STUNNED) return AwarenessState.DISABLED;
    if (aiState === EnemyAIState.RECOVERING) return AwarenessState.RECOVERING;
    if (aiState === EnemyAIState.ALERT) return AwarenessState.ALERTED;
    if (aiState === EnemyAIState.SEARCH) return AwarenessState.INVESTIGATING;
    if (suspicion >= 55) return AwarenessState.SUSPICIOUS;
    if (suspicion >= 20 || aiState === EnemyAIState.INVESTIGATE) return AwarenessState.CURIOUS;
    return AwarenessState.UNAWARE;
  }

  public static isVulnerableToTakedown(aiState: EnemyAIState): boolean {
    return (
      aiState !== EnemyAIState.ALERT &&
      aiState !== EnemyAIState.STUNNED &&
      aiState !== EnemyAIState.RECOVERING
    );
  }

  public static getStatusColor(state: AwarenessState): string {
    switch (state) {
      case AwarenessState.ALERTED:
        return '#fb7185';
      case AwarenessState.INVESTIGATING:
        return '#fb923c';
      case AwarenessState.SUSPICIOUS:
        return '#fbbf24';
      case AwarenessState.CURIOUS:
        return '#fde68a';
      case AwarenessState.DISABLED:
        return '#94a3b8';
      case AwarenessState.RECOVERING:
        return '#38bdf8';
      case AwarenessState.UNAWARE:
      default:
        return '#34d399';
    }
  }
}
