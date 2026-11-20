import { OPERATIVES } from '@/src/data/characters';
import { DialogueSequence, OperativeId } from '@/src/types/game';

export const DIALOGUE_SEQUENCES: DialogueSequence[] = [
  {
    id: 'ch1_intro',
    triggerLevel: 1,
    timing: 'pre',
    title: 'Helix-9 Perimeter Breach',
    lines: [
      {
        speakerId: 'nova',
        speakerName: 'Nova',
        portraitUrl: OPERATIVES[OperativeId.NOVA].portraitUrl,
        accentColor: OPERATIVES[OperativeId.NOVA].accentColor,
        text: 'Telemetry is unstable down in Helix-9, Ghost. Old research wings still have live patrols and motion cameras.',
      },
      {
        speakerId: 'ghost',
        speakerName: 'The Ghost',
        portraitUrl: OPERATIVES[OperativeId.GHOST].portraitUrl,
        accentColor: OPERATIVES[OperativeId.GHOST].accentColor,
        text: 'Then we stay out of their sightlines. Main hallway or maintenance vents?',
      },
      {
        speakerId: 'vex',
        speakerName: 'Vex',
        portraitUrl: OPERATIVES[OperativeId.VEX].portraitUrl,
        accentColor: OPERATIVES[OperativeId.VEX].accentColor,
        text: 'I say take the vents if you want quiet, or sprint the blind turns before their sweeps reset.',
        choices: [
          { label: 'Prioritize silent observation', consequenceKey: 'ch1_approach', trustDelta: 1 },
          { label: 'Move fast between blind spots', consequenceKey: 'ch1_approach', trustDelta: 0 },
        ],
      },
      {
        speakerId: 'raven',
        speakerName: 'Raven',
        portraitUrl: OPERATIVES[OperativeId.RAVEN].portraitUrl,
        accentColor: OPERATIVES[OperativeId.RAVEN].accentColor,
        text: 'Use lockers and dark alcoves when patrol cones sweep past. Disappearing cleanly is half the job.',
      },
    ],
  },
  {
    id: 'ch1_boss_pre',
    triggerLevel: 10,
    timing: 'pre',
    title: 'Sector 9 Vault Lockdown',
    lines: [
      {
        speakerId: 'warden',
        speakerName: 'The Warden',
        accentColor: '#67e8f9',
        text: 'Unregistered biometric trace inside Sector 9. Lockdown barriers armed. You are not walking out of here.',
      },
      {
        speakerId: 'ghost',
        speakerName: 'The Ghost',
        portraitUrl: OPERATIVES[OperativeId.GHOST].portraitUrl,
        accentColor: OPERATIVES[OperativeId.GHOST].accentColor,
        text: 'Stay mobile, watch the telegraph rings, and break his shield with the Pulse Tool.',
      },
    ],
  },
  {
    id: 'ch2_intro',
    triggerLevel: 11,
    timing: 'pre',
    title: 'Aegis Meridian Ascent',
    lines: [
      {
        speakerId: 'nova',
        speakerName: 'Nova',
        portraitUrl: OPERATIVES[OperativeId.NOVA].portraitUrl,
        accentColor: OPERATIVES[OperativeId.NOVA].accentColor,
        text: 'Welcome to Meridian Tower. Their security technicians reset breached terminals if you linger.',
      },
      {
        speakerId: 'vex',
        speakerName: 'Vex',
        portraitUrl: OPERATIVES[OperativeId.VEX].portraitUrl,
        accentColor: OPERATIVES[OperativeId.VEX].accentColor,
        text: 'Still keeping score, Nova? Let’s see how long your encryption lasts against Spectre’s network.',
        choices: [
          { label: 'Back Nova’s technical route', consequenceKey: 'ch2_trust', trustDelta: 2 },
          { label: 'Trust Vex’s flanking instincts', consequenceKey: 'ch2_trust', trustDelta: 1 },
        ],
      },
    ],
  },
  {
    id: 'ch3_escape_pre',
    triggerLevel: 25,
    timing: 'pre',
    title: 'Subway Tunnel Run',
    lines: [
      {
        speakerId: 'vex',
        speakerName: 'Vex',
        portraitUrl: OPERATIVES[OperativeId.VEX].portraitUrl,
        accentColor: OPERATIVES[OperativeId.VEX].accentColor,
        text: 'Freight trains are still running live along the lower spur! Watch the track intervals and use side alcoves.',
      },
      {
        speakerId: 'ghost',
        speakerName: 'The Ghost',
        portraitUrl: OPERATIVES[OperativeId.GHOST].portraitUrl,
        accentColor: OPERATIVES[OperativeId.GHOST].accentColor,
        text: 'Copy. Moving on the gaps.',
      },
    ],
  },
  {
    id: 'ch5_intro',
    triggerLevel: 41,
    timing: 'pre',
    title: 'Velvet Perimeter',
    lines: [
      {
        speakerId: 'raven',
        speakerName: 'Raven',
        portraitUrl: OPERATIVES[OperativeId.RAVEN].portraitUrl,
        accentColor: OPERATIVES[OperativeId.RAVEN].accentColor,
        text: 'Inside the Sovereign Estate, force draws eyes. Use Disguise Stations to walk past standard patrols undetected.',
      },
      {
        speakerId: 'nova',
        speakerName: 'Nova',
        portraitUrl: OPERATIVES[OperativeId.NOVA].portraitUrl,
        accentColor: OPERATIVES[OperativeId.NOVA].accentColor,
        text: 'Just remember—Elite Agents and Trackers still see through surface cover if you crowd them.',
      },
    ],
  },
  {
    id: 'ch7_betrayal',
    triggerLevel: 61,
    timing: 'pre',
    title: 'Fractured Relay',
    lines: [
      {
        speakerId: 'raven',
        speakerName: 'Raven',
        portraitUrl: OPERATIVES[OperativeId.RAVEN].portraitUrl,
        accentColor: OPERATIVES[OperativeId.RAVEN].accentColor,
        text: 'Someone inside THE VEIL leaked our extraction coordinates in Geneva. Our own archive keys are being mirrored.',
      },
      {
        speakerId: 'ghost',
        speakerName: 'The Ghost',
        portraitUrl: OPERATIVES[OperativeId.GHOST].portraitUrl,
        accentColor: OPERATIVES[OperativeId.GHOST].accentColor,
        text: 'Commander Zero signed those routing keys. We retrieve the ledger first, then confront Command.',
        choices: [
          { label: 'Share all encrypted files with the team', consequenceKey: 'ch7_transparency', trustDelta: 3 },
          { label: 'Keep the command keys compartmentalized', consequenceKey: 'ch7_transparency', trustDelta: -1 },
        ],
      },
    ],
  },
  {
    id: 'ch9_protocol_zero',
    triggerLevel: 81,
    timing: 'pre',
    title: 'Protocol Zero Activated',
    lines: [
      {
        speakerId: 'nova',
        speakerName: 'Nova',
        portraitUrl: OPERATIVES[OperativeId.NOVA].portraitUrl,
        accentColor: OPERATIVES[OperativeId.NOVA].accentColor,
        text: 'All VEIL transponders just flipped hostile. Commander Zero locked down headquarters.',
      },
      {
        speakerId: 'vex',
        speakerName: 'Vex',
        portraitUrl: OPERATIVES[OperativeId.VEX].portraitUrl,
        accentColor: OPERATIVES[OperativeId.VEX].accentColor,
        text: 'Whatever happens inside, we stay together. No one vanishes alone.',
      },
    ],
  },
  {
    id: 'ch10_finale_pre',
    triggerLevel: 100,
    timing: 'pre',
    title: 'The Last Shadow',
    lines: [
      {
        speakerId: 'director',
        speakerName: 'The Director',
        accentColor: '#fb7185',
        text: 'You crossed ninety-nine layers of silence to stand here, Ghost. When the ledger opens, will you dismantle THE VEIL—or inherit it?',
        choices: [
          { label: 'Expose Shadow Protocol to the world', consequenceKey: 'ending_choice', trustDelta: 3 },
          { label: 'Erase the network and disappear cleanly', consequenceKey: 'ending_choice', trustDelta: 1 },
          { label: 'Seize control of THE VEIL from within', consequenceKey: 'ending_choice', trustDelta: -2 },
        ],
      },
      {
        speakerId: 'ghost',
        speakerName: 'The Ghost',
        portraitUrl: OPERATIVES[OperativeId.GHOST].portraitUrl,
        accentColor: OPERATIVES[OperativeId.GHOST].accentColor,
        text: 'Either way, your era ends tonight.',
      },
    ],
  },
];

export function getDialogueForLevel(levelId: number, timing: 'pre' | 'post'): DialogueSequence | null {
  return DIALOGUE_SEQUENCES.find((d) => d.triggerLevel === levelId && d.timing === timing) ?? null;
}
