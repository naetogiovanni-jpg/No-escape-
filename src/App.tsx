import { useEffect, useState } from 'react';
import { BossArchive } from '@/src/components/BossArchive';
import { CharacterSelection } from '@/src/components/CharacterSelection';
import { CustomizationScreen } from '@/src/components/CustomizationScreen';
import { DialogueOverlay } from '@/src/components/DialogueOverlay';
import { EquipmentScreen } from '@/src/components/EquipmentScreen';
import { GameHUD } from '@/src/components/GameHUD';
import { AppScreen, MainMenu } from '@/src/components/MainMenu';
import { MissionArchives } from '@/src/components/MissionArchives';
import { MissionLogs } from '@/src/components/MissionLogs';
import { PauseMenu } from '@/src/components/PauseMenu';
import { ResultsScreen } from '@/src/components/ResultsScreen';
import { SettingsMenu } from '@/src/components/SettingsMenu';
import { ShopScreen } from '@/src/components/ShopScreen';
import { getDialogueForLevel } from '@/src/data/dialogue';
import { PhaserGameHost } from '@/src/game/PhaserGameHost';
import { LevelRegistry } from '@/src/levels/LevelRegistry';
import { AudioSystem } from '@/src/systems/AudioSystem';
import { EventBus, LevelEndPayload } from '@/src/systems/EventBus';
import { SaveSystem } from '@/src/systems/SaveSystem';
import {
  DialogueSequence,
  GameMode,
  GameSettings,
  HudSnapshot,
  OperativeAppearance,
  OperativeId,
  SaveData,
} from '@/src/types/game';
import { Coins } from 'lucide-react';

export default function App() {
  const [save, setSave] = useState<SaveData>(() => SaveSystem.getSave());
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [activeLevelId, setActiveLevelId] = useState<number>(save.unlockedLevel);
  const [activeMode, setActiveMode] = useState<GameMode>(GameMode.CAMPAIGN);
  const [paused, setPaused] = useState(false);
  const [showInGameSettings, setShowInGameSettings] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [levelResult, setLevelResult] = useState<LevelEndPayload | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<DialogueSequence | null>(null);

  useEffect(() => {
    AudioSystem.applySettings(save.settings);
  }, [save.settings]);

  useEffect(() => {
    const unsubHud = EventBus.onHudUpdate((snapshot) => setHud(snapshot));
    const unsubEnd = EventBus.onLevelEnd((payload) => {
      setLevelResult(payload);
      setSave({ ...SaveSystem.getSave() });
    });
    const unsubPause = EventBus.onPauseRequest(() => {
      setPaused((prev) => !prev);
    });
    return () => {
      unsubHud();
      unsubEnd();
      unsubPause();
    };
  }, []);

  const refreshSave = () => setSave({ ...SaveSystem.getSave() });

  const launchLevel = (levelId: number, mode: GameMode) => {
    AudioSystem.ensureUnlocked();
    AudioSystem.playTone('ui');
    setActiveLevelId(levelId);
    setActiveMode(mode);
    setLevelResult(null);
    setPaused(false);
    setShowInGameSettings(false);
    setScreen('playing');

    const dlg = getDialogueForLevel(levelId, 'pre');
    if (dlg) {
      setActiveDialogue(dlg);
      setPaused(true);
    } else {
      setActiveDialogue(null);
    }
    setRestartNonce((n) => n + 1);
  };

  const handleSelectOperative = (id: OperativeId) => {
    AudioSystem.playTone('ui');
    SaveSystem.setOperative(id);
    refreshSave();
  };

  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    const updated = SaveSystem.updateSettings(partial);
    AudioSystem.applySettings(updated);
    refreshSave();
  };

  const handleResetSave = () => {
    SaveSystem.resetSave();
    refreshSave();
  };

  const handleNextLevel = () => {
    if (!levelResult) return;
    if (activeMode === GameMode.BOSS_RUSH) {
      const nextBoss = Math.min(100, Math.ceil((levelResult.levelId + 1) / 10) * 10);
      launchLevel(nextBoss, GameMode.BOSS_RUSH);
      return;
    }
    if (activeMode === GameMode.ENDLESS) {
      const nextRandom = ((levelResult.levelId + 7) % 90) + 1;
      launchLevel(nextRandom, GameMode.ENDLESS);
      return;
    }
    launchLevel(Math.min(100, levelResult.levelId + 1), activeMode);
  };

  const handleExitToMenu = () => {
    AudioSystem.setMood('menu');
    setPaused(false);
    setLevelResult(null);
    setActiveDialogue(null);
    setShowInGameSettings(false);
    setScreen('menu');
    refreshSave();
  };

  const getEndingSummary = (): string | null => {
    if (!levelResult?.victory || levelResult.levelId !== 100) return null;
    const choice = save.storyDecisions['ending_choice'];
    if (choice?.includes('Expose')) {
      return 'Ending — Broken Silence: You broadcast the Citadel ledger worldwide. THE VEIL fractures into sunlight, and you vanish into history. New Game Plus and Secret Encounters are now unlocked.';
    }
    if (choice?.includes('Seize')) {
      return 'Ending — Sovereign Shadow: You assume command of THE VEIL’s hidden relays from the top floor. New Game Plus and Secret Encounters are now unlocked.';
    }
    return 'Ending — The Art of Disappearing: You purge every record of Shadow Protocol and walk away without a single trace. New Game Plus and Secret Encounters are now unlocked.';
  };

  const currentLevelObj = LevelRegistry.getLevel(activeLevelId);

  if (screen === 'playing') {
    return (
      <div className="fixed inset-0 bg-[#060a12] overflow-hidden">
        <PhaserGameHost
          launchData={{
            levelId: activeLevelId,
            mode: activeMode,
            operativeId: save.selectedOperative,
            newGamePlus: save.newGamePlusActive,
          }}
          paused={paused || Boolean(levelResult) || Boolean(activeDialogue)}
          restartNonce={restartNonce}
        />

        <GameHUD
          hud={hud}
          muted={save.settings.muted}
          showTouchMode={save.settings.showTouchControls}
          onToggleMute={() => handleUpdateSettings({ muted: !save.settings.muted })}
          onToggleTouchControls={() => {
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const currentlyShown =
              save.settings.showTouchControls === 'always' ||
              (save.settings.showTouchControls === 'auto' && isTouch);
            handleUpdateSettings({
              showTouchControls: currentlyShown ? 'off' : 'always',
            });
          }}
          onPause={() => setPaused(true)}
        />

        {activeDialogue && (
          <DialogueOverlay
            sequence={activeDialogue}
            onChoiceMade={(key, label, trustDelta) => {
              SaveSystem.recordStoryDecision(key, label, trustDelta);
              refreshSave();
            }}
            onComplete={() => {
              setActiveDialogue(null);
              setPaused(false);
            }}
          />
        )}

        {paused && !levelResult && !activeDialogue && !showInGameSettings && (
          <PauseMenu
            levelId={activeLevelId}
            levelName={currentLevelObj.name}
            onResume={() => setPaused(false)}
            onRestart={() => {
              setPaused(false);
              setRestartNonce((n) => n + 1);
            }}
            onOpenSettings={() => setShowInGameSettings(true)}
            onExitToMenu={handleExitToMenu}
          />
        )}

        {showInGameSettings && (
          <div className="fixed inset-0 z-50 bg-slate-950/95 overflow-y-auto">
            <SettingsMenu
              settings={save.settings}
              onUpdateSettings={handleUpdateSettings}
              onResetSave={handleResetSave}
              onBack={() => setShowInGameSettings(false)}
            />
          </div>
        )}

        {levelResult && (
          <ResultsScreen
            result={levelResult}
            mode={activeMode}
            endingSummary={getEndingSummary()}
            onReplay={() => launchLevel(activeLevelId, activeMode)}
            onNextLevel={handleNextLevel}
            onMainMenu={handleExitToMenu}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d17] text-slate-100 flex flex-col">
      {/* Three-Zone Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#080d17]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setScreen('menu')}
            className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer hover:text-cyan-200 transition-colors"
          >
            No Escape: Operation A
          </button>

          <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => setScreen('missions')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'missions' ? 'text-cyan-300' : ''
              }`}
            >
              Missions
            </button>
            <button
              type="button"
              onClick={() => setScreen('characters')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'characters' ? 'text-cyan-300' : ''
              }`}
            >
              Operatives
            </button>
            <button
              type="button"
              onClick={() => setScreen('customize')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'customize' ? 'text-cyan-300' : ''
              }`}
            >
              Customize
            </button>
            <button
              type="button"
              onClick={() => setScreen('shop')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'shop' ? 'text-cyan-300' : ''
              }`}
            >
              Shop
            </button>
            <button
              type="button"
              onClick={() => setScreen('equipment')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'equipment' ? 'text-cyan-300' : ''
              }`}
            >
              Armory
            </button>
            <button
              type="button"
              onClick={() => setScreen('bosses')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'bosses' ? 'text-cyan-300' : ''
              }`}
            >
              Bosses
            </button>
            <button
              type="button"
              onClick={() => setScreen('logs')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'logs' ? 'text-cyan-300' : ''
              }`}
            >
              Logs
            </button>
            <button
              type="button"
              onClick={() => setScreen('settings')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                screen === 'settings' ? 'text-cyan-300' : ''
              }`}
            >
              Settings
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setScreen('shop')}
              title="Open Equipment Shop"
              className="px-3 py-1.5 rounded-lg bg-[#0d1524] border border-amber-500/35 hover:border-amber-400/60 text-amber-300 text-xs font-mono-tabular font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{save.shadowCredits.toLocaleString()} SC</span>
            </button>
            <button
              type="button"
              onClick={() =>
                launchLevel(
                  save.unlockedLevel,
                  save.newGamePlusActive ? GameMode.NEW_GAME_PLUS : GameMode.CAMPAIGN
                )
              }
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Play Mission {save.unlockedLevel}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Strip */}
      <div className="md:hidden border-b border-slate-800 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-300">
        {(['menu', 'missions', 'characters', 'customize', 'shop', 'equipment', 'bosses', 'logs', 'settings'] as AppScreen[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScreen(s)}
            className={`capitalize whitespace-nowrap shrink-0 ${screen === s ? 'text-cyan-300' : ''}`}
          >
            {s === 'menu' ? 'Overview' : s === 'equipment' ? 'Armory' : s}
          </button>
        ))}
      </div>

      {screen === 'menu' && (
        <MainMenu
          save={save}
          activeScreen={screen}
          onNavigate={setScreen}
          onLaunchLevel={launchLevel}
          onToggleNewGamePlus={(active) => {
            SaveSystem.setNewGamePlusActive(active);
            refreshSave();
          }}
        />
      )}

      {screen === 'characters' && (
        <CharacterSelection
          selectedOperative={save.selectedOperative}
          shadowCredits={save.shadowCredits}
          onSelectOperative={handleSelectOperative}
          onCustomize={() => setScreen('customize')}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'customize' && (
        <CustomizationScreen
          save={save}
          onUpdateAppearance={(partial: Partial<OperativeAppearance>) => {
            AudioSystem.playTone('ui');
            SaveSystem.updateAppearance(partial);
            refreshSave();
          }}
          onResetAppearance={() => {
            AudioSystem.playTone('ui');
            SaveSystem.resetAppearance(save.selectedOperative);
            refreshSave();
          }}
          onNavigateShop={() => setScreen('shop')}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'shop' && (
        <ShopScreen
          save={save}
          onPurchase={(itemId) => {
            const res = SaveSystem.purchaseShopItem(itemId);
            if (res.success) {
              AudioSystem.playTone('purchase');
              refreshSave();
            } else {
              AudioSystem.playTone('alert');
            }
            return res;
          }}
          onNavigateCustomize={() => setScreen('customize')}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'equipment' && (
        <EquipmentScreen
          save={save}
          onNavigateShop={() => setScreen('shop')}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'missions' && (
        <MissionArchives
          save={save}
          onLaunchLevel={launchLevel}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'bosses' && (
        <BossArchive
          save={save}
          onLaunchLevel={launchLevel}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'logs' && (
        <MissionLogs
          save={save}
          onLaunchLevel={launchLevel}
          onClearLogs={() => {
            SaveSystem.clearMissionLogs();
            refreshSave();
          }}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'settings' && (
        <SettingsMenu
          settings={save.settings}
          onUpdateSettings={handleUpdateSettings}
          onResetSave={handleResetSave}
          onBack={() => setScreen('menu')}
        />
      )}
    </div>
  );
}
