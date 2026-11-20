import { AwarenessState, GameSettings } from '@/src/types/game';

export type MusicMood = 'menu' | 'exploration' | 'suspicion' | 'alert' | 'boss';

class AudioSystemClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientNode: AudioNode | null = null;
  private musicTimer: number | null = null;
  private stepIndex = 0;
  private currentMood: MusicMood = 'menu';
  private settings: GameSettings = {
    masterVolume: 0.75,
    musicVolume: 0.45,
    sfxVolume: 0.75,
    muted: false,
    showTouchControls: 'auto',
    reducedMotion: false,
    showRouteHints: true,
  };

  public applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    if (this.masterGain && this.ctx) {
      const target = settings.muted ? 0 : settings.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(settings.musicVolume, this.ctx.currentTime, 0.05);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  public ensureUnlocked(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applySettings(this.settings);
      this.startAmbientBed();
      this.startDynamicMusicLoop();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMood(mood: MusicMood): void {
    this.currentMood = mood;
  }

  public setMoodFromAwareness(awareness: AwarenessState, isBoss: boolean): void {
    if (isBoss) {
      this.setMood('boss');
      return;
    }
    if (awareness === AwarenessState.ALERTED) {
      this.setMood('alert');
    } else if (awareness === AwarenessState.SUSPICIOUS || awareness === AwarenessState.INVESTIGATING || awareness === AwarenessState.CURIOUS) {
      this.setMood('suspicion');
    } else {
      this.setMood('exploration');
    }
  }

  private startAmbientBed(): void {
    if (!this.ctx || !this.musicGain || this.ambientNode) return;
    // Subtle filtered ventilation / electrical hum
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 54;
    filter.type = 'lowpass';
    filter.frequency.value = 140;
    gain.gain.value = 0.035;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start();
    this.ambientNode = osc;
  }

  private startDynamicMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
    }
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.ctx.state !== 'running' || this.settings.muted) return;
      this.playMusicBeat();
    }, 280);
  }

  private playMusicBeat(): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const step = this.stepIndex % 16;
    this.stepIndex += 1;

    const scales: Record<MusicMood, number[]> = {
      menu: [110, 0, 130.81, 0, 146.83, 0, 164.81, 0, 110, 0, 196, 0, 164.81, 0, 146.83, 0],
      exploration: [98, 0, 0, 116.54, 0, 130.81, 0, 0, 98, 0, 146.83, 0, 130.81, 0, 116.54, 0],
      suspicion: [110, 0, 116.54, 0, 130.81, 110, 0, 146.83, 110, 0, 164.81, 0, 146.83, 130.81, 116.54, 0],
      alert: [110, 110, 164.81, 110, 146.83, 110, 196, 164.81, 110, 110, 174.61, 110, 164.81, 146.83, 130.81, 116.54],
      boss: [82.41, 82.41, 123.47, 82.41, 130.81, 82.41, 146.83, 164.81, 82.41, 98, 123.47, 130.81, 164.81, 146.83, 130.81, 110],
    };

    const freq = scales[this.currentMood][step];
    if (freq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = this.currentMood === 'boss' || this.currentMood === 'alert' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.value = this.currentMood === 'alert' || this.currentMood === 'boss' ? 950 : 480;
      const amp = this.currentMood === 'exploration' ? 0.04 : this.currentMood === 'menu' ? 0.05 : 0.08;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(amp, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.26);
    }

    // Subtle percussive pulse on alert/boss
    if ((this.currentMood === 'alert' || this.currentMood === 'boss') && step % 2 === 0) {
      const kick = this.ctx.createOscillator();
      const kGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(step % 4 === 0 ? 115 : 85, now);
      kick.frequency.exponentialRampToValueAtTime(36, now + 0.09);
      kGain.gain.setValueAtTime(0.11, now);
      kGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      kick.connect(kGain);
      kGain.connect(this.musicGain);
      kick.start(now);
      kick.stop(now + 0.12);
    }
  }

  public playFootstep(sprint: boolean, crouch: boolean): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(sprint ? 160 : crouch ? 75 : 110, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.06);
    gain.gain.setValueAtTime(crouch ? 0.025 : sprint ? 0.09 : 0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playTone(
    type:
      | 'interact'
      | 'hack'
      | 'door'
      | 'alert'
      | 'suspicion'
      | 'pulse'
      | 'dodge'
      | 'pickup'
      | 'damage'
      | 'victory'
      | 'ui'
      | 'gunshot'
      | 'ricochet'
      | 'takedown'
      | 'tagger'
      | 'purchase'
  ): void {
    this.ensureUnlocked();
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;

    const emit = (freq: number, endFreq: number, dur: number, wave: OscillatorType, amp: number, delay = 0) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + delay + dur);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(amp, now + delay + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.02);
    };

    switch (type) {
      case 'ui':
        emit(520, 680, 0.06, 'triangle', 0.08);
        break;
      case 'interact':
        emit(440, 660, 0.11, 'sine', 0.12);
        break;
      case 'hack':
        emit(580, 880, 0.09, 'square', 0.08, 0);
        emit(880, 1180, 0.12, 'triangle', 0.1, 0.08);
        break;
      case 'door':
        emit(150, 75, 0.22, 'sawtooth', 0.1);
        break;
      case 'suspicion':
        emit(330, 440, 0.16, 'triangle', 0.1);
        break;
      case 'alert':
        emit(720, 540, 0.18, 'sawtooth', 0.15, 0);
        emit(840, 620, 0.18, 'sawtooth', 0.15, 0.18);
        break;
      case 'pulse':
        emit(880, 220, 0.2, 'sawtooth', 0.14);
        break;
      case 'tagger':
        emit(1040, 1520, 0.08, 'sine', 0.12, 0);
        emit(1520, 420, 0.14, 'triangle', 0.11, 0.07);
        break;
      case 'takedown':
        emit(170, 58, 0.11, 'triangle', 0.16, 0);
        emit(95, 42, 0.14, 'sine', 0.14, 0.05);
        break;
      case 'purchase':
        emit(587.33, 587.33, 0.08, 'triangle', 0.12, 0);
        emit(880, 1046.5, 0.14, 'triangle', 0.13, 0.07);
        break;
      case 'dodge':
        emit(280, 120, 0.14, 'triangle', 0.12);
        break;
      case 'pickup':
        emit(523.25, 659.25, 0.1, 'sine', 0.12, 0);
        emit(659.25, 783.99, 0.14, 'sine', 0.12, 0.09);
        break;
      case 'damage':
        emit(180, 55, 0.22, 'sawtooth', 0.18);
        break;
      case 'gunshot':
        emit(380, 72, 0.09, 'sawtooth', 0.15, 0);
        emit(190, 48, 0.11, 'square', 0.11, 0.01);
        break;
      case 'ricochet':
        emit(1350, 620, 0.07, 'triangle', 0.08, 0);
        break;
      case 'victory':
        emit(440, 440, 0.12, 'triangle', 0.14, 0);
        emit(554.37, 554.37, 0.12, 'triangle', 0.14, 0.11);
        emit(659.25, 880, 0.28, 'triangle', 0.16, 0.22);
        break;
    }
  }
}

export const AudioSystem = new AudioSystemClass();
