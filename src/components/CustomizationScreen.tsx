import { OPERATIVES } from '@/src/data/characters';
import {
  ACCESSORY_OPTIONS,
  COLOR_SWATCHES,
  CharacterCustomization,
  FOOTWEAR_OPTIONS,
  GLOVE_OPTIONS,
  HAIR_OPTIONS,
  JACKET_OPTIONS,
  VFX_TRAIL_OPTIONS,
} from '@/src/systems/CharacterCustomization';
import { drawOperativeFrame } from '@/src/systems/SpriteFactory';
import { OperativeAppearance, SaveData } from '@/src/types/game';
import { Coins, Lock, RotateCcw, ShoppingBag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CustomizationScreenProps {
  save: SaveData;
  onUpdateAppearance: (partial: Partial<OperativeAppearance>) => void;
  onResetAppearance: () => void;
  onNavigateShop: () => void;
  onBack: () => void;
}

type PreviewAnim = 'idle' | 'walk' | 'sprint' | 'crouch' | 'dodge' | 'takedown';

const PREVIEW_FRAMES: Record<PreviewAnim, number[]> = {
  idle: [0, 1],
  walk: [2, 3, 4, 5],
  sprint: [6, 7, 8, 9],
  crouch: [10, 11],
  dodge: [12],
  takedown: [13],
};

export function CustomizationScreen({
  save,
  onUpdateAppearance,
  onResetAppearance,
  onNavigateShop,
  onBack,
}: CustomizationScreenProps) {
  const [previewAnim, setPreviewAnim] = useState<PreviewAnim>('walk');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameStepRef = useRef(0);
  const appearance = save.appearance;
  const operative = OPERATIVES[save.selectedOperative];

  useEffect(() => {
    const drawFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const frames = PREVIEW_FRAMES[previewAnim];
      const frameIdx = frames[frameStepRef.current % frames.length];

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle tactical floor pad beneath operative
      const trailHex = CharacterCustomization.getTrailColor(appearance, operative.accentColor);
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height * 0.78, 62, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = trailHex;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.scale(4, 4);
      drawOperativeFrame(ctx, 0, 0, save.selectedOperative, frameIdx, appearance);
      ctx.restore();
    };

    drawFrame();
    const timer = window.setInterval(() => {
      frameStepRef.current += 1;
      drawFrame();
    }, previewAnim === 'sprint' ? 115 : 190);

    return () => window.clearInterval(timer);
  }, [appearance, operative.accentColor, previewAnim, save.selectedOperative]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs text-slate-400">
            Operative Loadout · {operative.codename} ({operative.classType} Class)
          </div>
          <h1 className="font-display text-4xl font-bold text-white">Character Customisation</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-lg bg-[#0d1524] border border-amber-500/40 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="font-mono-tabular text-sm font-bold text-amber-300">
              {save.shadowCredits.toLocaleString()} SC
            </span>
          </div>

          <button
            type="button"
            onClick={onNavigateShop}
            className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Equipment Shop</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Left: Live 16-Frame Sprite Sheet Preview */}
        <div className="lg:col-span-4 bg-[#0d1524] border border-slate-800 rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Live Animated Sprite Sheet</div>
              <h2 className="font-display text-2xl font-bold text-white">{operative.codename}</h2>
            </div>
            <button
              type="button"
              onClick={onResetAppearance}
              title="Reset to operative default look"
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Default</span>
            </button>
          </div>

          <div className="relative bg-[#070b14] border border-slate-800/90 rounded-xl h-64 flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              width={192}
              height={192}
              className="w-48 h-48"
              aria-label="Live custom operative sprite preview"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-400">Animation State Preview</div>
            <div className="grid grid-cols-3 gap-2">
              {(['idle', 'walk', 'sprint', 'crouch', 'dodge', 'takedown'] as PreviewAnim[]).map(
                (anim) => (
                  <button
                    key={anim}
                    type="button"
                    onClick={() => setPreviewAnim(anim)}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-medium capitalize border transition-colors cursor-pointer ${
                      previewAnim === anim
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-semibold'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {anim}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Jacket</span>
              <span className="text-slate-200 font-medium">
                {JACKET_OPTIONS.find((j) => j.id === appearance.jacketStyle)?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Hood State</span>
              <span className="text-slate-200 font-medium">
                {appearance.hooded || appearance.jacketStyle === 'hooded_cloak' ? 'Hood Up' : 'Hood Down'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Gloves & Footwear</span>
              <span className="text-slate-200 font-medium">
                {GLOVE_OPTIONS.find((g) => g.id === appearance.gloveStyle)?.label} ·{' '}
                {FOOTWEAR_OPTIONS.find((f) => f.id === appearance.footwearStyle)?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Visual FX Trail</span>
              <span className="text-cyan-300 font-medium">
                {VFX_TRAIL_OPTIONS.find((v) => v.id === appearance.vfxTrail)?.label}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Modular Appearance Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* Jackets & Hooded Outfits */}
          <section className="bg-[#0d1524] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold text-white">
                  Jackets & Outfits
                </h3>
                <p className="text-xs text-slate-400">
                  Full sprite-sheet silhouette updates across idle, sprint, crouch, dodge, and takedown poses.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateAppearance({ hooded: !appearance.hooded })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  appearance.hooded
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {appearance.hooded ? 'Hood: Up' : 'Hood: Down'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {JACKET_OPTIONS.map((opt) => {
                const unlocked = CharacterCustomization.isJacketUnlocked(opt.id, save.unlockedOutfits);
                const selected = appearance.jacketStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onUpdateAppearance({ jacketStyle: opt.id })}
                    className={`text-left p-3.5 rounded-lg border transition-colors ${
                      !unlocked
                        ? 'bg-slate-950/60 border-slate-800/60 text-slate-500 cursor-not-allowed'
                        : selected
                        ? 'bg-cyan-950/50 border-cyan-400 text-white cursor-pointer'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 text-slate-200 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span>{opt.label}</span>
                      {!unlocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {unlocked ? opt.description : 'Unlock in Equipment Shop'}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Gloves & Footwear */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0d1524] border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="font-display text-xl font-semibold text-white">Gloves</h3>
              <div className="grid grid-cols-1 gap-2">
                {GLOVE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateAppearance({ gloveStyle: opt.id })}
                    className={`text-left px-3.5 py-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                      appearance.gloveStyle === opt.id
                        ? 'bg-cyan-950/50 border-cyan-400 text-white'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-slate-400">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0d1524] border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="font-display text-xl font-semibold text-white">Footwear</h3>
              <div className="grid grid-cols-1 gap-2">
                {FOOTWEAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateAppearance({ footwearStyle: opt.id })}
                    className={`text-left px-3.5 py-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                      appearance.footwearStyle === opt.id
                        ? 'bg-cyan-950/50 border-cyan-400 text-white'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-slate-400">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Hairstyles & Accessories */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0d1524] border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="font-display text-xl font-semibold text-white">Hairstyle</h3>
              <div className="grid grid-cols-1 gap-2">
                {HAIR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateAppearance({ hairStyle: opt.id })}
                    className={`text-left px-3.5 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                      appearance.hairStyle === opt.id
                        ? 'bg-cyan-950/50 border-cyan-400 text-white'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-slate-400">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0d1524] border border-slate-800 rounded-xl p-6 space-y-3">
              <h3 className="font-display text-xl font-semibold text-white">Tactical Accessories</h3>
              <div className="grid grid-cols-2 gap-2">
                {ACCESSORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateAppearance({ accessory: opt.id })}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                      appearance.accessory === opt.id
                        ? 'bg-cyan-950/50 border-cyan-400 text-white'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-2">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Color Variations & Visual FX Trails */}
          <section className="bg-[#0d1524] border border-slate-800 rounded-xl p-6 space-y-5">
            <h3 className="font-display text-xl font-semibold text-white">
              Colour Variations & Visual FX
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {(
                [
                  ['Jacket Colour', 'jacketColor', COLOR_SWATCHES.jacket],
                  ['Accent Trim & Visor', 'trimColor', COLOR_SWATCHES.trim],
                  ['Trouser Colour', 'trouserColor', COLOR_SWATCHES.trouser],
                  ['Hair Colour', 'hairColor', COLOR_SWATCHES.hair],
                ] as const
              ).map(([label, key, swatches]) => (
                <div key={key} className="space-y-2">
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {swatches.map((hex) => {
                      const active = appearance[key] === hex;
                      return (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => onUpdateAppearance({ [key]: hex })}
                          title={hex}
                          className={`w-7 h-7 rounded-md border-2 transition-transform cursor-pointer ${
                            active
                              ? 'border-white scale-110'
                              : 'border-slate-700 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: hex }}
                          aria-label={`${label} ${hex}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-2">
              <div className="text-xs text-slate-400">Parkour & Dodge Trail Effect</div>
              <div className="flex flex-wrap gap-2">
                {VFX_TRAIL_OPTIONS.map((opt) => {
                  const unlocked =
                    !opt.requiresShopId || save.purchasedShopItems.includes(opt.requiresShopId);
                  const active = appearance.vfxTrail === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => onUpdateAppearance({ vfxTrail: opt.id })}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors ${
                        !unlocked
                          ? 'bg-slate-950/60 border-slate-800/60 text-slate-500 cursor-not-allowed'
                          : active
                          ? 'bg-cyan-950/50 border-cyan-400 text-white cursor-pointer'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-600 text-slate-300 cursor-pointer'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: opt.hex }}
                      />
                      <span>{opt.label}</span>
                      {!unlocked && <Lock className="w-3 h-3 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
