import { EQUIPMENT_CATALOG, EQUIPMENT_ORDER } from '@/src/data/equipment';
import { EquipmentId, SaveData } from '@/src/types/game';
import { Coins, Cpu, Crosshair, EyeOff, Radar, Radio, ShoppingBag, VolumeX, Zap } from 'lucide-react';

interface EquipmentScreenProps {
  save: SaveData;
  onNavigateShop?: () => void;
  onBack: () => void;
}

const EQUIP_ICONS: Record<EquipmentId, typeof Radar> = {
  [EquipmentId.RECON_SCANNER]: Radar,
  [EquipmentId.ACOUSTIC_DECOY]: Radio,
  [EquipmentId.ACCESS_DEVICE]: Cpu,
  [EquipmentId.SIGNAL_JAMMER]: VolumeX,
  [EquipmentId.PULSE_TOOL]: Zap,
  [EquipmentId.SHADOW_CLOAK]: EyeOff,
  [EquipmentId.PULSE_TAGGER]: Crosshair,
};

export function EquipmentScreen({ save, onNavigateShop, onBack }: EquipmentScreenProps) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs text-slate-400">
            Field Armory · {save.unlockedEquipment.length} of {EQUIPMENT_ORDER.length} Unlocked
          </div>
          <h1 className="font-display text-4xl font-bold text-white">Tactical Equipment</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-lg bg-[#0d1524] border border-amber-500/35 flex items-center gap-2 text-xs">
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="font-mono-tabular font-semibold text-amber-300">
              {save.shadowCredits.toLocaleString()} SC
            </span>
          </div>

          {onNavigateShop && (
            <button
              type="button"
              onClick={onNavigateShop}
              className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Upgrade in Shop</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {EQUIPMENT_ORDER.map((id, idx) => {
          const item = EQUIPMENT_CATALOG[id];
          const unlocked = save.unlockedEquipment.includes(id);
          const Icon = EQUIP_ICONS[id];
          const extraCharges = item.maxCharges > 0 ? save.upgradeLevels.extraSlotLevel : 0;
          const effectiveCooldown = +(
            item.cooldownSec * Math.max(0.55, 1 - save.upgradeLevels.gadgetBeltLevel * 0.12)
          ).toFixed(1);

          return (
            <div
              key={id}
              className={`p-6 rounded-xl border flex flex-col justify-between gap-5 ${
                unlocked
                  ? 'bg-[#0d1524] border-slate-800'
                  : 'bg-[#0a101b] border-slate-800/50 opacity-75'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono-tabular">
                    Slot {idx + 1} · {unlocked ? 'Available' : `Level ${item.unlockLevel} or Shop`}
                  </span>
                  <Icon className="w-5 h-5" style={{ color: unlocked ? item.accentHex : '#475569' }} />
                </div>

                <h2 className="font-display text-2xl font-bold text-white">{item.name}</h2>
                <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
                <div className="text-slate-400">
                  <span className="text-slate-200 font-medium">Field Use:</span> {item.tacticalUse}
                </div>
                <div className="flex items-center justify-between text-slate-400 font-mono-tabular">
                  <span>Cooldown: {effectiveCooldown}s</span>
                  <span>
                    {item.maxCharges < 0
                      ? 'Unlimited'
                      : id === EquipmentId.PULSE_TAGGER
                      ? `${item.maxCharges + save.upgradeLevels.pulseEnergyLevel} Rechargeable Cells`
                      : `${item.maxCharges + extraCharges} Charges`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
