import { OPERATIVES } from '@/src/data/characters';
import { EQUIPMENT_CATALOG } from '@/src/data/equipment';
import { EventBus } from '@/src/systems/EventBus';
import { AwarenessState, EquipmentId, HudSnapshot } from '@/src/types/game';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Eye,
  EyeOff,
  FileText,
  Gamepad2,
  KeyRound,
  LogOut,
  Pause,
  Radio,
  Terminal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface GameHUDProps {
  hud: HudSnapshot | null;
  muted: boolean;
  showTouchMode: 'auto' | 'always' | 'off';
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onPause: () => void;
}

export function GameHUD({
  hud,
  muted,
  showTouchMode,
  onToggleMute,
  onToggleTouchControls,
  onPause,
}: GameHUDProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [sprintHeld, setSprintHeld] = useState(false);
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  const [cleanHud, setCleanHud] = useState(false);
  const stickBaseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  useEffect(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setObjectivesOpen((prev) => !prev);
      } else if (e.key === 'h' || e.key === 'H') {
        setCleanHud((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!hud) return null;

  const op = OPERATIVES[hud.operativeId];
  const showControls =
    showTouchMode === 'always' || (showTouchMode === 'auto' && isTouchDevice);

  const completedRequired = hud.objectives.filter((o) => !o.optional && o.completed).length;
  const totalRequired = hud.objectives.filter((o) => !o.optional).length;

  const awarenessStyle: Record<AwarenessState, { text: string; color: string; bg: string }> = {
    [AwarenessState.UNAWARE]: { text: 'Clear', color: 'text-emerald-300', bg: 'border-emerald-500/30 bg-[#0a111e]/60' },
    [AwarenessState.CURIOUS]: { text: 'Curious', color: 'text-amber-200', bg: 'border-amber-500/40 bg-amber-950/50' },
    [AwarenessState.SUSPICIOUS]: { text: 'Suspicious', color: 'text-amber-300', bg: 'border-amber-400/50 bg-amber-950/65' },
    [AwarenessState.INVESTIGATING]: { text: 'Searching', color: 'text-orange-300', bg: 'border-orange-400/60 bg-orange-950/70' },
    [AwarenessState.ALERTED]: { text: 'Alerted', color: 'text-rose-300', bg: 'border-rose-500/75 bg-rose-950/75' },
    [AwarenessState.DISABLED]: { text: 'Neutralized', color: 'text-cyan-300', bg: 'border-cyan-500/45 bg-cyan-950/55' },
    [AwarenessState.RECOVERING]: { text: 'Recovering', color: 'text-amber-200', bg: 'border-amber-500/45 bg-amber-950/55' },
  };
  const aw = awarenessStyle[hud.awareness];
  const pulseTaggerUnlocked = hud.equipmentSlots.some(
    (s) => s.id === EquipmentId.PULSE_TAGGER && s.unlocked
  );
  const visPct = Math.max(0, Math.min(100, hud.visibilityPct));
  const visBarColor =
    hud.visibilityState === 'Lit'
      ? 'bg-rose-500 animate-pulse'
      : hud.visibilityState === 'Exposed'
      ? 'bg-amber-400'
      : hud.visibilityState === 'Cover'
      ? 'bg-cyan-400'
      : 'bg-emerald-400';
  const visTextColor =
    hud.visibilityState === 'Lit'
      ? 'text-rose-300'
      : hud.visibilityState === 'Exposed'
      ? 'text-amber-300'
      : hud.visibilityState === 'Cover'
      ? 'text-cyan-300'
      : 'text-emerald-300';

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = stickBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = rect.width * 0.36;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setStickOffset({ x: dx, y: dy });
    EventBus.setVirtualInput({
      moveX: Math.abs(dx) < 4 ? 0 : dx / maxRadius,
      moveY: Math.abs(dy) < 4 ? 0 : dy / maxRadius,
    });
  };

  const resetJoystick = () => {
    activePointerId.current = null;
    setStickOffset({ x: 0, y: 0 });
    EventBus.setVirtualInput({ moveX: 0, moveY: 0 });
  };

  const renderObjectiveIcon = (
    kind: HudSnapshot['objectiveMarkers'][number]['kind'],
    completed: boolean
  ) => {
    if (completed) return <Check className="w-3 h-3 text-emerald-300 shrink-0" />;
    switch (kind) {
      case 'intel':
        return <FileText className="w-3 h-3 shrink-0" />;
      case 'terminal':
        return <Terminal className="w-3 h-3 shrink-0" />;
      case 'boss':
        return <Crosshair className="w-3 h-3 shrink-0" />;
      case 'keycard':
        return <KeyRound className="w-3 h-3 shrink-0" />;
      case 'extract':
        return <LogOut className="w-3 h-3 shrink-0" />;
    }
  };

  const edgeMarkers = !cleanHud ? hud.objectiveMarkers.filter((m) => m.screenEdge) : [];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-3.5">
      {/* Off-Screen Viewport Perimeter Objective Indicators */}
      {edgeMarkers.map((m) => {
        const rad = (m.angleDeg * Math.PI) / 180;
        const leftPct = Math.max(8, Math.min(92, 50 + Math.cos(rad) * 43));
        const topPct = Math.max(16, Math.min(80, 50 + Math.sin(rad) * 35));
        const edgeStyle = m.isPrimaryTarget
          ? m.kind === 'extract'
            ? 'border-emerald-400/75 bg-emerald-950/75 text-emerald-200'
            : m.kind === 'boss'
            ? 'border-rose-400/80 bg-rose-950/75 text-rose-200'
            : 'border-cyan-400/75 bg-[#0a111e]/80 text-cyan-200'
          : 'border-slate-600/65 bg-[#0a111e]/65 text-slate-300';

        return (
          <div
            key={`edge-${m.id}`}
            className={`pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-md border backdrop-blur-sm flex items-center gap-1 text-[10px] font-medium shadow-md transition-all duration-150 ${edgeStyle}`}
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          >
            {renderObjectiveIcon(m.kind, false)}
            <span className="font-mono-tabular">{m.distanceMeters}m</span>
            <ArrowRight
              className="w-3 h-3 shrink-0"
              style={{ transform: `rotate(${m.angleDeg}deg)` }}
            />
          </div>
        );
      })}

      {/* Top Bar HUD — Compact & Translucent */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Slim Operative Vitals */}
        <div
          className={`pointer-events-auto flex items-center gap-2.5 bg-[#0a111e]/65 backdrop-blur-sm border border-slate-800/80 rounded-lg transition-all duration-200 ${
            cleanHud ? 'px-2.5 py-1.5' : 'px-2.5 py-2'
          }`}
        >
          {!cleanHud && (
            <img
              src={op.portraitUrl}
              alt={op.codename}
              referrerPolicy="no-referrer"
              className="hidden sm:block w-8 h-8 rounded-md object-cover border border-slate-700/80 shrink-0"
            />
          )}
          <div className={cleanHud ? 'w-28 space-y-1' : 'w-40 sm:w-48 space-y-1.5'}>
            <div className="flex items-center justify-between text-[11px] gap-2 leading-none">
              <span className="font-semibold text-white truncate">
                {op.codename}
                {!cleanHud && <span className="text-cyan-300 font-normal"> · {hud.operativeClass}</span>}
              </span>
              <span className="font-mono-tabular text-slate-300 shrink-0">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>

            <div className="h-1.5 w-full bg-slate-800/90 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-150 ease-out"
                style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
              />
            </div>

            {!cleanHud && (
              <div className="grid grid-cols-2 gap-1.5">
                <div
                  className={`h-1.5 bg-slate-800/90 rounded-full overflow-hidden border ${
                    hud.staminaRecovering ? 'border-rose-400/70' : 'border-transparent'
                  }`}
                  title={
                    hud.staminaRecovering
                      ? `Stamina Recovering (${Math.round(hud.stamina)}/${hud.maxStamina})`
                      : `Stamina ${Math.round(hud.stamina)}/${hud.maxStamina}`
                  }
                >
                  <div
                    className={`h-full transition-all duration-100 ease-out ${
                      hud.staminaRecovering ? 'bg-rose-400 animate-pulse' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.max(0, (hud.stamina / hud.maxStamina) * 100)}%` }}
                  />
                </div>
                <div className="h-1.5 bg-slate-800/90 rounded-full overflow-hidden" title={`Momentum ${hud.momentumPct}%`}>
                  <div
                    className="h-full bg-amber-400 transition-all duration-100 ease-out"
                    style={{ width: `${hud.momentumPct}%` }}
                  />
                </div>
              </div>
            )}

            {!cleanHud && pulseTaggerUnlocked && (
              <div
                className="flex items-center justify-between gap-2 text-[10px] text-slate-400 pt-0.5"
                title="Pulse Tagger Rechargeable Energy (LMB / F)"
              >
                <span className="text-cyan-300 font-medium shrink-0">Pulse Cell</span>
                <div className="flex-1 h-1 bg-slate-800/90 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-300 transition-all duration-150"
                    style={{
                      width: `${Math.min(
                        100,
                        ((hud.pulseTaggerEnergy.current + hud.pulseTaggerEnergy.rechargePct) /
                          Math.max(1, hud.pulseTaggerEnergy.max)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <span className="font-mono-tabular text-cyan-200 shrink-0">
                  {hud.pulseTaggerEnergy.current}/{hud.pulseTaggerEnergy.max}
                </span>
              </div>
            )}

            {/* Dynamic Stealth Visibility Gauge */}
            <div className="space-y-0.5 pt-0.5" title={`Visibility ${visPct}% (${hud.visibilityState})`}>
              {!cleanHud && (
                <div className="flex items-center justify-between text-[10px] leading-none">
                  <span className="flex items-center gap-1 text-slate-400">
                    {visPct <= 15 ? (
                      <EyeOff className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Eye className={`w-2.5 h-2.5 ${visTextColor}`} />
                    )}
                    <span>Visibility</span>
                  </span>
                  <span className={`font-mono-tabular font-medium ${visTextColor}`}>
                    {visPct}% · {hud.visibilityState}
                  </span>
                </div>
              )}
              <div
                className={`h-1.5 w-full bg-slate-800/90 rounded-full overflow-hidden border ${
                  hud.visibilityState === 'Lit' ? 'border-rose-500/60' : 'border-transparent'
                }`}
              >
                <div
                  className={`h-full transition-all duration-100 ease-out ${visBarColor}`}
                  style={{ width: `${visPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top-Center: Active Waypoint Directive + Minimal Status Strip + Boss Bar */}
        <div className="flex flex-col items-center gap-1.5 min-w-0 max-w-[54vw] sm:max-w-md">
          {hud.activeDirective && (
            <div
              className={`px-2.5 py-1.5 rounded-lg border backdrop-blur-sm flex items-center gap-2 text-xs shadow-md transition-colors duration-200 max-w-full ${
                hud.activeDirective.urgent
                  ? 'border-rose-500/75 bg-rose-950/80 text-rose-100'
                  : 'border-cyan-400/45 bg-[#0a111e]/80 text-slate-100'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                  hud.activeDirective.urgent
                    ? 'border-rose-400/70 bg-rose-500/20 text-rose-200'
                    : 'border-cyan-400/60 bg-cyan-400/15 text-cyan-300'
                }`}
                title={`Head ${hud.activeDirective.distanceMeters}m toward ${hud.activeDirective.targetLabel}`}
              >
                <ArrowRight
                  className="w-3.5 h-3.5 transition-transform duration-100"
                  style={{ transform: `rotate(${hud.activeDirective.angleDeg}deg)` }}
                />
              </span>
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="font-mono-tabular text-[11px] font-semibold text-cyan-300 shrink-0">
                  {hud.activeDirective.distanceMeters}m
                </span>
                <span className="text-slate-500 shrink-0">·</span>
                <span className="font-medium truncate">
                  {hud.activeDirective.instruction}
                </span>
              </div>
            </div>
          )}

          {!cleanHud && hud.objectiveMarkers.length > 0 && (
            <button
              type="button"
              onClick={() => setObjectivesOpen((prev) => !prev)}
              title="Objective Indicators (Click or press Tab for details)"
              className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 cursor-pointer"
            >
              {hud.objectiveMarkers.map((m) => (
                <div
                  key={m.id}
                  className={`px-2 py-1 rounded-md border backdrop-blur-sm flex items-center gap-1.5 text-[10px] font-medium transition-colors ${
                    m.completed
                      ? 'border-emerald-500/45 bg-emerald-950/55 text-emerald-300'
                      : m.isPrimaryTarget
                      ? m.kind === 'extract'
                        ? 'border-emerald-400/70 bg-emerald-950/70 text-emerald-200'
                        : m.kind === 'boss'
                        ? 'border-rose-400/70 bg-rose-950/75 text-rose-200'
                        : 'border-cyan-400/65 bg-cyan-950/65 text-cyan-100'
                      : m.optional
                      ? 'border-slate-700/60 bg-[#0a111e]/55 text-slate-400'
                      : 'border-slate-700/80 bg-[#0a111e]/70 text-slate-200'
                  }`}
                >
                  {renderObjectiveIcon(m.kind, m.completed)}
                  <span>{m.label}</span>
                  {!m.completed && m.target > 1 && (
                    <span className="font-mono-tabular opacity-90">
                      {m.current}/{m.target}
                    </span>
                  )}
                  {!m.completed && (
                    <span className="flex items-center gap-0.5 font-mono-tabular opacity-90">
                      <ArrowRight
                        className="w-2.5 h-2.5"
                        style={{ transform: `rotate(${m.angleDeg}deg)` }}
                      />
                      {m.distanceMeters}m
                    </span>
                  )}
                </div>
              ))}
            </button>
          )}

          {!cleanHud && (
            <div
              className={`px-3 py-1 rounded-lg border text-[11px] font-medium flex flex-wrap items-center justify-center gap-1.5 backdrop-blur-sm transition-colors duration-200 ${aw.bg}`}
            >
              <span className={aw.color}>{aw.text}</span>
              {hud.maxSuspicion > 0 && hud.awareness !== AwarenessState.ALERTED && (
                <span className="font-mono-tabular text-slate-200">{hud.maxSuspicion}%</span>
              )}
              <span className="text-slate-500">·</span>
              <span className="text-slate-300 font-mono-tabular">
                {String(Math.floor(hud.elapsedSec / 60)).padStart(2, '0')}:
                {String(hud.elapsedSec % 60).padStart(2, '0')}
              </span>
              {hud.parkourChain > 1 && (
                <span className="text-amber-300 font-mono-tabular">· x{hud.parkourChain}</span>
              )}
              {hud.tacticalStatus.coordinatingCount > 0 && (
                <span className="text-violet-300 flex items-center gap-1">
                  · <Radio className="w-3 h-3 animate-pulse" /> Trap Sync
                </span>
              )}
              {hud.tacticalStatus.activeTrapCount > 0 && hud.tacticalStatus.coordinatingCount === 0 && (
                <span className="text-amber-300 font-mono-tabular">
                  · Traps {hud.tacticalStatus.activeTrapCount}
                </span>
              )}
              {hud.isVaulting && <span className="text-cyan-300">· Vault</span>}
              {hud.isSliding && <span className="text-amber-300">· Slide</span>}
              {hud.isHiding && <span className="text-cyan-300">· Hidden</span>}
              {hud.isCloaked && <span className="text-rose-300">· Cloak</span>}
              {hud.isDisguised && <span className="text-amber-300">· Disguise</span>}
            </div>
          )}

          {hud.escapeActive && hud.escapeTimeRemainingSec !== null && (
            <div className="px-3 py-1 rounded-lg bg-rose-950/85 border border-rose-500 text-rose-200 font-mono-tabular text-xs font-semibold">
              Extract: {hud.escapeTimeRemainingSec}s
            </div>
          )}

          {hud.bossState && hud.bossState.active && (
            <div className="w-[240px] sm:w-[360px] bg-[#0a111e]/75 border border-rose-500/40 rounded-lg px-3 py-1.5 space-y-1 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-white truncate">
                  {hud.bossState.name} · P{hud.bossState.phase}/3
                </span>
                <span className="font-mono-tabular text-rose-300 shrink-0">
                  {hud.bossState.shielded ? 'SHIELD · ' : ''}
                  {hud.bossState.resolve}/{hud.bossState.maxResolve}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-150"
                  style={{ width: `${(hud.bossState.resolve / hud.bossState.maxResolve) * 100}%` }}
                />
              </div>
              {hud.bossState.bannerText && !cleanHud && (
                <p className="text-[11px] text-slate-300 italic truncate">{hud.bossState.bannerText}</p>
              )}
            </div>
          )}

          {(hud.toastMessage || hud.tacticalStatus.callout) && (
            <div
              className={`px-3 py-1 rounded-lg border text-[11px] font-medium shadow-md ${
                hud.toastMessage
                  ? 'bg-[#0d1628]/80 border-cyan-400/35 text-cyan-100'
                  : 'bg-violet-950/75 border-violet-400/45 text-violet-100'
              }`}
            >
              {hud.toastMessage ?? hud.tacticalStatus.callout}
            </div>
          )}
        </div>

        {/* Top-Right: Compact Controls + Collapsible Objectives Drawer */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            {!cleanHud && (
              <button
                type="button"
                onClick={() => setObjectivesOpen((prev) => !prev)}
                title="Toggle Level & Objectives (Tab)"
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 backdrop-blur-sm transition-colors cursor-pointer ${
                  objectivesOpen
                    ? 'bg-cyan-400/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-[#0a111e]/65 border-slate-800/80 hover:border-slate-600 text-slate-200'
                }`}
              >
                <span className="font-mono-tabular">
                  L{hud.levelId} · {completedRequired}/{totalRequired}
                </span>
                {objectivesOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTouchControls}
              title="Toggle Classic 360° Joystick"
              className={`p-2 rounded-lg border backdrop-blur-sm transition-colors cursor-pointer ${
                showControls
                  ? 'bg-cyan-400/20 border-cyan-400/55 text-cyan-200'
                  : 'bg-[#0a111e]/65 border-slate-800/80 hover:border-slate-600 text-slate-300'
              }`}
              aria-label="Toggle Joystick"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setCleanHud((prev) => !prev)}
              title={cleanHud ? 'Show Full HUD (H)' : 'Clean Screen Mode (H)'}
              className={`p-2 rounded-lg border backdrop-blur-sm transition-colors cursor-pointer ${
                cleanHud
                  ? 'bg-emerald-400/20 border-emerald-400/55 text-emerald-200'
                  : 'bg-[#0a111e]/65 border-slate-800/80 hover:border-slate-600 text-slate-300'
              }`}
              aria-label={cleanHud ? 'Show Full HUD' : 'Clean Screen Mode'}
            >
              {cleanHud ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-[#0a111e]/65 border border-slate-800/80 hover:border-slate-600 text-slate-200 backdrop-blur-sm transition-colors cursor-pointer"
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onPause}
              className="px-2.5 py-1.5 rounded-lg bg-[#0a111e]/65 border border-slate-800/80 hover:border-slate-600 text-slate-200 text-[11px] font-medium flex items-center gap-1 backdrop-blur-sm transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          </div>

          {objectivesOpen && !cleanHud && (
            <div className="bg-[#0a111e]/85 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2.5 w-56 sm:w-64 space-y-2 shadow-xl">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                <span className="font-medium text-slate-200 truncate">
                  Level {hud.levelId} · {hud.levelName}
                </span>
                <span className="font-mono-tabular shrink-0 ml-2">
                  Alarms {hud.alarmsTriggered} · Keys {hud.keycardsCollected.length}
                </span>
              </div>
              <ul className="space-y-2 text-xs">
                {hud.objectives.map((o) => {
                  const marker = hud.objectiveMarkers.find((m) => m.id === o.id);
                  const pct = o.completed ? 100 : Math.round((o.current / Math.max(1, o.target)) * 100);
                  return (
                    <li
                      key={o.id}
                      className={`space-y-1 ${
                        o.completed
                          ? 'text-emerald-300 opacity-75'
                          : o.optional
                          ? 'text-slate-400'
                          : 'text-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex items-center gap-1.5 min-w-0">
                          {marker && renderObjectiveIcon(marker.kind, o.completed)}
                          <span className={o.completed ? 'line-through truncate' : 'truncate'}>
                            {o.description}
                          </span>
                        </span>
                        <span className="font-mono-tabular shrink-0 text-[11px]">
                          {o.target > 1 ? `${o.current}/${o.target}` : marker && !o.completed ? `${marker.distanceMeters}m` : ''}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-800/90 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-150 ${
                            o.completed
                              ? 'bg-emerald-400'
                              : marker?.isPrimaryTarget
                              ? 'bg-cyan-400'
                              : 'bg-slate-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Interaction Prompt, Classic Joystick, Slim Equipment Hotbar & Action Cluster */}
      <div className="flex flex-col items-center gap-2">
        {hud.takedownPrompt && (
          <button
            type="button"
            onClick={() => EventBus.triggerAction('interact')}
            className="pointer-events-auto px-4 py-1.5 rounded-lg bg-emerald-400/95 hover:bg-emerald-300 text-slate-950 font-semibold text-xs shadow-lg border border-emerald-200 transition-transform active:scale-95 cursor-pointer"
          >
            {hud.takedownPrompt}
          </button>
        )}

        {hud.activePrompt && !hud.takedownPrompt && (
          <button
            type="button"
            onClick={() => EventBus.triggerAction('interact')}
            className="pointer-events-auto px-3.5 py-1.5 rounded-lg bg-cyan-400/95 hover:bg-cyan-300 text-slate-950 font-semibold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            {hud.activePrompt}
          </button>
        )}

        <div className="w-full flex items-end justify-between gap-2">
          {showControls ? (
            /* Translucent Classic 360-Degree Analog Joystick */
            <div
              ref={stickBaseRef}
              onPointerDown={(e) => {
                activePointerId.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                updateJoystick(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (activePointerId.current === e.pointerId) {
                  updateJoystick(e.clientX, e.clientY);
                }
              }}
              onPointerUp={(e) => {
                if (activePointerId.current === e.pointerId) {
                  resetJoystick();
                }
              }}
              onPointerCancel={resetJoystick}
              className="pointer-events-auto relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-900/45 backdrop-blur-sm border-2 border-slate-600/50 shadow-lg flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing"
              aria-label="Classic Movement Joystick"
            >
              <div className="w-14 h-14 rounded-full border border-slate-600/45 pointer-events-none" />
              <div
                className="absolute w-10 h-10 rounded-full bg-cyan-400/80 border-2 border-white/75 shadow-md pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
                }}
              />
            </div>
          ) : (
            <div className="w-2 shrink-0" />
          )}

          {/* Slim Translucent Equipment Hotbar */}
          <div className="pointer-events-auto mx-auto flex items-center gap-1 bg-[#0a111e]/65 backdrop-blur-sm border border-slate-800/80 rounded-lg p-1 overflow-x-auto max-w-full">
            {hud.equipmentSlots.map((slot, idx) => {
              const def = EQUIPMENT_CATALOG[slot.id];
              const disabled = !slot.unlocked || slot.charges === 0 || slot.cooldownRemaining > 0;
              const isSelected = hud.selectedGadget === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!slot.unlocked}
                  onClick={() => {
                    EventBus.selectEquipment(slot.id as EquipmentId);
                    EventBus.triggerEquipment(slot.id as EquipmentId);
                  }}
                  title={`${def.name} (Key ${idx + 1} · Q cycle · LMB/F use)`}
                  className={`px-2 py-1 rounded-md border text-left transition-all duration-150 cursor-pointer shrink-0 ${
                    cleanHud ? 'min-w-[38px]' : 'min-w-[54px] sm:min-w-[64px]'
                  } ${
                    !slot.unlocked
                      ? 'bg-slate-900/30 border-slate-800/40 text-slate-600 cursor-not-allowed'
                      : isSelected
                      ? 'bg-cyan-950/75 border-cyan-400 ring-1 ring-cyan-300/60 text-white active:scale-95'
                      : disabled
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 hover:border-cyan-400/60 text-slate-100 active:scale-95'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono-tabular text-slate-400 leading-tight">
                    <span>{idx + 1}</span>
                    <span>
                      {!slot.unlocked
                        ? '—'
                        : slot.cooldownRemaining > 0
                        ? `${slot.cooldownRemaining}s`
                        : slot.maxCharges < 0
                        ? '∞'
                        : `${slot.charges}`}
                    </span>
                  </div>
                  {!cleanHud && (
                    <div className="text-[11px] font-medium truncate leading-tight">{def.shortName}</div>
                  )}
                </button>
              );
            })}
          </div>

          {showControls ? (
            /* Translucent Right-Thumb Action Cluster */
            <div className="pointer-events-auto grid grid-cols-2 gap-1.5 shrink-0 select-none">
              <button
                type="button"
                onClick={() => {
                  const next = !sprintHeld;
                  setSprintHeld(next);
                  EventBus.setVirtualInput({ sprint: next });
                }}
                className={`px-2.5 py-2 rounded-lg border text-[11px] font-semibold backdrop-blur-sm transition-colors cursor-pointer ${
                  sprintHeld
                    ? 'bg-amber-400/90 text-slate-950 border-amber-300'
                    : 'bg-slate-900/55 border-slate-600/60 text-slate-200'
                }`}
              >
                Sprint
              </button>
              <button
                type="button"
                onClick={() => EventBus.triggerAction('crouch')}
                className="px-2.5 py-2 rounded-lg bg-slate-900/55 active:bg-slate-700/80 border border-slate-600/60 text-slate-200 text-[11px] font-semibold backdrop-blur-sm cursor-pointer"
              >
                Slide
              </button>
              <button
                type="button"
                onClick={() => EventBus.triggerAction('dodge')}
                className="px-2.5 py-2 rounded-lg bg-slate-800/65 active:bg-cyan-500/35 border border-slate-500/60 text-white text-[11px] font-semibold backdrop-blur-sm cursor-pointer"
              >
                Dodge
              </button>
              <button
                type="button"
                onClick={() => EventBus.triggerAction('use_gadget')}
                className="px-2.5 py-2 rounded-lg bg-violet-500/75 active:bg-violet-400 border border-violet-300/60 text-white text-[11px] font-semibold backdrop-blur-sm cursor-pointer"
              >
                Gadget
              </button>
              <button
                type="button"
                onClick={() => EventBus.triggerAction('interact')}
                className="col-span-2 px-2.5 py-2 rounded-lg bg-cyan-400/85 active:bg-cyan-300 text-slate-950 text-[11px] font-semibold backdrop-blur-sm cursor-pointer"
              >
                {hud.takedownPrompt ? 'Takedown' : 'Interact'}
              </button>
            </div>
          ) : (
            <div className="w-2 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}

