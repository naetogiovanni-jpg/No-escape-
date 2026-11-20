import { GameSettings } from '@/src/types/game';
import { useState } from 'react';

interface SettingsMenuProps {
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onResetSave: () => void;
  onBack: () => void;
}

export function SettingsMenu({
  settings,
  onUpdateSettings,
  onResetSave,
  onBack,
}: SettingsMenuProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs text-slate-400">Audio, Controls & Storage</div>
          <h1 className="font-display text-4xl font-bold text-white">Settings</h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium border border-slate-700 transition-colors cursor-pointer"
        >
          Back
        </button>
      </div>

      <section className="p-6 rounded-xl bg-[#0d1524] border border-slate-800 space-y-6">
        <h2 className="font-display text-2xl font-semibold text-white">Audio Mix</h2>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <div className="flex justify-between text-sm text-slate-200">
              <span>Master Volume</span>
              <span className="font-mono-tabular">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) => onUpdateSettings({ masterVolume: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </label>

          <label className="block space-y-1.5">
            <div className="flex justify-between text-sm text-slate-200">
              <span>Dynamic Music Volume</span>
              <span className="font-mono-tabular">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              onChange={(e) => onUpdateSettings({ musicVolume: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </label>

          <label className="block space-y-1.5">
            <div className="flex justify-between text-sm text-slate-200">
              <span>Sound Effects Volume</span>
              <span className="font-mono-tabular">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              onChange={(e) => onUpdateSettings({ sfxVolume: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </label>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-slate-200">Mute All Audio</span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ muted: !settings.muted })}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                settings.muted
                  ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {settings.muted ? 'Muted' : 'Active'}
            </button>
          </div>
        </div>
      </section>

      <section className="p-6 rounded-xl bg-[#0d1524] border border-slate-800 space-y-5">
        <h2 className="font-display text-2xl font-semibold text-white">Controls & Accessibility</h2>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-200">Classic Joystick & Action Pad</div>
            <div className="text-xs text-slate-400">Display the 360° analog joystick and parkour buttons on PC or mobile.</div>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            {(['auto', 'always', 'off'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onUpdateSettings({ showTouchControls: mode })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                  settings.showTouchControls === mode
                    ? 'bg-cyan-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-200">Reduced Motion</div>
            <div className="text-xs text-slate-400">Minimize UI motion transitions.</div>
          </div>
          <button
            type="button"
            onClick={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              settings.reducedMotion
                ? 'bg-cyan-400/20 border-cyan-400 text-cyan-200'
                : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            {settings.reducedMotion ? 'On' : 'Off'}
          </button>
        </div>
      </section>

      <section className="p-6 rounded-xl bg-[#0d1524] border border-rose-900/40 space-y-4">
        <h2 className="font-display text-2xl font-semibold text-white">Save Data</h2>
        <p className="text-sm text-slate-400">
          Progress is saved automatically in your browser. Resetting clears unlocked missions, equipment, and boss records.
        </p>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="px-4 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border border-rose-500/40 text-xs font-semibold transition-colors cursor-pointer"
          >
            Reset Save Progress
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onResetSave();
                setConfirmReset(false);
              }}
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
            >
              Confirm Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
