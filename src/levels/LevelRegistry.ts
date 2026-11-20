import { generateBossLevel, generateCampaignLevel } from '@/src/levels/LevelGenerator';
import { validateLevel } from '@/src/levels/LevelValidator';
import { LevelDefinition } from '@/src/types/game';

class LevelRegistryClass {
  private cache = new Map<number, LevelDefinition>();

  public getLevel(levelId: number): LevelDefinition {
    const cached = this.cache.get(levelId);
    if (cached) return cached;

    let level: LevelDefinition;
    if (levelId === 101) {
      level = generateBossLevel(101, 'phantom');
    } else if (levelId === 102) {
      level = generateBossLevel(102, 'redline');
    } else if (levelId === 103) {
      level = generateBossLevel(103, 'the_null');
    } else {
      const clamped = Math.max(1, Math.min(100, levelId));
      level = generateCampaignLevel(clamped);
    }

    const validation = validateLevel(level);
    if (!validation.valid) {
      console.warn('Level validation warnings:', validation.errors);
    }

    this.cache.set(levelId, level);
    return level;
  }

  public getAllCampaignLevels(): LevelDefinition[] {
    const list: LevelDefinition[] = [];
    for (let i = 1; i <= 100; i++) {
      list.push(this.getLevel(i));
    }
    return list;
  }

  public validateAll100Levels(): { passed: number; failed: number; errors: string[] } {
    let passed = 0;
    let failed = 0;
    const errors: string[] = [];
    for (let i = 1; i <= 103; i++) {
      const lvl = this.getLevel(i);
      const res = validateLevel(lvl);
      if (res.valid) {
        passed++;
      } else {
        failed++;
        errors.push(...res.errors);
      }
    }
    return { passed, failed, errors };
  }
}

export const LevelRegistry = new LevelRegistryClass();
