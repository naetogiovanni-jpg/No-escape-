import heroKeyArt from '@/src/assets/images/shadow_protocol_key_art_1794569278940.jpg';
import { CHAPTERS } from '@/src/data/chapters';
import { OPERATIVES } from '@/src/data/characters';
import { GameMode, SaveData } from '@/src/types/game';
import { Play, Shield, Sword, Timer, EyeOff, Infinity as InfinityIcon, Sparkles, Compass, ShoppingBag, Palette } from 'lucide-react';

export type AppScreen =
  | 'menu'
  | 'playing'
  | 'characters'
  | 'equipment'
  | 'shop'
  | 'customize'
  | 'missions'
  | 'bosses'
  | 'logs'
  | 'settings';

interface MainMenuProps {
  save: SaveData;
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onLaunchLevel: (levelId: number, mode: GameMode) => void;
  onToggleNewGamePlus: (active: boolean) => void;
}

const MODE_CARDS: Array<{
  mode: GameMode;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Play;
}> = [
  {
    mode: GameMode.CAMPAIGN,
    title: 'Campaign',
    subtitle: '100 Missions · 10 Chapters',
    description: 'Experience the full story of THE VEIL from Helix-9 to the Citadel Core.',
    icon: Compass,
  },
  {
    mode: GameMode.GHOST_PROTOCOL,
    title: 'Ghost Protocol',
    subtitle: 'Zero Alarms Permitted',
    description: 'Any camera or patrol alert ends the infiltration immediately.',
    icon: EyeOff,
  },
  {
    mode: GameMode.BOSS_RUSH,
    title: 'Boss Rush',
    subtitle: '10 Guardians + 3 Secret',
    description: 'Engage unlocked chapter bosses back-to-back with full tactical gear.',
    icon: Sword,
  },
  {
    mode: GameMode.TIME_TRIAL,
    title: 'Time Trial',
    subtitle: 'Speed Infiltration',
    description: 'Race the extraction clock across key campaign compounds.',
    icon: Timer,
  },
  {
    mode: GameMode.CHALLENGE,
    title: 'Challenge Mode',
    subtitle: 'Heightened Security',
    description: 'Faster patrol reactions and tighter sightlines for veteran operatives.',
    icon: Shield,
  },
  {
    mode: GameMode.ENDLESS,
    title: 'Endless Infiltration',
    subtitle: 'Continuous Sectors',
    description: 'Advance automatically through escalating infiltration layouts.',
    icon: InfinityIcon,
  },
];

export function MainMenu({
  save,
  onNavigate,
  onLaunchLevel,
  onToggleNewGamePlus,
}: MainMenuProps) {
  const currentLevel = save.unlockedLevel;
  const currentChapter = CHAPTERS[Math.ceil(currentLevel / 10) - 1] ?? CHAPTERS[0];
  const currentOperative = OPERATIVES[save.selectedOperative];
  const clearedCount = Object.values(save.levelRecords).filter((r) => r.completed).length;
  const ghostCount = Object.values(save.levelRecords).filter((r) => r.ghostProtocolCleared).length;

  const handleModeStart = (mode: GameMode) => {
    if (mode === GameMode.BOSS_RUSH) {
      onLaunchLevel(10, GameMode.BOSS_RUSH);
    } else if (mode === GameMode.ENDLESS) {
      onLaunchLevel(Math.max(1, (clearedCount % 90) + 1), GameMode.ENDLESS);
    } else if (mode === GameMode.TIME_TRIAL) {
      onLaunchLevel(Math.min(currentLevel, 9), GameMode.TIME_TRIAL);
    } else {
      onLaunchLevel(currentLevel, mode);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d17] text-slate-100 flex flex-col">
      {/* Hero Banner Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-10">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch border border-slate-800/80 bg-[#0d1524] rounded-xl overflow-hidden">
          <div className="lg:col-span-5 p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-cyan-300/90 font-medium tracking-wide">
                <span>Chapter {currentChapter.id}</span>
                <span aria-hidden="true">·</span>
                <span>{currentChapter.location}</span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-white leading-[0.95] text-balance">
                No Escape: Operation A
              </h1>
              <p className="text-slate-300 text-base leading-relaxed max-w-md">
                Momentum-driven infiltration and tactical parkour across 100 missions. Vault barriers, power-slide past sightlines, and breach THE VEIL as Skill, Tank, or Technical operatives.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-400 font-mono-tabular">
                <div>
                  <span className="text-slate-500 block">Operative</span>
                  <span className="text-slate-100 font-medium">
                    {currentOperative.codename} · {currentOperative.classType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Next Mission</span>
                  <span className="text-cyan-300 font-medium">Level {currentLevel} / 100</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Shadow Credits</span>
                  <span className="text-amber-300 font-semibold">
                    {save.shadowCredits.toLocaleString()} SC
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ghost Clears</span>
                  <span className="text-emerald-300 font-medium">{ghostCount}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onLaunchLevel(currentLevel, save.newGamePlusActive ? GameMode.NEW_GAME_PLUS : GameMode.CAMPAIGN)}
                className="px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm rounded-lg transition-all duration-200 ease-out active:scale-[0.98] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{currentLevel > 1 ? `Continue Mission ${currentLevel}` : 'Start Campaign'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="px-4 py-3 bg-slate-800/80 hover:bg-slate-700 text-amber-300 font-medium text-sm rounded-lg border border-amber-500/35 transition-all duration-200 ease-out active:scale-[0.98] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Equipment Shop</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('customize')}
                className="px-4 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-medium text-sm rounded-lg border border-slate-700 transition-all duration-200 ease-out active:scale-[0.98] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Palette className="w-4 h-4" />
                <span>Customize</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('missions')}
                className="px-4 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-medium text-sm rounded-lg border border-slate-700 transition-all duration-200 ease-out active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Mission Archives
              </button>

              {save.newGamePlusUnlocked && (
                <button
                  type="button"
                  onClick={() => onToggleNewGamePlus(!save.newGamePlusActive)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg border transition-all duration-200 ease-out flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    save.newGamePlusActive
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>New Game Plus: {save.newGamePlusActive ? 'On' : 'Off'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 relative min-h-[280px] lg:min-h-[380px] bg-slate-900">
            <img
              src={heroKeyArt}
              alt="The Ghost operative inside an abandoned facility corridor"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d1524] via-transparent to-transparent lg:via-[#0d1524]/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1524]/80 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between text-xs text-slate-300">
              <span>{clearedCount} of 100 Campaign Missions Cleared</span>
              <span>{save.unlockedEquipment.length} of 7 Field Gadgets Unlocked</span>
            </div>
          </div>
        </section>

        {/* Game Modes Grid */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
              Game Modes
            </h2>
            <span className="text-xs text-slate-400">Select an infiltration format to deploy immediately</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.mode}
                  type="button"
                  onClick={() => handleModeStart(card.mode)}
                  className="text-left p-5 rounded-xl bg-[#0e1726] hover:bg-[#132036] border border-slate-800 hover:border-cyan-400/50 transition-all duration-200 ease-out hover:-translate-y-0.5 flex flex-col justify-between gap-4 cursor-pointer group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">{card.subtitle}</span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-300 transition-colors" />
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-white group-hover:text-cyan-200 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                  <div className="text-xs font-medium text-cyan-300">
                    Deploy Mode →
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick Controls Guide */}
        <section className="border-t border-slate-800/80 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold text-slate-100">Momentum & Parkour</h3>
            <p className="text-slate-400 leading-relaxed">
              WASD, Arrows, or Classic On-Screen Joystick · Shift to sprint with stamina · Ctrl or C to crouch or Power Slide · Space to Dodge, Vault, or Wall-Kick.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold text-slate-100">Stealth Combat & Gadgets</h3>
            <p className="text-slate-400 leading-relaxed">
              Press E behind unaware guards for a non-lethal takedown, or hack terminals & enter vents · Left-Click or F deploys your selected gadget (including Pulse Tagger).
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold text-slate-100">Progression & Economy</h3>
            <p className="text-slate-400 leading-relaxed">
              Earn Shadow Credits for clearances, A/S ranks, secret rooms, and hidden dossiers · Keys 1–7 or Q cycle equipment · Toggle touch controls anytime in HUD.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
