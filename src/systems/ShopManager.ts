import { EquipmentId, SaveData, ShopItemDefinition, UpgradeLevels } from '@/src/types/game';

export const SHOP_CATALOG: ShopItemDefinition[] = [
  {
    id: 'gadget_pulse_tagger',
    name: 'Pulse Tagger Emitter',
    category: 'gadgets',
    price: 120,
    maxTier: 1,
    description:
      'Directional non-lethal electronic emitter that temporarily disables guards, cameras, and security traps within aiming range.',
    effectSummary: 'Unlocks Pulse Tagger immediately for missions',
    accentHex: '#22d3ee',
    equipmentId: EquipmentId.PULSE_TAGGER,
  },
  {
    id: 'gadget_access_device',
    name: 'Electronic Access Device',
    category: 'gadgets',
    price: 110,
    maxTier: 1,
    description:
      'Short-range cryptographic override tool for bypassing locked bulkheads and terminals without searching for keycards.',
    effectSummary: 'Early unlock for Access Device (Slot 4)',
    accentHex: '#38bdf8',
    equipmentId: EquipmentId.ACCESS_DEVICE,
  },
  {
    id: 'gadget_signal_jammer',
    name: 'Signal Jammer Array',
    category: 'gadgets',
    price: 140,
    maxTier: 1,
    description:
      'Scrambles nearby surveillance cameras, laser emitters, and guard radio coordination links for 5 seconds.',
    effectSummary: 'Early unlock for Signal Jammer (Slot 5)',
    accentHex: '#34d399',
    equipmentId: EquipmentId.SIGNAL_JAMMER,
  },
  {
    id: 'gadget_shadow_cloak',
    name: 'Refraction Cloak Module',
    category: 'gadgets',
    price: 190,
    maxTier: 1,
    description:
      'Portable optical shroud rendering your operative concealed to patrols and security sweeps for 3.5 seconds.',
    effectSummary: 'Early unlock for Concealment Cloak (Slot 7)',
    accentHex: '#f43f5e',
    equipmentId: EquipmentId.SHADOW_CLOAK,
  },
  {
    id: 'upgrade_pulse_capacitor',
    name: 'Pulse Capacitor Cell',
    category: 'upgrades',
    price: 95,
    maxTier: 3,
    description:
      'Expands Pulse Tagger energy bank, speeds up automatic cell recharge, and extends aiming lock range by +35px per tier.',
    effectSummary: '+1 Max Cell · +25% Recharge · +35px Range per tier',
    accentHex: '#22d3ee',
    upgradeKey: 'pulseEnergyLevel',
  },
  {
    id: 'upgrade_stamina_core',
    name: 'Kinetic Stamina Core',
    category: 'upgrades',
    price: 90,
    maxTier: 3,
    description:
      'Boosts sprint efficiency, expands maximum stamina capacity, and shortens post-depletion stamina recovery.',
    effectSummary: '+15 Max Stamina · Faster recovery per tier',
    accentHex: '#f59e0b',
    upgradeKey: 'staminaCoreLevel',
  },
  {
    id: 'upgrade_scanner_array',
    name: 'Recon Scanner Array',
    category: 'scanner',
    price: 85,
    maxTier: 3,
    description:
      'Amplifies Reconnaissance Scanner pulse duration and highlights traps and secret alcoves through walls.',
    effectSummary: '+2s Scan Duration · Trap Highlighting at Tier 1+',
    accentHex: '#67e8f9',
    upgradeKey: 'scannerLevel',
  },
  {
    id: 'upgrade_extra_slots',
    name: 'Modular Rig Expansion',
    category: 'slots',
    price: 130,
    maxTier: 2,
    description:
      'Adds tactical belt holsters and auxiliary battery packs, granting +1 charge to all limited-use gadgets.',
    effectSummary: '+1 Charge to all limited gadgets per tier',
    accentHex: '#38bdf8',
    upgradeKey: 'extraSlotLevel',
  },
  {
    id: 'upgrade_gadget_belt',
    name: 'Rapid Cooldown Harness',
    category: 'slots',
    price: 115,
    maxTier: 3,
    description:
      'Optimizes field gadget cooling cycles so tactical devices are ready faster during tense extractions.',
    effectSummary: '-12% Gadget Cooldown per tier',
    accentHex: '#a78bfa',
    upgradeKey: 'gadgetBeltLevel',
  },
  {
    id: 'outfit_nightrunner',
    name: 'Hooded Nightrunner Suit',
    category: 'outfits',
    price: 140,
    maxTier: 1,
    description:
      'Acoustic-weave stealth suit with deep hood and neon trim for full animated sprite customization.',
    effectSummary: 'Unlocks Stealth Suit + Hooded Cloak preset',
    accentHex: '#67e8f9',
    outfitPreset: {
      jacketStyle: 'stealth_suit',
      hooded: true,
      gloveStyle: 'neon_grip',
      footwearStyle: 'silent_runners',
      accessory: 'half_mask',
      jacketColor: '#172554',
      trimColor: '#67e8f9',
    },
  },
  {
    id: 'outfit_heavy_tactical',
    name: 'Sentinel Ballistic Rig',
    category: 'outfits',
    price: 150,
    maxTier: 1,
    description:
      'Reinforced shoulder pauldrons, armored knuckles, and mag-lock greaves built for frontline infiltration.',
    effectSummary: 'Unlocks Ballistic Rig armor style',
    accentHex: '#10b981',
    outfitPreset: {
      jacketStyle: 'armor_vest',
      hooded: false,
      gloveStyle: 'armored',
      footwearStyle: 'mag_greaves',
      accessory: 'visor',
      jacketColor: '#1f2937',
      trimColor: '#10b981',
    },
  },
  {
    id: 'outfit_casual_infiltrator',
    name: 'Civic Trench Infiltrator',
    category: 'outfits',
    price: 110,
    maxTier: 1,
    description:
      'Low-profile urban trench coat and soft-sole runners designed for corporate towers and transit hubs.',
    effectSummary: 'Unlocks Casual Infiltrator coat style',
    accentHex: '#f59e0b',
    outfitPreset: {
      jacketStyle: 'casual_coat',
      hooded: false,
      gloveStyle: 'fingerless',
      footwearStyle: 'silent_runners',
      accessory: 'scarf',
      jacketColor: '#3b2f2f',
      trimColor: '#f59e0b',
    },
  },
  {
    id: 'vfx_cyan_ghost',
    name: 'Cyan Ghost Afterimage',
    category: 'cosmetics',
    price: 80,
    maxTier: 1,
    description: 'Replaces dodge and sprint-slide trails with crisp holographic cyan afterimages.',
    effectSummary: 'Custom Cyan movement trail VFX',
    accentHex: '#22d3ee',
    vfxTrail: 'cyan_ghost',
  },
  {
    id: 'vfx_amber_ember',
    name: 'Amber Ember Afterimage',
    category: 'cosmetics',
    price: 80,
    maxTier: 1,
    description: 'Generates warm amber kinetic sparks during vaults, dodges, and power slides.',
    effectSummary: 'Custom Amber movement trail VFX',
    accentHex: '#f59e0b',
    vfxTrail: 'amber_ember',
  },
  {
    id: 'vfx_violet_static',
    name: 'Violet Static Discharge',
    category: 'cosmetics',
    price: 95,
    maxTier: 1,
    description: 'Infuses parkour dashes and Pulse Tagger shots with violet electromagnetic static.',
    effectSummary: 'Custom Violet movement trail VFX',
    accentHex: '#a78bfa',
    vfxTrail: 'violet_static',
  },
  {
    id: 'vfx_emerald_flux',
    name: 'Emerald Flux Stream',
    category: 'cosmetics',
    price: 95,
    maxTier: 1,
    description: 'Leaves a clean emerald stealth stream behind high-momentum maneuvers.',
    effectSummary: 'Custom Emerald movement trail VFX',
    accentHex: '#34d399',
    vfxTrail: 'emerald_flux',
  },
];

export class ShopManager {
  public static getCurrentTier(item: ShopItemDefinition, save: SaveData): number {
    if (item.equipmentId && save.unlockedEquipment.includes(item.equipmentId)) {
      return 1;
    }
    if (item.upgradeKey) {
      return save.upgradeLevels[item.upgradeKey] ?? 0;
    }
    if (item.outfitPreset && save.unlockedOutfits.includes(item.id)) {
      return 1;
    }
    if (item.vfxTrail && save.purchasedShopItems.includes(item.id)) {
      return 1;
    }
    return save.purchasedShopItems.includes(item.id) ? 1 : 0;
  }

  public static getNextPrice(item: ShopItemDefinition, save: SaveData): number {
    const tier = this.getCurrentTier(item, save);
    if (tier >= item.maxTier) return item.price;
    return Math.round(item.price * (1 + tier * 0.45));
  }

  public static isMaxed(item: ShopItemDefinition, save: SaveData): boolean {
    return this.getCurrentTier(item, save) >= item.maxTier;
  }

  public static canPurchase(item: ShopItemDefinition, save: SaveData): {
    ok: boolean;
    reason?: string;
    price: number;
  } {
    const price = this.getNextPrice(item, save);
    if (this.isMaxed(item, save)) {
      return { ok: false, reason: 'Already maxed', price };
    }
    if (save.shadowCredits < price) {
      return { ok: false, reason: 'Insufficient Shadow Credits', price };
    }
    return { ok: true, price };
  }

  public static applyPurchase(item: ShopItemDefinition, save: SaveData): {
    success: boolean;
    message: string;
  } {
    const check = this.canPurchase(item, save);
    if (!check.ok) {
      return { success: false, message: check.reason ?? 'Unavailable' };
    }

    save.shadowCredits -= check.price;

    if (!save.purchasedShopItems.includes(item.id)) {
      save.purchasedShopItems.push(item.id);
    }

    if (item.equipmentId && !save.unlockedEquipment.includes(item.equipmentId)) {
      save.unlockedEquipment.push(item.equipmentId);
    }

    if (item.upgradeKey) {
      const key: keyof UpgradeLevels = item.upgradeKey;
      save.upgradeLevels[key] = Math.min(item.maxTier, (save.upgradeLevels[key] ?? 0) + 1);
    }

    if (item.outfitPreset) {
      if (!save.unlockedOutfits.includes(item.id)) {
        save.unlockedOutfits.push(item.id);
      }
      save.appearance = {
        ...save.appearance,
        ...item.outfitPreset,
      };
    }

    if (item.vfxTrail) {
      save.appearance = {
        ...save.appearance,
        vfxTrail: item.vfxTrail,
      };
    }

    return {
      success: true,
      message: `${item.name} acquired for ${check.price} SC`,
    };
  }
}
