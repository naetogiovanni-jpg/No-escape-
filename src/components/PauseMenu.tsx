interface PauseMenuProps {
  levelId: number;
  levelName: string;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onExitToMenu: () => void;
}

export function PauseMenu({
  levelId,
  levelName,
  onResume,
  onRestart,
  onOpenSettings,
  onExitToMenu,
}: PauseMenuProps) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0d1524] border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="space-y-1">
          <div className="text-xs text-slate-400">Mission {levelId} Paused</div>
          <h2 className="font-display text-3xl font-bold text-white">{levelName}</h2>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
          >
            Resume Mission
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            Restart Level
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition-colors cursor-pointer"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={onExitToMenu}
            className="w-full py-2.5 px-4 rounded-lg bg-transparent hover:bg-rose-950/50 text-rose-300 font-medium text-sm border border-slate-800 hover:border-rose-500/40 transition-colors cursor-pointer"
          >
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
