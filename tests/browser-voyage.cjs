/* Drive the actual game with keys and pointer clicks. Optional original browser captures. */
'use strict';
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require('puppeteer-core');

const root = resolve(__dirname, '..');
const sleep = ms => new Promise(done => setTimeout(done, ms));
const url = process.env.GAME_URL || pathToFileURL(resolve(root, 'game/index.html')).href;
const capture = process.env.LUMEN_CAPTURE === '1';
const work = [];

async function review() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: process.env.CHROME_SHELL === '1' ? 'shell' : true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    const issues = [];
    const origin = new URL(url).origin;
    page.on('pageerror', error => issues.push(error.message));
    page.on('response', response => { if (response.status() >= 400) issues.push(`${response.status()} ${response.url()}`); });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const dest = new URL(request.url());
      if (/^https?:$/.test(dest.protocol) && dest.origin !== origin) {
        issues.push(`Unexpected network request: ${dest.href}`);
        return request.abort();
      }
      return request.continue();
    });
    await page.setViewport({ width: 1280, height: 480, deviceScaleFactor: 1 });
    const shot = name => capture && page.screenshot({ path: resolve(root, 'screenshots', name + '.jpg'), type: 'jpeg', quality: 92 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await shot('1-cast-off');
    await page.click('#open-guide');
    assert.match(await page.$eval('#dialog-title', el => el.textContent), /Field guide/);
    await page.keyboard.press('Escape');
    await page.click('#cast-off');
    const status = () => page.evaluate(() => Lumen.readVoyage());
    await page.waitForFunction(() => Lumen.readVoyage()?.phase === 'sailing');
    await page.click('#pause-button');
    const pausedTime = (await status()).clock;
    await sleep(210);
    assert.equal((await status()).clock, pausedTime, 'pause should stop the tide clock');
    await page.keyboard.press('Escape');

    const keys = new Set();
    async function steer(...desired) {
      for (const key of keys) if (!desired.includes(key)) { await page.keyboard.up(key); keys.delete(key); }
      for (const key of desired) if (!keys.has(key)) { await page.keyboard.down(key); keys.add(key); }
    }
    async function wait(test, ms = 3300) {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        const current = await status();
        if (test(current)) return current;
        await sleep(56);
      }
      throw Error('State not reached: ' + JSON.stringify(await status()));
    }
    async function go(x, y, tolerance = 13) {
      const end = Date.now() + 5800;
      try {
        while (Date.now() < end) {
          const state = await status();
          if (state.phase === 'lost') throw Error('Skiff lost at ' + JSON.stringify(state.ship));
          if (state.phase !== 'sailing') return;
          const { x: sx, y: sy, vx, vy } = state.ship;
          if (Math.hypot(x - sx, y - sy) < tolerance) return;
          const dx = x - sx - vx * 0.095, dy = y - sy - vy * 0.095;
          const push = [];
          if (Math.abs(dx) >= 8) push.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
          if (Math.abs(dy) >= 8) push.push(dy > 0 ? 'ArrowDown' : 'ArrowUp');
          await steer(...push);
          await sleep(62);
        }
        const { ship, stage } = await status();
        throw Error(`Tide ${stage + 1} could not reach ${x},${y}: ${JSON.stringify(ship)}`);
      } finally { await steer(); }
    }
    async function hook(id, keyboard = false) {
      const state = await status();
      const lamp = state.lamps[id];
      if (keyboard) await page.keyboard.press('Space');
      else {
        const r = await page.$eval('#chart', c => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
        await page.mouse.click(r.x + r.w * lamp.x / 1240, r.y + r.h * lamp.y / 540);
      }
      await wait(s => s.line.includes(id), 600).catch(() => {
        throw Error(`Tide ${state.stage + 1}: could not hook ${id} from ${JSON.stringify(state.ship)} (lamp ${lamp.x},${lamp.y})`);
      });
    }
    async function dock(need) {
      await go(161, 270, 27);
      return wait(s => s.landed >= need);
    }
    async function advance() {
      const before = await status();
      assert.equal(before.phase, 'clear');
      work.push(`Tide ${before.stage + 1}: ${before.landed} lights banked`);
      await page.click('[data-action=advance]');
      await wait(s => s.stage === before.stage + 1 && s.phase === 'sailing');
    }
    await go(302, 270); await hook(0, true);
    await go(394, 271); await hook(1);
    await go(459, 271); await hook(2);
    await go(342, 263, 19);
    await steer('ArrowLeft');
    const convoy = await wait(s => s.ship.x < 272);
    assert.equal(convoy.line.length, 3, 'full tow should survive the turn');
    await shot('2-full-tow');
    await steer();
    await dock(3);
    await go(669, 247); await hook(4);
    await go(424, 266, 21); await dock(4);
    await advance();

    await go(289, 266); await hook(0); await hook(1);
    await go(486, 267); await hook(2);
    await go(329, 266, 19); await dock(3);
    await go(406, 260, 16); await go(571, 244, 12); await hook(3);
    await go(401, 263, 14); await dock(5);
    await advance();

    await go(382, 267); await hook(0); await hook(1); await hook(2);
    await dock(3);
    await go(399, 243, 16); await go(408, 104, 15); await hook(3);
    await go(581, 82, 16); await hook(4);
    // Take the high-water lane, allowing the newest lantern to reel in before the turn.
    await wait(s => s.clock <= 82.25, 5700);
    assert.equal((await status()).line.length, 2);
    await shot('3-black-current');
    await go(403, 83, 17); await go(408, 243, 15); await go(308, 272, 20);
    const ending = await dock(6);
    assert.equal(ending.phase, 'won');
    work.push(`Tide ${ending.stage + 1}: ${ending.landed} lights banked`);
    await page.waitForSelector('.results [data-action=start]', { visible: true });
    assert.match(await page.$eval('#dialog-title', el => el.textContent), /The coast is lit/);
    await shot('4-voyage-complete');
    await page.click('.results [data-action=start]');
    const restarted = await wait(s => s.stage === 0 && s.phase === 'sailing');
    assert.equal(restarted.score, 0);
    assert.deepEqual(issues, []);
    console.log(`Victory: ${ending.score} points. ${work.join('; ')}. Restart, pause, guide, keyboard and pointer passed.`);
  } finally { await browser.close(); }
}

review().catch(error => { console.error(error); process.exitCode = 1; });
