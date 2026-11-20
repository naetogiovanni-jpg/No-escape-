import {
  AccessoryStyle,
  FootwearStyle,
  GloveStyle,
  HairStyle,
  JacketStyle,
  OperativeAppearance,
  OperativeId,
  VisualFxTrail,
} from '@/src/types/game';

export interface CustomizationOption<T extends string> {
  id: T;
  label: string;
  description: string;
  requiresOutfitId?: string;
}

export const JACKET_OPTIONS: CustomizationOption<JacketStyle>[] = [
  {
    id: 'tactical_jacket',
    label: 'Tactical Jacket',
    description: 'High-collar structured stealth jacket with reinforced seams.',
  },
  {
    id: 'hooded_cloak',
    label: 'Hooded Runner',
    description: 'Drape-shoulder infiltration shell built for low-light alleys.',
  },
  {
    id: 'armor_vest',
    label: 'Ballistic Rig',
    description: 'Broad shoulder pauldrons and chest armor plating.',
    requiresOutfitId: 'outfit_heavy_tactical',
  },
  {
    id: 'casual_coat',
    label: 'Casual Infiltrator',
    description: 'Slim civic trench jacket designed to blend into transit hubs.',
    requiresOutfitId: 'outfit_casual_infiltrator',
  },
  {
    id: 'stealth_suit',
    label: 'Weave Stealth Suit',
    description: 'Form-fitting acoustic-dampened carbon weave.',
    requiresOutfitId: 'outfit_nightrunner',
  },
];

export const GLOVE_OPTIONS: CustomizationOption<GloveStyle>[] = [
  { id: 'fingerless', label: 'Fingerless Tactical', description: 'Agile grip for terminals and ledges.' },
  { id: 'armored', label: 'Reinforced Knuckles', description: 'Armored forearm cuffs for close takedowns.' },
  { id: 'insulated', label: 'Insulated Micro-Grip', description: 'Static-shielded gloves for high-voltage relays.' },
  { id: 'neon_grip', label: 'Tracer Trim Gloves', description: 'Accent-piped tactical sleeves.' },
];

export const FOOTWEAR_OPTIONS: CustomizationOption<FootwearStyle>[] = [
  { id: 'combat_boots', label: 'Combat Boots', description: 'Standard reinforced tactical tread.' },
  { id: 'silent_runners', label: 'Silent Runners', description: 'Soft-sole infiltration sneakers.' },
  { id: 'mag_greaves', label: 'Mag-Lock Greaves', description: 'Armored shin plates with metallic trim.' },
];

export const HAIR_OPTIONS: CustomizationOption<HairStyle>[] = [
  { id: 'layered', label: 'Layered Fringe', description: 'Uneven layered silhouette.' },
  { id: 'undercut', label: 'Swept Undercut', description: 'Asymmetrical side-swept cut.' },
  { id: 'ponytail', label: 'Low Ponytail', description: 'Sleek parted bangs with trailing ponytail.' },
  { id: 'cropped', label: 'Military Crop', description: 'Clean cropped flat-top silhouette.' },
  { id: 'swept', label: 'Textured Taper', description: 'Short angular crown cut.' },
];

export const ACCESSORY_OPTIONS: CustomizationOption<AccessoryStyle>[] = [
  { id: 'none', label: 'None', description: 'Clean silhouette with no head or neck gear.' },
  { id: 'visor', label: 'Recon Visor', description: 'Translucent cyan tactical eyepiece.' },
  { id: 'headset', label: 'Comms Headset', description: 'Low-profile earpiece and mic boom.' },
  { id: 'scarf', label: 'Stealth Scarf', description: 'Wrapped storm-collar neck shroud.' },
  { id: 'holo_wrist', label: 'Holo Wrist Rig', description: 'Projected wrist telemetry emitter.' },
  { id: 'half_mask', label: 'Filter Half-Mask', description: 'Lower-face atmospheric respirator.' },
];

export const VFX_TRAIL_OPTIONS: Array<{
  id: VisualFxTrail;
  label: string;
  hex: string;
  requiresShopId?: string;
}> = [
  { id: 'class_default', label: 'Operative Signature', hex: '#67e8f9' },
  { id: 'cyan_ghost', label: 'Cyan Ghost Trail', hex: '#22d3ee', requiresShopId: 'vfx_cyan_ghost' },
  { id: 'amber_ember', label: 'Amber Ember Trail', hex: '#f59e0b', requiresShopId: 'vfx_amber_ember' },
  { id: 'violet_static', label: 'Violet Static Trail', hex: '#a78bfa', requiresShopId: 'vfx_violet_static' },
  { id: 'emerald_flux', label: 'Emerald Flux Trail', hex: '#34d399', requiresShopId: 'vfx_emerald_flux' },
];

export const COLOR_SWATCHES = {
  jacket: ['#1e293b', '#27272a', '#1f2937', '#2b2435', '#111827', '#172554', '#2e1065', '#3b2f2f'],
  trim: ['#67e8f9', '#f59e0b', '#10b981', '#38bdf8', '#f43f5e', '#a78bfa', '#e2e8f0'],
  trouser: ['#0f172a', '#18181b', '#3f3f46', '#1e293b', '#171717'],
  hair: ['#090d16', '#cbd5e1', '#94a3b8', '#6b1d3a', '#451a03', '#1e3a8a', '#f8fafc'],
};

export function getDefaultAppearance(op: OperativeId): OperativeAppearance {
  switch (op) {
    case OperativeId.VEX:
      return {
        jacketStyle: 'tactical_jacket',
        hooded: false,
        gloveStyle: 'fingerless',
        footwearStyle: 'silent_runners',
        hairStyle: 'undercut',
        accessory: 'none',
        jacketColor: '#27272a',
        trimColor: '#f59e0b',
        trouserColor: '#3f3f46',
        hairColor: '#cbd5e1',
        vfxTrail: 'class_default',
      };
    case OperativeId.BASTION:
      return {
        jacketStyle: 'armor_vest',
        hooded: false,
        gloveStyle: 'armored',
        footwearStyle: 'mag_greaves',
        hairStyle: 'cropped',
        accessory: 'headset',
        jacketColor: '#1f2937',
        trimColor: '#10b981',
        trouserColor: '#0f172a',
        hairColor: '#94a3b8',
        vfxTrail: 'class_default',
      };
    case OperativeId.NOVA:
      return {
        jacketStyle: 'tactical_jacket',
        hooded: false,
        gloveStyle: 'insulated',
        footwearStyle: 'combat_boots',
        hairStyle: 'swept',
        accessory: 'holo_wrist',
        jacketColor: '#2b2435',
        trimColor: '#38bdf8',
        trouserColor: '#0f172a',
        hairColor: '#6b1d3a',
        vfxTrail: 'class_default',
      };
    case OperativeId.RAVEN:
      return {
        jacketStyle: 'tactical_jacket',
        hooded: false,
        gloveStyle: 'fingerless',
        footwearStyle: 'silent_runners',
        hairStyle: 'ponytail',
        accessory: 'scarf',
        jacketColor: '#111827',
        trimColor: '#f43f5e',
        trouserColor: '#0f172a',
        hairColor: '#090d16',
        vfxTrail: 'class_default',
      };
    case OperativeId.GHOST:
    default:
      return {
        jacketStyle: 'tactical_jacket',
        hooded: false,
        gloveStyle: 'fingerless',
        footwearStyle: 'combat_boots',
        hairStyle: 'layered',
        accessory: 'none',
        jacketColor: '#1e293b',
        trimColor: '#67e8f9',
        trouserColor: '#0f172a',
        hairColor: '#090d16',
        vfxTrail: 'class_default',
      };
  }
}

export class CharacterCustomization {
  public static getTrailColor(appearance: OperativeAppearance, fallbackHex: string): string {
    if (appearance.vfxTrail === 'class_default') return fallbackHex;
    const match = VFX_TRAIL_OPTIONS.find((v) => v.id === appearance.vfxTrail);
    return match ? match.hex : fallbackHex;
  }

  public static getAppearanceSignature(op: OperativeId, a: OperativeAppearance): string {
    return [
      op,
      a.jacketStyle,
      a.hooded ? '1' : '0',
      a.gloveStyle,
      a.footwearStyle,
      a.hairStyle,
      a.accessory,
      a.jacketColor,
      a.trimColor,
      a.trouserColor,
      a.hairColor,
    ].join('|');
  }

  public static isJacketUnlocked(style: JacketStyle, unlockedOutfits: string[]): boolean {
    const opt = JACKET_OPTIONS.find((j) => j.id === style);
    if (!opt?.requiresOutfitId) return true;
    return unlockedOutfits.includes(opt.requiresOutfitId);
  }
}
