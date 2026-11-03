import { AudioMixState } from '../types/aquarium';

/**
 * Pure Web Audio API procedural soundscape & tactile SFX synthesizer.
 * Zero external audio file dependencies — never 404s offline or on GitHub Pages.
 */
class ZenAudioEngine {
  private ctx: AudioContext | null = null;
  private streamGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private bubbleTimer: number | null = null;
  private mix: AudioMixState = {
    muted: true,
    streamVolume: 0.45,
    bubblesVolume: 0.35,
    rainVolume: 0.0,
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.setupAmbientGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private setupAmbientGraph(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.mix.muted ? 0 : 1;
    this.masterGain.connect(ctx.destination);

    const noiseBuffer = this.createNoiseBuffer(ctx, 4);

    // 1. Gentle Lily-pipe water trickle (warm band-passed pink noise + subtle LFO)
    const streamSource = ctx.createBufferSource();
    streamSource.buffer = noiseBuffer;
    streamSource.loop = true;

    const streamFilter = ctx.createBiquadFilter();
    streamFilter.type = 'bandpass';
    streamFilter.frequency.value = 620;
    streamFilter.Q.value = 0.85;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain);
    lfoGain.connect(streamFilter.frequency);
    lfo.start();

    this.streamGain = ctx.createGain();
    this.streamGain.gain.value = this.mix.streamVolume * 0.22;

    streamSource.connect(streamFilter);
    streamFilter.connect(this.streamGain);
    this.streamGain.connect(this.masterGain);
    streamSource.start();

    // 2. Soft rain outside window (higher soft lowpass/highpass blend)
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1450;
    rainFilter.Q.value = 0.45;

    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = this.mix.rainVolume * 0.2;

    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    rainSource.start();

    // 3. Periodic delicate air-stone micro-bubble plops
    this.scheduleNextBubble();
  }

  private scheduleNextBubble(): void {
    if (this.bubbleTimer !== null) {
      window.clearTimeout(this.bubbleTimer);
    }
    const nextDelay = 280 + Math.random() * 900;
    this.bubbleTimer = window.setTimeout(() => {
      if (!this.mix.muted && this.mix.bubblesVolume > 0.02 && this.ctx && this.masterGain) {
        this.triggerBubbleTone(this.mix.bubblesVolume * 0.07);
      }
      this.scheduleNextBubble();
    }, nextDelay);
  }

  private triggerBubbleTone(gainAmount: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    const baseFreq = 420 + Math.random() * 580;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.065);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gainAmount, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public updateMix(next: AudioMixState): void {
    this.mix = next;
    if (!next.muted) {
      this.ensureContext();
    }
    if (!this.ctx || !this.masterGain || !this.streamGain || !this.rainGain) return;

    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(next.muted ? 0 : 1, now, 0.08);
    this.streamGain.gain.setTargetAtTime(next.streamVolume * 0.22, now, 0.08);
    this.rainGain.gain.setTargetAtTime(next.rainVolume * 0.22, now, 0.08);
  }

  public playFoodDrop(): void {
    if (this.mix.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    for (let i = 0; i < 3; i++) {
      window.setTimeout(() => {
        this.triggerBubbleTone(0.065);
      }, i * 75);
    }
  }

  public playGlassTap(): void {
    if (this.mix.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.055);

    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playWaterRefill(): void {
    if (this.mix.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.linearRampToValueAtTime(880, now + 2.2);
    filter.Q.value = 1.2;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.4);
    g.gain.linearRampToValueAtTime(0.14, now + 2.0);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 2.85);
  }

  public dispose(): void {
    if (this.bubbleTimer !== null) {
      window.clearTimeout(this.bubbleTimer);
      this.bubbleTimer = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const zenAudio = new ZenAudioEngine();
