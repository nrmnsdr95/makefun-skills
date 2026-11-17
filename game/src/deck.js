/* Live water effects, skiff and lantern sprites, line tension, and weather tells. */
(() => {
  'use strict';
  const { math, chart, rig, chartArt } = Lumen;
  const { ring } = chartArt;
  const { clamp, distance } = math;
  const tau = Math.PI * 2;

  function radiance(ctx, x, y, radius, color, opacity) {
    const bloom = ctx.createRadialGradient(x, y, 0, x, y, radius);
    bloom.addColorStop(0, color + opacity);
    bloom.addColorStop(1, color + '00');
    ring(ctx, x, y, radius, radius);
    ctx.fillStyle = bloom; ctx.fill();
  }

  function castRing(ctx, ship, target, full) {
    if (full) return;
    ctx.save(); ctx.lineWidth = 0.9;
    ring(ctx, ship.x, ship.y, rig.range, rig.range);
    ctx.setLineDash([3, 9]); ctx.strokeStyle = target ? '#c2ffdb4a' : '#b6fbea22'; ctx.stroke();
    ctx.setLineDash([]);
    if (target) {
      const angle = Math.atan2(target.y - ship.y, target.x - ship.x);
      ring(ctx, ship.x, ship.y, rig.range, rig.range, angle - 0.235, angle + 0.235);
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#beffcf9c'; ctx.stroke();
    }
    ctx.restore();
  }

  function towLine(ctx, voyage) {
    let tug = voyage.ship;
    for (let i = 0; i < voyage.line.length; i++) {
      const lamp = voyage.line[i];
      const from = i === 0 ? { x: tug.x - Math.cos(tug.yaw) * 12, y: tug.y - Math.sin(tug.yaw) * 12 } : tug;
      const gap = distance(tug, lamp);
      const lineColor = lamp.snag > 0.05 ? '#ff937d' : lamp.reel > 0.11 ? '#ffdaa0' : '#f4c678';
      ctx.beginPath(); ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo((from.x + lamp.x) / 2, (from.y + lamp.y) / 2 + Math.max(1.5, 8 - gap / 15), lamp.x, lamp.y);
      ctx.lineWidth = 5; ctx.strokeStyle = '#0a152abf'; ctx.stroke();
      ctx.lineWidth = 2.4; ctx.strokeStyle = lineColor; ctx.stroke();
      ctx.lineWidth = 0.85; ctx.strokeStyle = '#fff2d6d9'; ctx.setLineDash([3, 8]); ctx.stroke(); ctx.setLineDash([]);
      tug = lamp;
    }
  }

  function lantern(ctx, lamp, time, targeted, tied, reduced) {
    const { x, y, charge, id } = lamp;
    const lift = reduced ? 0 : Math.sin(time * 3.1 + id * 2) * 2.9;
    const gold = charge === 2 ? '#fca7c1' : '#ffcb7c';
    const warm = charge === 2 ? '#fff1d9' : '#fff3b8';
    radiance(ctx, x, y - 3, targeted ? 51 : tied ? 37 : 42, gold, targeted ? '87' : '5c');
    const ripple = reduced ? 0.5 : (time * 0.7 + id * 0.33) % 1;
    ring(ctx, x, y + 9, 15 + ripple * 13, 6 + ripple * 7);
    ctx.lineWidth = 1.35; ctx.strokeStyle = gold; ctx.globalAlpha = 0.61 - ripple * 0.37; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(x, y + lift); ctx.scale(1, 1.13);
    ring(ctx, 1, 8, 13, 6); ctx.fillStyle = '#081220'; ctx.fill();
    ring(ctx, 0, 5, 11.5, 6); ctx.fillStyle = '#72503d'; ctx.fill(); ctx.lineWidth = 1.25; ctx.strokeStyle = gold; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(-6, -11); ctx.lineTo(0, -17); ctx.lineTo(6, -11); ctx.lineTo(8, 5); ctx.closePath();
    ctx.fillStyle = gold; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#342534'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(-3, -9); ctx.lineTo(0, -12); ctx.lineTo(3, -9); ctx.lineTo(4, 4); ctx.closePath();
    ctx.fillStyle = warm; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.moveTo(0, -10); ctx.lineTo(0, 5);
    ctx.strokeStyle = '#5b4046'; ctx.lineWidth = 1.3; ctx.stroke();
    ring(ctx, 0, -19, 3, 3); ctx.strokeStyle = warm; ctx.stroke();
    if (charge === 2 && !tied) {
      ctx.fillStyle = '#18152adc'; ctx.fillRect(12, -26, 24, 17);
      ctx.strokeStyle = gold; ctx.strokeRect(12.5, -25.5, 23, 16);
      ctx.font = '12px Plex, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe0ea'; ctx.fillText('×2', 24, -14);
    }
    if (targeted) {
      ctx.strokeStyle = '#e2ffdf'; ctx.lineWidth = 2;
      for (const [ox, oy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        ctx.beginPath(); ctx.moveTo(ox * 15, oy * 22 - 5); ctx.lineTo(ox * 23, oy * 22 - 5); ctx.lineTo(ox * 23, oy * 13 - 5); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function propwash(ctx, ship, time) {
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed < 31) return;
    const length = Math.min(144, 24 + speed * 0.28);
    const alpha = Math.min(1, speed / 310);
    ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(Math.atan2(ship.vy, ship.vx));
    const foam = ctx.createLinearGradient(-length, 0, -20, 0);
    foam.addColorStop(0, '#8fe4cc00'); foam.addColorStop(0.55, '#81e4cf59');
    foam.addColorStop(1, ship.burst ? '#baffeddf' : '#c1f8e0aa');
    ctx.globalAlpha = alpha;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const spread = 8 + i * 4;
        const flicker = Math.sin(time * 12 + i * 2) * 4;
        ctx.beginPath(); ctx.moveTo(-15 - i * 5, side * spread * 0.55);
        ctx.bezierCurveTo(-length * 0.39, side * spread * 1.5, -length * 0.65, side * (spread - flicker), -length, side * (spread * 2.7 + flicker));
        ctx.lineWidth = (i === 0 ? 2.6 : 1.35) + (ship.burst ? 1 : 0);
        ctx.strokeStyle = foam; ctx.stroke();
      }
    }
    ctx.restore();
  }

  function skiff(ctx, ship, time) {
    const { x, y, yaw, hull, grace, burst } = ship;
    ctx.save(); ctx.translate(x, y); ctx.rotate(yaw);
    if (grace) ctx.globalAlpha = 0.82 + Math.sin(time * 37) * 0.15;
    ring(ctx, -1, 4, 24, 14); ctx.fillStyle = '#031421a9'; ctx.fill();
    const beam = ctx.createLinearGradient(17, 0, 108, 0);
    beam.addColorStop(0, '#fcffd594'); beam.addColorStop(1, '#fffcd600');
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(106, -18); ctx.lineTo(106, 18); ctx.closePath();
    ctx.fillStyle = beam; ctx.fill();
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.bezierCurveTo(17, 11, 4, 14, -18, 10); ctx.lineTo(-22, 7);
    ctx.lineTo(-22, -7); ctx.lineTo(-18, -10); ctx.bezierCurveTo(4, -14, 17, -11, 26, 0); ctx.closePath();
    ctx.fillStyle = '#f1d4a1'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#081727'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(19, 0); ctx.quadraticCurveTo(10, 9, -16, 7); ctx.lineTo(-16, -7); ctx.quadraticCurveTo(10, -9, 19, 0); ctx.closePath();
    ctx.fillStyle = '#864c42'; ctx.fill();
    ctx.fillStyle = '#e98c57'; ctx.fillRect(-14, -5.2, 10, 10.4);
    for (const j of [-10, -6]) { ctx.fillStyle = '#784a35'; ctx.fillRect(j, -5, 1, 10); }
    ctx.beginPath(); ctx.roundRect(-2, -7, 14, 14, 2.6); ctx.fillStyle = '#ecab67'; ctx.fill(); ctx.strokeStyle = '#574344'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#19343b'; ctx.fillRect(6, -5.4, 3.8, 10.8); ctx.fillStyle = '#9be6d5'; ctx.fillRect(6.5, -4.9, 1.6, 9.8);
    ctx.fillStyle = '#ffe6a4'; ctx.fillRect(17, -1.7, 3.4, 3.4);
    ctx.fillStyle = hull === 1 ? '#ff8a82' : '#8effda'; ctx.fillRect(-18, -7, 2, 4); ctx.fillRect(-18, 3, 2, 4);
    if (burst > 0) radiance(ctx, -23, 0, 27, '#91ffec', 'a0');
    ctx.restore();
  }

  function rogueWake(ctx, wake, time, reduced) {
    const { x, y, yaw, radius: r } = wake;
    ctx.save(); ctx.translate(x, y); ctx.rotate(yaw);
    const trail = ctx.createLinearGradient(-95, 0, 20, 0);
    trail.addColorStop(0, '#f2a3ad00'); trail.addColorStop(0.8, '#f097a457'); trail.addColorStop(1, '#ffd9bfbc');
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-83 - 8 * i, (i - 1.5) * 12);
      ctx.bezierCurveTo(-26, (i - 1.5) * 27, -42, (i - 1.5) * 14, 16, (i - 1.5) * 8);
      ctx.lineWidth = 1.4 + 0.5 * i; ctx.strokeStyle = trail; ctx.stroke();
    }
    ctx.restore();
    radiance(ctx, x, y, r * 1.75, '#f28d9d', '7b');
    ctx.save(); ctx.translate(x, y); ctx.rotate(reduced ? 0 : time * 2.1);
    ring(ctx, 0, 0, r + 4, r + 4);
    ctx.lineWidth = 1.6; ctx.setLineDash([4, 5]); ctx.strokeStyle = '#ffc0b7ad'; ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) {
      ctx.rotate(tau / 3);
      ctx.beginPath(); ctx.moveTo(4, -r + 2); ctx.quadraticCurveTo(28, -10, 17, 6); ctx.quadraticCurveTo(17, -7, 4, -r + 2);
      ctx.fillStyle = '#f9a49e'; ctx.fill();
    }
    ring(ctx, 0, 0, 6.4, 6.4); ctx.fillStyle = '#ffd8b3'; ctx.fill();
    ring(ctx, 0, 0, 2.5, 2.5); ctx.fillStyle = '#843e59'; ctx.fill(); ctx.restore();
  }

  function surge(ctx, front) {
    const { x, y, radius, warning, wave, clock, progress } = front;
    ctx.save();
    if (warning) {
      ring(ctx, x, y, radius, radius);
      ctx.fillStyle = '#fc8d5824'; ctx.fill(); ctx.setLineDash([10, 7]); ctx.strokeStyle = '#ffb17eb3'; ctx.lineWidth = 2; ctx.stroke();
      ctx.setLineDash([]);
      ring(ctx, x, y, radius + 4, radius + 4, -Math.PI / 2, -Math.PI / 2 + tau * clock);
      ctx.strokeStyle = '#ffd7a3'; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.font = 'bold 17px Space, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffddab';
      ctx.strokeStyle = '#332633'; ctx.lineWidth = 5; ctx.strokeText('!  SURGE', x, y + 5); ctx.fillText('!  SURGE', x, y + 5);
    } else {
      ring(ctx, x, y, wave, wave);
      ctx.globalAlpha = 1 - Math.max(0, progress) * 0.39;
      ctx.strokeStyle = '#f284625f'; ctx.lineWidth = 24; ctx.stroke();
      ctx.strokeStyle = '#ffb488de'; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = '#fff2b7'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }

  class Deck {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.rng = math.random(731);
      this.reset();
      new ResizeObserver(() => this.resize()).observe(canvas);
    }

    reset() {
      this.underlay = null;
      this.particles = [];
      this.pops = [];
      this.spread = [];
      this.wakeClock = 0;
      this.shake = 0;
      this.flash = 0;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const density = Math.min(devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width * density)), h = Math.max(1, Math.floor(rect.height * density));
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    }

    points(x, y, n, color, force) {
      for (let i = 0; i < n; i++) {
        const angle = this.rng() * tau, speed = (0.18 + this.rng() * 0.82) * force;
        const life = 0.16 + this.rng() * 0.65;
        this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, left: life, life, size: 0.9 + this.rng() * 2.5, color });
      }
    }

    onEvent(e, voyage) {
      if (e.kind === 'hook') {
        this.points(e.x, e.y, 19, '#ffe19b', 93);
        this.spread.push({ x: e.x, y: e.y, left: 0.32, color: '#fff0b1' });
      }
      if (e.kind === 'boost') this.points(e.x, e.y, 21, '#a6ffe2', 110);
      if (e.kind === 'hit' || e.kind === 'snap') {
        this.points(e.x, e.y, e.kind === 'hit' ? 36 : 18, '#ffd1b3', 145);
        this.spread.push({ x: e.x, y: e.y, left: 0.32, color: '#ffac97' });
        if (e.kind === 'hit') { this.shake = 0.27; this.flash = 0.27; }
      }
      if (e.kind === 'bank') {
        this.points(e.x, e.y, 52, '#bbffe8', 160);
        this.spread.push({ x: e.x, y: e.y, left: 0.48, color: '#abffe2' });
        this.pops.push({ x: e.x + 64, y: e.y - 20, left: 1.9, value: `+${e.points}`, label: e.count === rig.slots ? 'FULL TOW' : `${e.charge} ${e.charge === 1 ? 'LIGHT' : 'LIGHTS'} BANKED` });
      }
      if (e.kind === 'repair') this.points(voyage.ship.x, voyage.ship.y, 16, '#baffdb', 56);
    }

    effects(ctx, ship, dt) {
      this.shake = Math.max(0, this.shake - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.wakeClock -= dt;
      if (this.wakeClock <= 0 && Math.hypot(ship.vx, ship.vy) > 28) {
        const stern = 17;
        for (const s of [-1, 1]) {
          const a = ship.yaw + s * 0.50;
          this.particles.push({ x: ship.x - stern * Math.cos(a), y: ship.y - stern * Math.sin(a), vx: -Math.cos(a) * 34, vy: -Math.sin(a) * 34, life: 0.74, left: 0.74, size: ship.burst ? 3.5 : 2.1, color: ship.burst ? '#a2ffed' : '#a5ddce' });
        }
        this.wakeClock = 0.039;
      }
      this.particles = this.particles.filter(p => p.left > 0);
      for (const p of this.particles) {
        p.left -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const f = Math.max(0, p.left / p.life);
        ctx.globalAlpha = f * 0.67;
        ring(ctx, p.x, p.y, p.size + (1 - f) * 4.4, p.size * 0.7 + (1 - f) * 2.1);
        ctx.fillStyle = p.color; ctx.fill();
      }
      this.spread = this.spread.filter(p => p.left > 0);
      for (const p of this.spread) {
        p.left -= dt;
        const r = 18 + Math.max(0, 0.5 - p.left) * 114;
        ring(ctx, p.x, p.y, r, r); ctx.globalAlpha = clamp(p.left * 2.2, 0, 1); ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    paint(voyage, pointer, dt) {
      if (this.tide !== voyage.tide || !this.underlay) {
        this.tide = voyage.tide; this.underlay = chartArt.prepareChart(voyage.tide);
      }
      const ctx = this.ctx;
      const time = voyage.phaseTime;
      ctx.setTransform(this.canvas.width / chart.width, 0, 0, this.canvas.height / chart.height, 0, 0);
      ctx.drawImage(this.underlay, 0, 0);
      ctx.save();
      if (this.shake && !this.reduced) ctx.translate(Math.sin(this.shake * 127) * this.shake * 15, Math.cos(this.shake * 163) * this.shake * 13);
      chartArt.movingCurrents(ctx, voyage.tide, time);
      chartArt.lightStation(ctx, time, voyage.dockTime / rig.berth, this.reduced);
      for (const front of voyage.fronts) surge(ctx, front);
      const target = voyage.line.length < rig.slots ? voyage.hookTarget(pointer) : null;
      castRing(ctx, voyage.ship, target, voyage.line.length >= rig.slots);
      propwash(ctx, voyage.ship, this.reduced ? 0 : time);
      this.effects(ctx, voyage.ship, dt);
      towLine(ctx, voyage);
      for (const lamp of voyage.lamps) if (!lamp.banked) lantern(ctx, lamp, time, lamp === target, voyage.line.includes(lamp), this.reduced);
      for (const wake of voyage.wakes) rogueWake(ctx, wake, time, this.reduced);
      skiff(ctx, voyage.ship, time);
      this.pops = this.pops.filter(p => p.left > 0);
      for (const p of this.pops) {
        p.left -= dt;
        const y = p.y - (1.9 - p.left) * 23;
        ctx.globalAlpha = clamp(p.left * 1.4, 0, 1);
        ctx.textAlign = 'center'; ctx.font = '800 29px Barlow, sans-serif';
        ctx.strokeStyle = '#14262d'; ctx.lineWidth = 6; ctx.strokeText(p.value, p.x, y); ctx.fillStyle = '#caffdc'; ctx.fillText(p.value, p.x, y);
        ctx.font = '12px Plex, monospace'; ctx.lineWidth = 4; ctx.strokeText(p.label, p.x, y + 15); ctx.fillText(p.label, p.x, y + 15);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (this.flash > 0 && !this.reduced) {
        const fog = ctx.createRadialGradient(620, 270, 250, 620, 270, 650);
        fog.addColorStop(0, '#ff7d7600'); fog.addColorStop(1, `rgba(253,102,91,${this.flash * 1.25})`);
        ctx.fillStyle = fog; ctx.fillRect(0, 0, chart.width, chart.height);
      }
    }
  }

  Lumen.Deck = Deck;
})();
