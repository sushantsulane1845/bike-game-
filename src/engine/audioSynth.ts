/**
 * Procedural Web Audio API synthesizer for 4-stroke motocross engine rumble,
 * airborne wind rush, landing suspension thuds, nitro surge, and checkpoint chimes.
 */
export class MotocrossAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOscPrimary: OscillatorNode | null = null;
  private engineOscSub: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private muted = false;
  private initialized = false;

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.28;
      this.masterGain.connect(this.ctx.destination);

      // Engine harmonic stack (sawtooth + triangle sub-octave)
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 260;
      this.engineFilter.Q.value = 3.2;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.001;

      this.engineOscPrimary = this.ctx.createOscillator();
      this.engineOscPrimary.type = 'sawtooth';
      this.engineOscPrimary.frequency.value = 48;

      this.engineOscSub = this.ctx.createOscillator();
      this.engineOscSub.type = 'triangle';
      this.engineOscSub.frequency.value = 24;

      this.engineOscPrimary.connect(this.engineFilter);
      this.engineOscSub.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOscPrimary.start();
      this.engineOscSub.start();

      // Noise buffer for wind rush
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const windSource = this.ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 420;
      this.windFilter.Q.value = 1.4;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.0001;

      windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      windSource.start();

      this.initialized = true;
    } catch {
      this.initialized = false;
    }
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.28, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public update(rpm: number, speedNorm: number, isAirborne: boolean, isBoosting: boolean, active: boolean): void {
    if (!this.initialized || !this.ctx || !this.engineOscPrimary || !this.engineOscSub || !this.engineFilter || !this.engineGain || !this.windGain || !this.windFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active) {
      this.engineGain.gain.setTargetAtTime(0.0001, now, 0.08);
      this.windGain.gain.setTargetAtTime(0.0001, now, 0.08);
      return;
    }

    const clampedRpm = Math.max(0.12, Math.min(1.0, rpm));
    const baseFreq = 38 + clampedRpm * 112 + (isBoosting ? 24 : 0);
    this.engineOscPrimary.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOscSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(220 + clampedRpm * 920 + (isBoosting ? 420 : 0), now, 0.05);
    this.engineGain.gain.setTargetAtTime(0.14 + clampedRpm * 0.16, now, 0.05);

    const windLevel = (speedNorm * 0.07 + (isAirborne ? 0.08 : 0) + (isBoosting ? 0.09 : 0));
    this.windFilter.frequency.setTargetAtTime(340 + speedNorm * 800 + (isAirborne ? 320 : 0), now, 0.08);
    this.windGain.gain.setTargetAtTime(windLevel, now, 0.08);
  }

  public playLandingThud(intensity: number): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const clamped = Math.max(0.2, Math.min(1, intensity));
    osc.frequency.setValueAtTime(110 * clamped + 35, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.16);
    gain.gain.setValueAtTime(0.35 * clamped, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playStuntChime(multiplier: number): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const base = 440 + Math.min(4, multiplier) * 85;
    [base, base * 1.25].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
