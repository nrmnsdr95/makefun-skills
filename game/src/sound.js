/* Original harbor tones and procedural surf. Nothing is streamed or decoded. */
(() => {
  'use strict';
  class Radio {
    constructor(muted) {
      this.muted = muted;
      this.nextBell = 0;
      this.verse = 0;
      this.lastMiss = -Infinity;
    }

    unlock() {
      if (this.muted) return;
      if (!this.ctx) {
        const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Context) return;
        try { this.ctx = new Context(); } catch { return; }
        const c = this.ctx;
        this.master = c.createGain();
        this.master.gain.value = 0.47;
        this.master.connect(c.destination);
        const data = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
        const samples = data.getChannelData(0);
        const rng = Lumen.math.random(801);
        for (let i = 0; i < samples.length; i++) samples[i] = rng() * 2 - 1;
        const surf = c.createBufferSource();
        surf.buffer = data; surf.loop = true;
        const falloff = c.createBiquadFilter();
        falloff.type = 'lowpass'; falloff.frequency.value = 370;
        this.ocean = c.createGain(); this.ocean.gain.value = 0;
        surf.connect(falloff).connect(this.ocean).connect(this.master);
        surf.start();
      }
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    }

    toggle() {
      this.muted = !this.muted;
      if (!this.muted) this.unlock();
      if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.47, this.ctx.currentTime, 0.022);
      return this.muted;
    }

    tone(hz, span, volume, shape = 'sine', delay = 0, downTo = hz) {
      if (this.muted || !this.ctx) return;
      const c = this.ctx, start = c.currentTime + delay;
      const note = c.createOscillator(), gate = c.createGain();
      note.type = shape;
      note.frequency.setValueAtTime(hz, start);
      note.frequency.exponentialRampToValueAtTime(downTo, start + span);
      gate.gain.setValueAtTime(0.0001, start);
      gate.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.045, span * 0.35));
      gate.gain.exponentialRampToValueAtTime(0.0001, start + span);
      note.connect(gate).connect(this.master);
      note.start(start); note.stop(start + span + 0.02);
    }

    chime(notes, speed, voice = 'sine', strength = 0.19) {
      notes.forEach((hz, i) => this.tone(hz, 0.34 + i * 0.06, strength, voice, i * speed));
    }

    event(e) {
      if (this.muted || !this.ctx) return;
      switch (e.kind) {
        case 'hook': this.chime([440 + 50 * e.count, 660 + 60 * e.count], 0.057, 'triangle', 0.14); break;
        case 'bank': this.chime(e.count === 3 ? [392, 523.25, 659.25, 783.99, 1046.5] : [392, 523.25, 659.25], 0.074); break;
        case 'boost': this.tone(98, 0.27, 0.12, 'triangle', 0, 235); this.tone(352, 0.24, 0.045, 'sine', 0.03, 156); break;
        case 'snap': this.tone(195, 0.16, 0.075, 'triangle', 0, 75); break;
        case 'hit': this.tone(138, 0.34, 0.19, 'triangle', 0, 38); break;
        case 'release': this.tone(301, 0.16, 0.12, 'sine', 0, 135); break;
        case 'repair': this.chime([783.99, 987.77], 0.092, 'sine', 0.095); break;
        case 'clear': this.chime([392, 493.88, 587.33, 783.99], 0.13, 'triangle', 0.11); break;
        case 'won': this.chime([329.63, 392, 523.25, 659.25, 783.99, 1046.5], 0.135, 'triangle', 0.14); break;
        case 'loss': this.chime([293.66, 220, 146.83], 0.16, 'triangle', 0.11); break;
        case 'launch': this.chime([293.66, 392, 523.25], 0.08, 'sine', 0.13); break;
        case 'miss':
          if (this.ctx.currentTime - this.lastMiss > 0.26) {
            this.tone(205, 0.12, 0.06, 'triangle', 0, 156);
            this.lastMiss = this.ctx.currentTime;
          }
          break;
      }
    }

    ambience(sailing, tide = 0) {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      if (this.sailing !== sailing) {
        this.ocean.gain.setTargetAtTime(sailing ? 0.105 : 0.018, t, 0.22);
        this.sailing = sailing;
      }
      if (!sailing || t < this.nextBell) return;
      const melody = [146.83, 220, 293.66, 261.63, 196, 293.66, 329.63, 220];
      const hz = melody[this.verse++ % melody.length] * [1, 1.12246, 0.8909][tide];
      this.nextBell = t + 1.6 - tide * 0.19;
      this.tone(hz, 1.6, 0.053, 'sine');
      this.tone(hz * 2, 0.77, 0.018, 'sine', 0.029);
    }
  }
  Lumen.Radio = Radio;
})();
