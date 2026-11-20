import { SHOP_CATALOG, ShopManager } from '@/src/systems/ShopManager';
import { SaveData, ShopCategory } from '@/src/types/game';
import {
  Check,
  Coins,
  Cpu,
  Lock,
  Palette,
  Radar,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

interface ShopScreenProps {
  save: SaveData;
  onPurchase: (itemId: string) => { success: boolean; message: string };
  onNavigateCustomize: () => void;
  onBack: () => void;
}

const CATEGORY_TABS: Array<{ id: 'all' | ShopCategory; label: string }> = [
  { id: 'all', label: 'All Gear' },
  { id: 'gadgets', label: 'Gadgets' },
  { id: 'upgrades', label: 'Power & Core' },
  { id: 'scanner', label: 'Scanner' },
  { id: 'slots', label: 'Slots & Rig' },
  { id: 'outfits', label: 'Outfits' },
  { id: 'cosmetics', label: 'Visual FX' },
];

const CATEGORY_ICON: Record<ShopCategory, typeof Zap> = {
  gadgets: Zap,
  upgrades: Cpu,
  scanner: Radar,
  slots: Wrench,
  outfits: ShieldCheck,
  cosmetics: Sparkles,
};

export function ShopScreen({
  save,
  onPurchase,
  onNavigateCustomize,
  onBack,
}: ShopScreenProps) {
  const [category, setCategory] = useState<'all' | ShopCategory>('all');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const visibleItems =
    category === 'all'
      ? SHOP_CATALOG
      : SHOP_CATALOG.filter((item) => item.category === category);

  const handleBuy = (itemId: string) => {
    const res = onPurchase(itemId);
    setFeedback({ ok: res.success, text: res.message });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs text-slate-400">
            Black-Market Supply · {save.purchasedShopItems.length} Acquisitions Recorded
          </div>
          <h1 className="font-display text-4xl font-bold text-white">Equipment Shop</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-[#0d1524] border border-amber-500/40 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="text-xs text-slate-400">Shadow Credits</span>
            <span className="font-mono-tabular text-base font-bold text-amber-300">
              {save.shadowCredits.toLocaleString()} SC
            </span>
          </div>

          <button
            type="button"
            onClick={onNavigateCustomize}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-200 text-sm font-medium border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Palette className="w-4 h-4" />
            <span>Customize Operative</span>
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

      {/* Purchase Feedback */}
      {feedback && (
        <div
          className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between ${
            feedback.ok
              ? 'bg-emerald-950/45 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/45 border-rose-500/50 text-rose-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Upgrades Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#0d1524] border border-slate-800/90 rounded-xl p-4 text-xs">
        <div>
          <span className="text-slate-500 block">Pulse Capacitor</span>
          <span className="font-mono-tabular text-cyan-300 font-semibold">
            Tier {save.upgradeLevels.pulseEnergyLevel} / 3
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Stamina Core</span>
          <span className="font-mono-tabular text-amber-300 font-semibold">
            Tier {save.upgradeLevels.staminaCoreLevel} / 3
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Scanner Array</span>
          <span className="font-mono-tabular text-cyan-200 font-semibold">
            Tier {save.upgradeLevels.scannerLevel} / 3
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Extra Rig Slots</span>
          <span className="font-mono-tabular text-sky-300 font-semibold">
            Tier {save.upgradeLevels.extraSlotLevel} / 2
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Cooldown Harness</span>
          <span className="font-mono-tabular text-violet-300 font-semibold">
            Tier {save.upgradeLevels.gadgetBeltLevel} / 3
          </span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-4">
        {CATEGORY_TABS.map((tab) => {
          const active = category === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                active
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-semibold'
                  : 'bg-[#0d1524] border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleItems.map((item) => {
          const tier = ShopManager.getCurrentTier(item, save);
          const maxed = ShopManager.isMaxed(item, save);
          const price = ShopManager.getNextPrice(item, save);
          const check = ShopManager.canPurchase(item, save);
          const Icon = CATEGORY_ICON[item.category];
          const affordable = save.shadowCredits >= price;

          return (
            <div
              key={item.id}
              className={`p-6 rounded-xl border flex flex-col justify-between gap-5 transition-colors ${
                maxed
                  ? 'bg-[#0c1625] border-emerald-500/35'
                  : 'bg-[#0d1524] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono-tabular capitalize">
                    {item.category}
                    {item.maxTier > 1 ? ` · Tier ${tier}/${item.maxTier}` : ''}
                  </span>
                  <Icon className="w-4 h-4" style={{ color: item.accentHex }} />
                </div>

                <h2 className="font-display text-2xl font-bold text-white leading-tight">
                  {item.name}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
              </div>

              <div className="space-y-4 border-t border-slate-800 pt-4">
                <div className="text-xs text-cyan-200/90 font-medium">{item.effectSummary}</div>

                <button
                  type="button"
                  disabled={!check.ok}
                  onClick={() => handleBuy(item.id)}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    maxed
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : affordable
                      ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer'
                      : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {maxed ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{item.maxTier > 1 ? 'Fully Upgraded' : 'Owned & Active'}</span>
                    </>
                  ) : !affordable ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span className="font-mono-tabular">Requires {price} SC</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5" />
                      <span className="font-mono-tabular">
                        {item.maxTier > 1 ? `Upgrade Tier ${tier + 1}` : 'Acquire'} · {price} SC
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
