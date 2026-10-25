const SOUND_MUTED_KEY = 'saa-sound-muted';

type SoundEffect = 'shoot' | 'explosion' | 'hit' | 'powerup';

const EFFECT_NOTES: Record<SoundEffect, Array<{ frequency: number; duration: number; type: OscillatorType }>> = {
  shoot: [{ frequency: 660, duration: 0.07, type: 'square' }],
  explosion: [
    { frequency: 180, duration: 0.12, type: 'sawtooth' },
    { frequency: 90, duration: 0.18, type: 'triangle' }
  ],
  hit: [{ frequency: 120, duration: 0.2, type: 'sawtooth' }],
  powerup: [
    { frequency: 440, duration: 0.08, type: 'sine' },
    { frequency: 660, duration: 0.08, type: 'sine' },
    { frequency: 880, duration: 0.12, type: 'sine' }
  ]
};

export class SoundEffects {
  private context?: AudioContext;
  private muted = localStorage.getItem(SOUND_MUTED_KEY) === 'true';

  get isMuted(): boolean {
    return this.muted;
  }

  toggle(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(SOUND_MUTED_KEY, String(this.muted));
    return this.muted;
  }

  play(effect: SoundEffect): void {
    if (this.muted) return;
    const context = this.context ??= new AudioContext();
    if (context.state === 'suspended') {
      void context.resume().catch((error: unknown) => console.error('Could not resume game audio:', error));
    }

    let startAt = context.currentTime;
    for (const note of EFFECT_NOTES[effect]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + note.duration);
      startAt += note.duration * 0.8;
    }
  }
}
