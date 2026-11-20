import { BOSS_LIST } from '@/src/data/bosses';
import { EQUIPMENT_ORDER } from '@/src/data/equipment';
import { getDefaultAppearance } from '@/src/systems/CharacterCustomization';
import { CurrencyManager } from '@/src/systems/CurrencyManager';
import { generateMissionLogEntry } from '@/src/systems/MissionLogSystem';
import { SHOP_CATALOG, ShopManager } from '@/src/systems/ShopManager';
import {
  BossArchiveRecord,
  CreditBreakdown,
  EquipmentId,
  GameMode,
  GameSettings,
  LevelCompletionRecord,
  OperativeAppearance,
  OperativeId,
  SaveData,
  UpgradeLevels,
} from '@/src/types/game';

const STORAGE_KEY = 'shadow_protocol_save_v4';

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.75,
  musicVolume: 0.45,
  sfxVolume: 0.75,
  muted: false,
  showTouchControls: 'auto',
  reducedMotion: false,
  showRouteHints: true,
};

const DEFAULT_UPGRADES: UpgradeLevels = {
  pulseEnergyLevel: 0,
  gadgetBeltLevel: 0,
  scannerLevel: 0,
  staminaCoreLevel: 0,
  extraSlotLevel: 0,
};

function createDefaultSave(): SaveData {
  const bossRecords: Record<string, BossArchiveRecord> = {};
  for (const boss of BOSS_LIST) {
    bossRecords[boss.id] = {
      bossId: boss.id,
      encountered: false,
      defeated: false,
      bestTimeSec: null,
      encountersCount: 0,
    };
  }

  return {
    version: 4,
    selectedOperative: OperativeId.GHOST,
    unlockedLevel: 1,
    newGamePlusUnlocked: false,
    newGamePlusActive: false,
    unlockedEquipment: [EquipmentId.RECON_SCANNER, EquipmentId.ACOUSTIC_DECOY],
    levelRecords: {},
    bossRecords,
    unlockedSecretBosses: [],
    storyDecisions: {},
    missionLogs: [],
    trustScore: 0,
    totalAlarmsTriggered: 0,
    totalPlayTimeSec: 0,
    shadowCredits: 150,
    purchasedShopItems: [],
    upgradeLevels: { ...DEFAULT_UPGRADES },
    appearance: getDefaultAppearance(OperativeId.GHOST),
    unlockedOutfits: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

class SaveSystemClass {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  public load(): SaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createDefaultSave();
      }
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const defaults = createDefaultSave();
      const op = parsed.selectedOperative ?? defaults.selectedOperative;
      return {
        ...defaults,
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        bossRecords: { ...defaults.bossRecords, ...(parsed.bossRecords ?? {}) },
        levelRecords: parsed.levelRecords ?? {},
        unlockedEquipment: parsed.unlockedEquipment ?? defaults.unlockedEquipment,
        unlockedSecretBosses: parsed.unlockedSecretBosses ?? [],
        storyDecisions: parsed.storyDecisions ?? {},
        missionLogs: parsed.missionLogs ?? [],
        shadowCredits:
          typeof parsed.shadowCredits === 'number' ? parsed.shadowCredits : defaults.shadowCredits,
        purchasedShopItems: parsed.purchasedShopItems ?? [],
        upgradeLevels: { ...DEFAULT_UPGRADES, ...(parsed.upgradeLevels ?? {}) },
        appearance: { ...getDefaultAppearance(op), ...(parsed.appearance ?? {}) },
        unlockedOutfits: parsed.unlockedOutfits ?? [],
      };
    } catch {
      return createDefaultSave();
    }
  }

  public getSave(): SaveData {
    return this.data;
  }

  public persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore quota errors cleanly
    }
  }

  public resetSave(): SaveData {
    this.data = createDefaultSave();
    this.persist();
    return this.data;
  }

  public clearMissionLogs(): void {
    this.data.missionLogs = [];
    this.persist();
  }

  public setOperative(operative: OperativeId): void {
    this.data.selectedOperative = operative;
    this.persist();
  }

  public updateAppearance(partial: Partial<OperativeAppearance>): OperativeAppearance {
    this.data.appearance = { ...this.data.appearance, ...partial };
    this.persist();
    return this.data.appearance;
  }

  public resetAppearance(operative?: OperativeId): OperativeAppearance {
    const target = operative ?? this.data.selectedOperative;
    this.data.appearance = getDefaultAppearance(target);
    this.persist();
    return this.data.appearance;
  }

  public purchaseShopItem(itemId: string): { success: boolean; message: string } {
    const item = SHOP_CATALOG.find((entry) => entry.id === itemId);
    if (!item) return { success: false, message: 'Item not found.' };
    const result = ShopManager.applyPurchase(item, this.data);
    if (result.success) {
      this.persist();
    }
    return result;
  }

  public updateSettings(partial: Partial<GameSettings>): GameSettings {
    this.data.settings = { ...this.data.settings, ...partial };
    this.persist();
    return this.data.settings;
  }

  public setNewGamePlusActive(active: boolean): void {
    if (this.data.newGamePlusUnlocked) {
      this.data.newGamePlusActive = active;
      this.persist();
    }
  }

  public recordStoryDecision(key: string, value: string, trustDelta = 0): void {
    this.data.storyDecisions[key] = value;
    this.data.trustScore += trustDelta;
    this.persist();
  }

  public unlockEquipment(id: EquipmentId): void {
    if (!this.data.unlockedEquipment.includes(id)) {
      this.data.unlockedEquipment.push(id);
      this.persist();
    }
  }

  public recordBossEncounter(bossId: string, defeated: boolean, timeSec: number): void {
    const existing = this.data.bossRecords[bossId] ?? {
      bossId,
      encountered: false,
      defeated: false,
      bestTimeSec: null,
      encountersCount: 0,
    };
    existing.encountered = true;
    existing.encountersCount += 1;
    if (defeated) {
      existing.defeated = true;
      if (existing.bestTimeSec === null || timeSec < existing.bestTimeSec) {
        existing.bestTimeSec = Math.round(timeSec * 10) / 10;
      }
    }
    this.data.bossRecords[bossId] = existing;
    this.persist();
  }

  public recordLevelCompletion(params: {
    levelId: number;
    timeSec: number;
    alarmsTriggered: number;
    optionalCompleted: boolean;
    collectiblesFound: number;
    intelFound?: number;
    hiddenRoomsFound?: number;
    rank: 'S' | 'A' | 'B' | 'C';
    operativeId?: OperativeId;
    mode?: GameMode;
  }): CreditBreakdown {
    const {
      levelId,
      timeSec,
      alarmsTriggered,
      optionalCompleted,
      collectiblesFound,
      intelFound = 0,
      hiddenRoomsFound = 0,
      rank,
    } = params;
    const prev = this.data.levelRecords[levelId];
    const ghostCleared = alarmsTriggered === 0;

    const record: LevelCompletionRecord = {
      levelId,
      completed: true,
      bestTimeSec: prev ? Math.min(prev.bestTimeSec, timeSec) : timeSec,
      ghostProtocolCleared: (prev?.ghostProtocolCleared ?? false) || ghostCleared,
      optionalCompleted: (prev?.optionalCompleted ?? false) || optionalCompleted,
      collectiblesFound: Math.max(prev?.collectiblesFound ?? 0, collectiblesFound),
      rank: prev ? this.pickBetterRank(prev.rank, rank) : rank,
    };

    this.data.levelRecords[levelId] = record;
    this.data.totalAlarmsTriggered += alarmsTriggered;
    this.data.totalPlayTimeSec += Math.round(timeSec);

    const creditBreakdown = CurrencyManager.calculateMissionReward({
      levelId,
      mode: params.mode ?? GameMode.CAMPAIGN,
      rank,
      intelFound,
      hiddenRoomsFound,
      collectiblesFound,
      optionalCompleted,
      alarmsTriggered,
    });
    this.data.shadowCredits += creditBreakdown.total;

    const logEntry = generateMissionLogEntry({
      levelId,
      operativeId: params.operativeId ?? this.data.selectedOperative,
      mode: params.mode ?? GameMode.CAMPAIGN,
      timeSec,
      alarmsTriggered,
      optionalCompleted,
      rank,
    });
    this.data.missionLogs = [logEntry, ...this.data.missionLogs].slice(0, 250);

    if (levelId <= 100 && levelId >= this.data.unlockedLevel && levelId < 100) {
      this.data.unlockedLevel = levelId + 1;
    }

    if (levelId === 100) {
      this.data.newGamePlusUnlocked = true;
    }

    // Unlock milestone equipment automatically on level reach
    const equipUnlockMap: Partial<Record<number, EquipmentId>> = {
      2: EquipmentId.PULSE_TAGGER,
      3: EquipmentId.ACCESS_DEVICE,
      5: EquipmentId.SIGNAL_JAMMER,
      6: EquipmentId.PULSE_TOOL,
      8: EquipmentId.SHADOW_CLOAK,
    };
    for (const eq of EQUIPMENT_ORDER) {
      for (const [reqLevel, eqId] of Object.entries(equipUnlockMap)) {
        if (eqId === eq && this.data.unlockedLevel >= Number(reqLevel)) {
          if (!this.data.unlockedEquipment.includes(eq)) {
            this.data.unlockedEquipment.push(eq);
          }
        }
      }
    }

    this.evaluateSecretBossUnlocks();
    this.persist();
    return creditBreakdown;
  }

  private evaluateSecretBossUnlocks(): void {
    const records = Object.values(this.data.levelRecords);
    const ghostClears = records.filter((r) => r.ghostProtocolCleared).length;
    const optionalClears = records.filter((r) => r.optionalCompleted).length;
    const totalCleared = records.filter((r) => r.completed).length;

    if (ghostClears >= 5 && !this.data.unlockedSecretBosses.includes('phantom')) {
      this.data.unlockedSecretBosses.push('phantom');
    }
    if (optionalClears >= 10 && !this.data.unlockedSecretBosses.includes('redline')) {
      this.data.unlockedSecretBosses.push('redline');
    }
    if (
      (this.data.levelRecords[100]?.completed || totalCleared >= 25) &&
      !this.data.unlockedSecretBosses.includes('the_null')
    ) {
      this.data.unlockedSecretBosses.push('the_null');
    }
  }

  private pickBetterRank(a: 'S' | 'A' | 'B' | 'C', b: 'S' | 'A' | 'B' | 'C'): 'S' | 'A' | 'B' | 'C' {
    const order = { S: 4, A: 3, B: 2, C: 1 };
    return order[a] >= order[b] ? a : b;
  }
}

export const SaveSystem = new SaveSystemClass();
