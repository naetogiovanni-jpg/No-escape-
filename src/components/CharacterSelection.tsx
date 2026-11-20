import { OPERATIVE_LIST } from '@/src/data/characters';
import { OperativeClass, OperativeId } from '@/src/types/game';
import { Check, Coins, Palette } from 'lucide-react';
import { useState } from 'react';

interface CharacterSelectionProps {
  selectedOperative: OperativeId;
  shadowCredits?: number;
  onSelectOperative: (id: OperativeId) => void;
  onCustomize?: () => void;
  onBack: () => void;
}

const CLASS_FILTERS: Array<'All' | OperativeClass> = ['All', 'Skill', 'Tank', 'Technical'];

export function CharacterSelection({
  selectedOperative,
  shadowCredits,
  onSelectOperative,
  onCustomize,
  onBack,
}: CharacterSelectionProps) {
  const [inspectId, setInspectId] = useState<OperativeId>(selectedOperative);
  const [classFilter, setClassFilter] = useState<'All' | OperativeClass>('All');

  const filteredOperatives =
    classFilter === 'All'
      ? OPERATIVE_LIST
      : OPERATIVE_LIST.filter((o) => o.classType === classFilter);

  const inspected = OPERATIVE_LIST.find((o) => o.id === inspectId) ?? OPERATIVE_LIST[0];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs text-slate-400">
            THE VEIL Field Roster · 5 Playable Operatives · Skill, Tank & Technical Classes
          </div>
          <h1 className="font-display text-4xl font-bold text-white">
            Operative Selection & Reference Sheets
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {typeof shadowCredits === 'number' && (
            <div className="px-3.5 py-2 rounded-lg bg-[#0d1524] border border-amber-500/35 flex items-center gap-2 text-xs">
              <Coins className="w-4 h-4 text-amber-300" />
              <span className="font-mono-tabular font-semibold text-amber-300">
                {shadowCredits.toLocaleString()} SC
              </span>
            </div>
          )}
          {onCustomize && (
            <button
              type="button"
              onClick={onCustomize}
              className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-sm font-semibold transition-all duration-200 ease-out flex items-center gap-2 cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              <span>Customize Operative</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium border border-slate-700 transition-all duration-200 ease-out cursor-pointer"
          >
            Back to Menu
          </button>
        </div>
      </div>

      {/* Class Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/70 pb-4">
        <span className="text-xs text-slate-400 mr-2">Class Filter:</span>
        {CLASS_FILTERS.map((cls) => {
          const active = classFilter === cls;
          return (
            <button
              key={cls}
              type="button"
              onClick={() => {
                setClassFilter(cls);
                const firstMatch =
                  cls === 'All'
                    ? OPERATIVE_LIST[0]
                    : OPERATIVE_LIST.find((o) => o.classType === cls);
                if (firstMatch && cls !== 'All' && inspected.classType !== cls) {
                  setInspectId(firstMatch.id);
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ease-out cursor-pointer ${
                active
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-semibold'
                  : 'bg-[#0d1524] border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              {cls}
            </button>
          );
        })}
      </div>

      {/* Operative Selector Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {filteredOperatives.map((op) => {
          const isSelected = op.id === selectedOperative;
          const isInspected = op.id === inspectId;
          return (
            <div
              key={op.id}
              onClick={() => setInspectId(op.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setInspectId(op.id);
              }}
              className={`rounded-xl border overflow-hidden bg-[#0d1524] transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 ${
                isInspected ? 'border-cyan-400 shadow-lg shadow-cyan-950/30' : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="aspect-square bg-slate-900 relative overflow-hidden">
                  <img
                    src={op.portraitUrl}
                    alt={op.codename}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 ease-out hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1524] via-transparent to-transparent" />
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">
                    <span style={{ color: op.accentColor }}>{op.classType}</span>
                    <span className="mx-1.5 text-slate-600">·</span>
                    <span className="font-mono-tabular">HP {op.maxHp}</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">{op.codename}</h2>
                  <p className="text-xs text-slate-400 line-clamp-2">{op.roleSummary}</p>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectId(op.id);
                    onSelectOperative(op.id);
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ease-out cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  <span>{isSelected ? 'Active Operative' : 'Deploy Operative'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Character Reference Sheet */}
      <section className="bg-[#0d1524] border border-slate-800 rounded-xl p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-5">
          <img
            src={inspected.portraitUrl}
            alt={inspected.codename}
            referrerPolicy="no-referrer"
            className="w-full aspect-square object-cover rounded-xl border border-slate-800"
          />
          <div className="space-y-3">
            <h3 className="font-display text-xl font-semibold text-white">Field Capabilities</h3>
            {(
              [
                ['Mobility', inspected.stats.speed],
                ['Concealment', inspected.stats.stealth],
                ['Electronic Warfare', inspected.stats.hacking],
                ['Evasion', inspected.stats.evasion],
              ] as const
            ).map(([label, val]) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{label}</span>
                  <span className="font-mono-tabular">{val}/10</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${val * 10}%`, backgroundColor: inspected.accentColor }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Class Role</span>
                <span className="text-slate-200 font-medium">{inspected.classType}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Max Health</span>
                <span className="font-mono-tabular text-slate-200 font-medium">{inspected.maxHp} HP</span>
              </div>
              <div>
                <span className="text-slate-500 block">Damage Mitigation</span>
                <span className="font-mono-tabular text-slate-200 font-medium">
                  {Math.round((1 - inspected.modifiers.damageTakenMultiplier) * 100)}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Parkour Boost</span>
                <span className="font-mono-tabular text-slate-200 font-medium">
                  {inspected.modifiers.parkourBoostMultiplier.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="text-xs text-slate-400">Colour Palette</div>
            <div className="flex items-center gap-2">
              {inspected.referenceSheet.palette.map((hex) => (
                <div key={hex} className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-md border border-slate-700"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                  <span className="text-[10px] font-mono-tabular text-slate-500">{hex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <div className="text-xs font-medium" style={{ color: inspected.accentColor }}>
              {inspected.classType} Class · {inspected.title} · HP {inspected.maxHp}
            </div>
            <h2 className="font-display text-3xl font-bold text-white">{inspected.codename}</h2>
            <p className="text-sm text-slate-300">{inspected.personality}</p>
            <p className="text-sm text-cyan-200 pt-1">{inspected.passiveAbility}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-400">Front Appearance</div>
              <p className="text-slate-200 leading-relaxed">{inspected.referenceSheet.frontAppearance}</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-400">Side Profile</div>
              <p className="text-slate-200 leading-relaxed">{inspected.referenceSheet.sideAppearance}</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-400">Back Silhouette</div>
              <p className="text-slate-200 leading-relaxed">{inspected.referenceSheet.backAppearance}</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-400">Hairstyle</div>
              <p className="text-slate-200 leading-relaxed">{inspected.referenceSheet.hairstyle}</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-400">Clothing Construction</div>
              <p className="text-slate-200 leading-relaxed">{inspected.referenceSheet.clothingDetails}</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-400">Proportions & Animation Notes</div>
              <p className="text-slate-200 leading-relaxed">
                {inspected.referenceSheet.proportions} {inspected.referenceSheet.animationNotes}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
