/* Fixed-step navigation, elastic towlines, and tide scoring. No browser APIs. */
(() => {
  'use strict';
  const { chart, rig, tides, math } = Lumen;
  const { distance, clamp, ellipseGap, angleDelta } = math;

  function driftAt(tide, x, y) {
    let vx = 0, vy = 0;
    for (const [cx, cy, rx, ry, dx, dy] of tide.streams) {
      const across = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      const pull = Math.max(0, 1 - across);
      vx += dx * pull;
      vy += dy * pull;
    }
    return [vx, vy];
  }

  function trimVelocity(body, limit) {
    const speed = Math.hypot(body.vx, body.vy);
    if (speed > limit) {
      body.vx *= limit / speed;
      body.vy *= limit / speed;
    }
  }

  function trimToChart(body, size) {
    const left = chart.margin + size, right = chart.width - left, bottom = chart.height - left;
    if (body.x < left || body.x > right) {
      body.x = clamp(body.x, left, right);
      body.vx *= -0.26;
    }
    if (body.y < left || body.y > bottom) {
      body.y = clamp(body.y, left, bottom);
      body.vy *= -0.26;
    }
  }

  function brushReef(body, reefs, padding) {
    let impact = 0;
    for (const reef of reefs) {
      let gap = ellipseGap(body.x, body.y, reef, padding);
      if (gap >= 1) continue;
      const [cx, cy, rx, ry] = reef;
      if (gap < 0.0001) { body.x = cx + 0.1; gap = ellipseGap(body.x, body.y, reef, padding); }
      body.x = cx + (body.x - cx) / gap * 1.001;
      body.y = cy + (body.y - cy) / gap * 1.001;
      const ex = (body.x - cx) / (rx + padding) ** 2;
      const ey = (body.y - cy) / (ry + padding) ** 2;
      const magnitude = Math.hypot(ex, ey) || 1;
      const nx = ex / magnitude, ny = ey / magnitude;
      const toward = nx * body.vx + ny * body.vy;
      if (toward < 0) {
        impact = Math.max(impact, -toward);
        body.vx -= toward * 1.35 * nx;
        body.vy -= toward * 1.35 * ny;
      }
    }
    return impact;
  }

  class Voyage {
    constructor(calm = false) {
      this.calm = calm;
      this.score = 0;
      this.totalCharge = 0;
      this.bestTow = 0;
      this.damage = 0;
      this.activeTime = 0;
      this.tallies = [];
      this.events = [];
      this.loadTide(0);
    }

    loadTide(index) {
      this.index = index;
      this.tide = tides[index];
      this.reefs = [...this.tide.reefs, chart.breakwater];
      this.phase = 'sailing';
      this.phaseTime = 0;
      this.clock = this.tide.seconds + (this.calm ? 22 : 0);
      this.landed = 0;
      this.tideScore = this.score;
      this.dockTime = 0;
      this.repair = true;
      this.cause = '';
      this.ship = { x: chart.harbor.x + 19, y: chart.harbor.y, vx: 0, vy: 0, yaw: 0, hull: rig.hull, grace: 0, burst: 0, boost: 1 };
      this.line = [];
      this.lamps = this.tide.lamps.map(([x, y, charge = 1], id) => ({ id, x, y, vx: 0, vy: 0, charge, banked: false, snag: 0, reel: 0 }));
      this.wakes = this.wakePositions();
      this.fronts = [];
      this.events = [];
    }

    emit(kind, data = {}) {
      this.events.push({ kind, x: this.ship.x, y: this.ship.y, ...data });
    }

    wakePositions() {
      const speed = this.calm ? 0.77 : 1;
      return this.tide.wakes.map(([x, y, rx, ry, arc, offset, radius]) => {
        const a = this.phaseTime * arc * speed + offset;
        return { x: x + rx * Math.cos(a), y: y + ry * Math.sin(a), yaw: Math.atan2(ry * Math.cos(a) * arc, -rx * Math.sin(a) * arc), radius };
      });
    }

    surgePositions() {
      return this.tide.fronts.flatMap(([x, y, radius, beat], id) => {
        const age = this.phaseTime - beat;
        if (age < 0) return [];
        const pulse = age % (15.8 + id * 1.25);
        const delay = this.calm ? 2.25 : 1.6;
        if (pulse > delay + 0.77) return [];
        const progress = (pulse - delay) / 0.77;
        return [{ x, y, radius, warning: progress < 0, clock: pulse / delay, wave: radius * (0.13 + 0.87 * Math.max(0, progress)), progress }];
      });
    }

    canHook(lamp) {
      if (lamp.banked || this.line.includes(lamp) || distance(this.ship, lamp) > rig.range) return false;
      return !this.reefs.some(reef => math.crossesReef(this.ship, lamp, reef, 3));
    }

    hookTarget(pointer) {
      let best = null, priority = Infinity;
      const a = pointer && Math.atan2(pointer.y - this.ship.y, pointer.x - this.ship.x);
      for (const lamp of this.lamps) {
        if (!this.canHook(lamp)) continue;
        const range = distance(this.ship, lamp);
        let score = range;
        if (pointer) {
          const touch = distance(pointer, lamp);
          const bearing = Math.atan2(lamp.y - this.ship.y, lamp.x - this.ship.x);
          const spread = Math.abs(angleDelta(a, bearing));
          if (touch > 39 && spread > 0.28) continue;
          score = touch <= 39 ? touch - 100 : range + spread * 250;
        }
        if (score < priority) { best = lamp; priority = score; }
      }
      return best;
    }

    hook(pointer) {
      if (this.phase !== 'sailing') return;
      if (this.line.length >= rig.slots) { this.emit('miss', { label: 'TOW FULL · HEAD TO HARBOR' }); return; }
      const lamp = this.hookTarget(pointer);
      if (!lamp) { this.emit('miss', { label: 'NO LANTERN IN REACH' }); return; }
      lamp.reel = 1.5;
      lamp.snag = 0;
      this.line.push(lamp);
      this.emit('hook', { x: lamp.x, y: lamp.y, count: this.line.length, charge: lamp.charge });
    }

    cut(from, cause, quiet = false) {
      if (from < 0 || from >= this.line.length) return;
      const released = this.line.splice(from);
      for (const lamp of released) { lamp.reel = 0; lamp.snag = 0; }
      this.emit(quiet ? 'release' : 'snap', { x: released[0].x, y: released[0].y, count: released.length, label: cause });
    }

    harm(cause, x, y) {
      const ship = this.ship;
      if (ship.grace > 0 || distance(ship, chart.harbor) < chart.harbor.r) return;
      ship.hull--;
      ship.grace = this.calm ? 2.3 : 1.55;
      this.damage++;
      if (this.line.length) this.cut(this.line.length - 1, 'TAIL LANTERN DROPPED');
      this.emit('hit', { x, y, label: `${cause} · HULL ${ship.hull}/${rig.hull}` });
      if (ship.hull === 0) this.end('Hull lost at sea');
    }

    end(cause) {
      this.cause = cause;
      this.phase = 'lost';
      this.emit('loss');
    }

    sail(dt, { x, y, boost }) {
      const ship = this.ship;
      ship.grace = Math.max(0, ship.grace - dt);
      ship.boost = Math.min(1, ship.boost + dt / rig.boost);
      ship.burst = Math.max(0, ship.burst - dt);
      const steer = Math.hypot(x, y);
      if (steer > 0) {
        x /= steer; y /= steer;
        ship.yaw += angleDelta(ship.yaw, Math.atan2(y, x)) * Math.min(1, 13 * dt);
      }
      if (boost && ship.boost === 1) {
        ship.boost = 0;
        ship.burst = 0.31;
        ship.vx = (steer ? x : Math.cos(ship.yaw)) * 456;
        ship.vy = (steer ? y : Math.sin(ship.yaw)) * 456;
        this.emit('boost');
      }
      const load = this.line.length;
      const [cx, cy] = driftAt(this.tide, ship.x, ship.y);
      const pull = !steer && distance(ship, chart.harbor) < chart.harbor.r ? 6.2 : 2.85;
      const force = 910 / (1 + load * 0.115);
      ship.vx = ship.vx * Math.exp(-pull * dt) + (x * force + cx * 2.1) * dt;
      ship.vy = ship.vy * Math.exp(-pull * dt) + (y * force + cy * 2.1) * dt;
      trimVelocity(ship, ship.burst ? 467 : rig.speed / (1 + load * 0.095) + Math.hypot(cx, cy) * 0.26);
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      trimToChart(ship, 13);
      if (brushReef(ship, this.reefs, 13) > (this.calm ? 175 : 136)) this.harm('REEF STRIKE', ship.x, ship.y);
    }

    tow(dt) {
      let tug = this.ship;
      for (let i = 0; i < this.line.length; i++) {
        const lamp = this.line[i];
        const slack = lamp.reel > 0;
        lamp.reel = Math.max(0, lamp.reel - dt);
        const dx = tug.x - lamp.x, dy = tug.y - lamp.y;
        const gap = Math.hypot(dx, dy) || 0.01;
        const nx = dx / gap, ny = dy / gap;
        const relative = nx * (tug.vx - lamp.vx) + ny * (tug.vy - lamp.vy);
        const tension = Math.max(0, (gap - rig.link) * (slack ? 32 : 24) + relative * 5.5);
        lamp.vx += nx * tension * dt;
        lamp.vy += ny * tension * dt;
        // Short-range repulsion keeps a slow, docked line from stacking into one sprite.
        if (gap < 27) { lamp.vx -= nx * (27 - gap) * 27 * dt; lamp.vy -= ny * (27 - gap) * 27 * dt; }
        if (gap < rig.link + 18 && lamp.reel < 1.27) lamp.reel = 0;
        const snagged = !slack && (gap > 118 || this.reefs.some(reef => math.crossesReef(tug, lamp, reef, 1)));
        lamp.snag = snagged ? lamp.snag + dt : Math.max(0, lamp.snag - 2 * dt);
        if (lamp.snag > 0.4) { this.cut(i, 'LINE SNAG · WIDEN YOUR TURN'); break; }
        tug = lamp;
      }
      for (const lamp of this.lamps) {
        if (lamp.banked) continue;
        const tied = this.line.includes(lamp);
        const [x, y] = tied ? driftAt(this.tide, lamp.x, lamp.y) : [0, 0];
        const drag = Math.exp(-(tied ? 2.3 : 5.8) * dt);
        lamp.vx = lamp.vx * drag + x * 2.4 * dt;
        lamp.vy = lamp.vy * drag + y * 2.4 * dt;
        trimVelocity(lamp, tied ? 430 : 95);
        lamp.x += lamp.vx * dt;
        lamp.y += lamp.vy * dt;
        trimToChart(lamp, 7);
        brushReef(lamp, this.reefs, 7);
      }
    }

    weather() {
      this.wakes = this.wakePositions();
      this.fronts = this.surgePositions();
      const ship = this.ship;
      for (const wake of this.wakes) {
        if (distance(ship, wake) < wake.radius + 9) this.harm('HIT BY A ROGUE WAKE', ship.x, ship.y);
        const snag = this.line.findIndex(lamp => lamp.reel === 0 && distance(lamp, wake) < wake.radius + 3);
        if (snag >= 0) this.cut(snag, 'ROGUE WAKE CUT THE LINE');
      }
      for (const front of this.fronts) {
        if (front.warning) continue;
        if (Math.abs(distance(ship, front) - front.wave) < 13) this.harm('CAUGHT IN A SURGE', ship.x, ship.y);
        const snag = this.line.findIndex(lamp => lamp.reel === 0 && Math.abs(distance(lamp, front) - front.wave) < 11);
        if (snag >= 0) this.cut(snag, 'SURGE CUT THE LINE');
      }
    }

    moor(dt) {
      if (!this.line.length || distance(this.ship, chart.harbor) > chart.harbor.r - 5) { this.dockTime = 0; return; }
      this.dockTime += dt;
      if (this.dockTime < rig.berth) return;
      const count = this.line.length;
      const charge = this.line.reduce((sum, lamp) => sum + lamp.charge, 0);
      const points = charge * 120 + (count - 1) ** 2 * 95;
      for (const lamp of this.line) lamp.banked = true;
      this.line.length = 0;
      this.dockTime = 0;
      this.landed += charge;
      this.totalCharge += charge;
      this.bestTow = Math.max(this.bestTow, count);
      this.score += points;
      this.emit('bank', { x: chart.harbor.x, y: chart.harbor.y, count, charge, points });
      if (this.repair && this.ship.hull < rig.hull) {
        this.ship.hull++;
        this.repair = false;
        this.emit('repair');
      }
      if (this.landed < this.tide.goal) return;
      const bonus = Math.floor(this.clock) * 5 + this.ship.hull * 60;
      this.score += bonus;
      this.tallies.push({ name: this.tide.name, charge: this.landed, score: this.score - this.tideScore, bonus });
      this.phase = this.index + 1 === tides.length ? 'won' : 'clear';
      this.emit(this.phase, { bonus });
    }

    step(dt, steer) {
      if (this.phase !== 'sailing') return;
      this.activeTime += dt;
      this.phaseTime += dt;
      this.clock = Math.max(0, this.clock - dt);
      this.sail(dt, steer);
      if (this.phase !== 'sailing') return;
      this.tow(dt);
      this.weather();
      if (this.phase !== 'sailing') return;
      this.moor(dt);
      if (this.clock <= 0 && this.phase === 'sailing') this.end('The tide turned');
    }

    summary() {
      const { x, y, vx, vy, hull } = this.ship;
      return {
        stage: this.index, phase: this.phase, clock: this.clock, score: this.score, landed: this.landed, goal: this.tide.goal,
        ship: { x, y, vx, vy, hull }, line: this.line.map(lamp => lamp.id), lamps: this.lamps.map(({ id, x, y, banked }) => ({ id, x, y, banked })),
      };
    }
  }

  Lumen.Voyage = Voyage;
})();
