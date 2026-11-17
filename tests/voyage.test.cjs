const test = require('node:test');
const assert = require('node:assert/strict');
require('../game/src/chart.js');
require('../game/src/voyage.js');
const { Voyage, chart, tides, math, rig } = globalThis.Lumen;
const idle = { x: 0, y: 0, boost: false };
const tick = 1 / 120;
const advance = (voyage, seconds, move = idle) => {
  for (let i = 0; i < Math.round(seconds / tick); i++) voyage.step(tick, move);
};

test('every tide spawns enough lights clear of reefs and has a safe harbor', () => {
  const run = new Voyage();
  for (let i = 0; i < tides.length; i++) {
    run.loadTide(i);
    assert.ok(run.lamps.reduce((n, l) => n + l.charge, 0) >= run.tide.goal);
    assert.ok(math.distance(run.ship, chart.harbor) < chart.harbor.r);
    for (const lamp of run.lamps) {
      assert.ok(lamp.x >= chart.margin && lamp.x < chart.width - chart.margin);
      assert.ok(lamp.y >= chart.margin && lamp.y < chart.height - chart.margin);
      assert.ok(run.tide.reefs.every(reef => math.ellipseGap(lamp.x, lamp.y, reef, 6) >= 1));
    }
  }
});

test('casting is range- and line-of-sight-limited; both inputs pick a real lantern', () => {
  const run = new Voyage();
  const [first, second] = run.lamps;
  run.hook(null);
  assert.equal(run.line.length, 0);
  run.ship.x = 339;
  assert.equal(run.hookTarget(null), first);
  assert.equal(run.hookTarget(second), second);
  run.hook(second);
  assert.equal(run.line[0], second);
  const reef = run.tide.reefs[1];
  assert.ok(math.crossesReef({ x: reef[0] - 85, y: reef[1] }, { x: reef[0] + 85, y: reef[1] }, reef));
  assert.ok(!math.crossesReef({ x: reef[0] - 85, y: reef[1] + 65 }, { x: reef[0] + 85, y: reef[1] + 65 }, reef));
});

test('three-lantern berth banks pink lights twice, awards a combo and advances the route', () => {
  const run = new Voyage();
  const yellow = run.lamps.filter(lamp => lamp.charge === 1).slice(0, 2);
  const pink = run.lamps.find(lamp => lamp.charge === 2);
  run.line = [...yellow, pink];
  run.line.forEach((lamp, i) => { lamp.x = run.ship.x + (i + 1) * 45; lamp.y = run.ship.y; lamp.reel = 1.5; });
  run.ship.hull = 2;
  advance(run, 0.8);
  assert.equal(run.phase, 'clear');
  assert.equal(run.landed, 4);
  assert.equal(run.bestTow, 3);
  assert.equal(run.ship.hull, 3);
  assert.equal(run.line.length, 0);
  assert.ok(yellow.every(lamp => lamp.banked) && pink.banked);
  assert.equal(run.events.find(e => e.kind === 'bank').points, 4 * 120 + 4 * 95);
  assert.ok(run.score > 860);
  const score = run.score;
  run.loadTide(1);
  assert.equal(run.index, 1);
  assert.equal(run.score, score);
  assert.equal(run.landed, 0);
});

test('boost displaces the skiff, respects cooldown and returns to ready', () => {
  const run = new Voyage();
  const x = run.ship.x;
  advance(run, tick, { x: 1, y: 0, boost: true });
  assert.ok(run.ship.x > x);
  assert.ok(run.ship.vx > rig.speed);
  assert.equal(run.ship.boost, 0);
  advance(run, 0.23, { x: 1, y: 0, boost: true });
  assert.equal(run.events.filter(e => e.kind === 'boost').length, 1);
  advance(run, rig.boost + tick);
  assert.equal(run.ship.boost, 1);
});

test('a manual cut only releases the tail, and a reef snag releases everything downstream', () => {
  const run = new Voyage();
  run.line = run.lamps.slice(0, 3);
  run.cut(run.line.length - 1, 'TAIL', true);
  assert.deepEqual(run.line.map(lamp => lamp.id), [0, 1]);
  run.ship.x = 326; run.ship.y = 168;
  const lamp = run.line[0];
  lamp.x = 489; lamp.y = 168; lamp.snag = 0.39;
  run.tow(0.03);
  assert.equal(run.line.length, 0);
  assert.ok(run.events.some(e => e.kind === 'snap'));
});

test('the harbor protects the hull and hits outside it grant a grace period', () => {
  const run = new Voyage();
  run.harm('WAKE', run.ship.x, run.ship.y);
  assert.equal(run.ship.hull, 3);
  run.ship.x = 342;
  run.harm('WAKE', run.ship.x, run.ship.y);
  run.harm('WAKE', run.ship.x, run.ship.y);
  assert.equal(run.ship.hull, 2);
  advance(run, 1.65);
  run.harm('WAKE', run.ship.x, run.ship.y);
  assert.equal(run.ship.hull, 1);
  advance(run, 1.65);
  run.harm('WAKE', run.ship.x, run.ship.y);
  assert.equal(run.phase, 'lost');
});

test('calm waters gets more time; surges warn before expanding; timeout ends the voyage', () => {
  const run = new Voyage();
  assert.ok(new Voyage(true).clock > run.clock);
  run.loadTide(2);
  run.phaseTime = 8.6;
  assert.equal(run.surgePositions()[0].warning, true);
  run.phaseTime = 10.2;
  const front = run.surgePositions()[0];
  assert.equal(front.warning, false);
  assert.ok(front.wave < front.radius && front.wave > 0);
  run.clock = 0.01;
  advance(run, 0.12);
  assert.equal(run.phase, 'lost');
  assert.equal(run.cause, 'The tide turned');
});
