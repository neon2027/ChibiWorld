// ChibiWorld Background Music Manager
// Generates cute chiptune-style music using Web Audio API

const BPM = 118;
const BEAT = 60 / BPM;

// Frequencies (Hz) for notes used in the melody
const C4=261.63, D4=293.66, E4=329.63, G4=392.00, A4=440.00;
const C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880.00;

// Pentatonic melody: [frequency, beats, volume]
const MELODY = [
    [E5, 0.5, 0.50], [C5, 0.5, 0.45], [G4, 1.0, 0.55],
    [A4, 0.5, 0.50], [C5, 0.5, 0.45], [D5, 0.5, 0.55], [E5, 1.5, 0.60],
    [D5, 0.5, 0.50], [C5, 0.5, 0.45], [D5, 0.5, 0.55], [E5, 0.5, 0.55], [C5, 2.0, 0.50],
    [G4, 0.5, 0.50], [A4, 0.5, 0.50], [C5, 0.5, 0.55], [D5, 0.5, 0.55], [E5, 0.5, 0.60], [G5, 1.5, 0.65],
    [A5, 0.5, 0.60], [G5, 0.5, 0.55], [E5, 0.5, 0.60], [C5, 0.5, 0.50], [D5, 2.0, 0.55],
    [C5, 0.5, 0.55], [E5, 0.5, 0.60], [G5, 0.5, 0.65], [E5, 0.5, 0.55], [C5, 1.0, 0.50],
    [D5, 0.5, 0.55], [E5, 0.5, 0.60], [D5, 0.5, 0.55], [C5, 0.5, 0.50], [G4, 2.0, 0.55],
];

// Bass line: [frequency, beats, volume]
const BASS = [
    [C4, 2.0, 0.30], [G4, 2.0, 0.28],
    [A4, 2.0, 0.30], [G4, 2.0, 0.28],
    [C4, 2.0, 0.30], [E4, 2.0, 0.28],
    [A4, 2.0, 0.30], [G4, 2.0, 0.28],
];

const MELODY_DURATION = MELODY.reduce((s, [,b]) => s + b * BEAT, 0);
const BASS_DURATION   = BASS.reduce((s, [,b]) => s + b * BEAT, 0);

export class MusicManager {
    constructor() {
        this._ctx = null;
        this._gain = null;
        this._playing = false;
        this._volume = 0.28;
        this._nextTime = 0;
        this._timer = null;
    }

    get playing() { return this._playing; }

    start() {
        if (this._playing) return;
        if (!this._ctx) {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._gain = this._ctx.createGain();
            this._gain.gain.value = this._volume;
            this._gain.connect(this._ctx.destination);
        }
        if (this._ctx.state === 'suspended') this._ctx.resume();
        this._playing = true;
        this._nextTime = this._ctx.currentTime + 0.05;
        this._scheduleLoop();
    }

    stop() {
        this._playing = false;
        clearTimeout(this._timer);
        if (this._gain && this._ctx) {
            this._gain.gain.setTargetAtTime(0, this._ctx.currentTime, 0.3);
        }
    }

    toggle() {
        if (this._playing) this.stop(); else this.start();
        return this._playing;
    }

    setVolume(v) {
        this._volume = Math.max(0, Math.min(1, v));
        if (this._gain && this._playing) {
            this._gain.gain.setTargetAtTime(this._volume, this._ctx.currentTime, 0.05);
        }
    }

    destroy() {
        this.stop();
        setTimeout(() => {
            if (this._ctx) { this._ctx.close(); this._ctx = null; }
        }, 600);
    }

    // ── Private ──────────────────────────────────────────────

    _note(freq, start, dur, vol, type = 'triangle') {
        if (!this._ctx || !this._gain) return;
        const osc = this._ctx.createOscillator();
        const g   = this._ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(vol, start + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.88);
        osc.connect(g);
        g.connect(this._gain);
        osc.start(start);
        osc.stop(start + dur);
    }

    _scheduleLoop() {
        if (!this._playing || !this._ctx) return;

        const start = this._nextTime;

        // Melody
        let mt = start;
        for (const [freq, beats, vol] of MELODY) {
            const dur = beats * BEAT;
            this._note(freq, mt, dur, vol, 'triangle');
            // Sparkle harmonic (high-pitched bell-like)
            this._note(freq * 2, mt + 0.01, dur * 0.35, vol * 0.12, 'sine');
            mt += dur;
        }

        // Bass — loop the pattern to fill the melody duration
        let bt = start;
        let bi = 0;
        while (bt < start + MELODY_DURATION - 0.01) {
            const [freq, beats, vol] = BASS[bi % BASS.length];
            const dur = beats * BEAT;
            const clippedDur = Math.min(dur, start + MELODY_DURATION - bt);
            this._note(freq, bt, clippedDur * 0.75, vol, 'sine');
            bt += dur;
            bi++;
        }

        this._nextTime = start + MELODY_DURATION;

        // Schedule next iteration ~300 ms before this one ends
        const msUntilNext = (this._nextTime - this._ctx.currentTime - 0.3) * 1000;
        this._timer = setTimeout(() => this._scheduleLoop(), Math.max(50, msUntilNext));
    }
}
