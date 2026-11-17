/* Hand-inked nautical chart: sea strata, cut basalt, harbor, and current vectors. */
(() => {
  'use strict';
  const { chart, math } = Lumen;
  const tau = Math.PI * 2;

  function ring(ctx, x, y, rx, ry, from = 0, to = tau) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, from, to);
  }

  function outline(ctx, points, x, y, radius = 1) {
    const p = points.map(([px, py]) => [x + px * radius, y + py * radius]);
    const last = p.at(-1);
    ctx.beginPath();
    ctx.moveTo((p[0][0] + last[0]) / 2, (p[0][1] + last[1]) / 2);
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.closePath();
  }

  function hueWash(ctx, tide) {
    const { width: w, height: h } = chart;
    const p = tide.palette;
    const sea = ctx.createLinearGradient(0, h, w, 30);
    sea.addColorStop(0, p.deep);
    sea.addColorStop(0.52, p.water);
    sea.addColorStop(1, p.deep);
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);
    const shoal = ctx.createRadialGradient(630, 222, 40, 630, 222, 600);
    shoal.addColorStop(0, p.shoal + '45');
    shoal.addColorStop(0.58, p.water + '42');
    shoal.addColorStop(1, '#020b1900');
    ctx.fillStyle = shoal;
    ctx.fillRect(0, 0, w, h);

    // Long, staggered ribbons mimic engraved maps rather than pixel noise.
    const rng = math.random(tide.seed);
    for (let i = -15; i < 29; i++) {
      const y = i * 20 + rng() * 7;
      ctx.beginPath();
      ctx.moveTo(-24, y);
      ctx.bezierCurveTo(310, y + 140, 605, y - 134, w + 55, y + 30);
      ctx.strokeStyle = i % 3 === 0 ? p.foam + '2d' : p.sky + '13';
      ctx.lineWidth = i % 3 === 0 ? 1.35 : 0.8;
      ctx.stroke();
    }
    for (let i = 0; i < 1250; i++) {
      const x = rng() * w, y = rng() * h, n = 3 + rng() * 35;
      const slant = Math.sin(x * 0.006 + y * 0.008) * 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + n * 0.45, y - 2 + slant / 2, x + n, y + slant);
      ctx.lineWidth = 0.55 + rng() * 0.65;
      ctx.strokeStyle = i % 7 === 0 ? p.sky + '38' : i % 3 === 0 ? '#040e1950' : p.foam + '17';
      ctx.stroke();
    }
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = i % 3 === 0 ? p.foam + '1e' : '#00081832';
      ctx.fillRect(rng() * w, rng() * h, 0.7 + rng() * 1.15, 0.65 + rng() * 0.7);
    }
  }

  function drawReef(ctx, [x, y, rx, ry], p, seed) {
    const rng = math.random(seed);
    const points = Array.from({ length: 18 }, (_, i) => {
      const angle = i * tau / 18;
      const r = 0.88 + rng() * 0.22;
      return [Math.cos(angle) * r * rx, Math.sin(angle) * r * ry];
    });
    outline(ctx, points, x, y, 1.43);
    ctx.fillStyle = p.shoal + '46'; ctx.fill();
    ctx.strokeStyle = p.foam + '30'; ctx.lineWidth = 0.9; ctx.stroke();
    outline(ctx, points, x, y, 1.29);
    ctx.strokeStyle = p.foam + '45'; ctx.stroke();
    outline(ctx, points, x, y, 1.15);
    ctx.fillStyle = p.bank + '52'; ctx.fill();
    ctx.strokeStyle = p.foam + '71'; ctx.lineWidth = 2.7; ctx.stroke();
    outline(ctx, points, x, y + 6, 1.015);
    ctx.fillStyle = '#03121d'; ctx.fill();
    outline(ctx, points, x, y);
    const rock = ctx.createLinearGradient(x, y - ry, x, y + ry);
    rock.addColorStop(0, p.bank);
    rock.addColorStop(0.62, p.ink);
    rock.addColorStop(1, '#091623');
    ctx.fillStyle = rock; ctx.fill();
    ctx.strokeStyle = '#081620'; ctx.lineWidth = 2; ctx.stroke();

    ctx.save();
    outline(ctx, points, x, y);
    ctx.clip();
    for (let i = 0; i < 11; i++) {
      const sx = x + (rng() - 0.5) * 2 * rx, sy = y + (rng() - 0.5) * 2 * ry;
      const a = 0.23 + rng() * 0.37;
      ctx.beginPath();
      ctx.moveTo(sx - rx * a, sy + ry * 0.17);
      ctx.lineTo(sx, sy - ry * (0.2 + rng() * 0.45));
      ctx.lineTo(sx + rx * a, sy - ry * 0.08);
      ctx.lineTo(sx + rx * a * 0.54, sy + ry * 0.33);
      ctx.closePath();
      ctx.fillStyle = i % 3 === 0 ? p.foam + '39' : i % 2 === 0 ? '#000c1980' : p.bank + '80';
      ctx.fill();
      ctx.strokeStyle = p.bank + '91'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < 80; i++) {
      const sx = x - rx + rng() * rx * 2, sy = y - ry + rng() * ry * 2;
      const span = 3 + rng() * rx * 0.17;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + span, sy - span * 0.26);
      ctx.strokeStyle = i % 4 === 0 ? p.foam + '50' : '#06111c85'; ctx.lineWidth = 0.9; ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < 24; i++) {
      const a = rng() * tau, r = 1.16 + rng() * 0.18;
      const sx = x + Math.cos(a) * rx * r, sy = y + Math.sin(a) * ry * r;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 2 + rng() * 5, sy - 1);
      ctx.strokeStyle = p.foam + '94'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  function compass(ctx, p) {
    ctx.save();
    ctx.translate(1133, 64);
    ring(ctx, 0, 0, 32, 32);
    ctx.strokeStyle = p.sky + '57'; ctx.lineWidth = 1; ctx.stroke();
    ring(ctx, 0, 0, 25, 25);
    ctx.setLineDash([2, 5]); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      const size = i % 2 ? 12 : 23;
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(4.5, -4.5); ctx.lineTo(0, 0); ctx.lineTo(-4.5, -4.5); ctx.closePath();
      ctx.fillStyle = i === 7 ? '#ffc484' : p.sky + '64'; ctx.fill();
    }
    ctx.font = '12px Plex, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = p.sky;
    ctx.fillText('N', 0, -38);
    ctx.restore();
  }

  function frameMarks(ctx, tide) {
    const { width: w, height: h } = chart;
    const p = tide.palette;
    ctx.strokeStyle = p.sky + '3d'; ctx.lineWidth = 1;
    ctx.strokeRect(12.5, 12.5, w - 25, h - 25);
    ctx.strokeStyle = p.sky + '6a';
    for (let x = 43; x < w - 25; x += 30) {
      for (const y of [13, h - 13]) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + (y < h / 2 ? 1 : -1) * (x % 60 === 13 ? 7 : 4)); ctx.stroke();
      }
    }
    for (let y = 43; y < h - 25; y += 30) {
      for (const x of [13, w - 13]) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x < w / 2 ? 4 : -4), y); ctx.stroke();
      }
    }
    ctx.font = '12px Plex, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = p.sky + 'b8';
    ctx.fillText('SURVEY / ' + tide.bearing, 30, h - 27);
    ctx.textAlign = 'center';
    for (const [x, y, label] of tide.labels) {
      ctx.fillStyle = p.sky + 'a5';
      ctx.fillText('·  ' + label + '  ·', x, y);
    }
    compass(ctx, p);
  }

  function drawWharf(ctx, tide) {
    const h = chart.harbor;
    const glow = ctx.createRadialGradient(h.x, h.y, 15, h.x, h.y, h.r * 1.3);
    glow.addColorStop(0, '#a1ffe33d'); glow.addColorStop(0.7, '#7bf1ce29'); glow.addColorStop(1, '#6df5dc00');
    ctx.fillStyle = glow;
    ring(ctx, h.x, h.y, h.r * 1.32, h.r * 1.32); ctx.fill();
    ring(ctx, h.x, h.y, h.r, h.r);
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#9bffe09f'; ctx.setLineDash([5, 6]); ctx.stroke(); ctx.setLineDash([]);
    ring(ctx, h.x, h.y, h.r + 7, h.r + 7); ctx.lineWidth = 0.9; ctx.strokeStyle = '#9bffe040'; ctx.stroke();
    drawReef(ctx, chart.breakwater, tide.palette, 711);
    ctx.save();
    ctx.translate(72, 283); ctx.rotate(-0.08);
    ctx.fillStyle = '#071821'; ctx.fillRect(-17, -9, 87, 27);
    ctx.fillStyle = '#674e43'; ctx.fillRect(-17, -13, 88, 23);
    ctx.fillStyle = '#bda381'; ctx.fillRect(-17, -14, 88, 3); ctx.fillRect(-17, 8, 88, 2);
    for (let x = -12; x <= 64; x += 7) {
      ctx.fillStyle = '#392e37'; ctx.fillRect(x, -10, 1.5, 18);
      if (x % 3 === 0) { ctx.fillStyle = '#c3ab8d'; ctx.fillRect(x, -16, 3, 5); ctx.fillRect(x, 7, 3, 5); }
    }
    ctx.restore();
    ctx.font = 'bold 14px Space, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#092520e8'; ctx.fillRect(h.x - 59, h.y + h.r - 15, 118, 26);
    ctx.strokeStyle = '#9bffe090'; ctx.strokeRect(h.x - 58.5, h.y + h.r - 14.5, 117, 25);
    ctx.fillStyle = '#b7ffe6'; ctx.fillText('✦  SAFE HARBOR', h.x, h.y + h.r - 2);
    ctx.textBaseline = 'alphabetic';
  }

  function weatherTower(ctx, reef, p) {
    const [x, y, radius] = reef;
    const height = radius > 75 ? 38 : 30;
    ctx.save(); ctx.translate(x - radius * 0.23, y + 5);
    ring(ctx, 3, 0, 16, 6); ctx.fillStyle = '#061622a8'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(0, -height); ctx.lineTo(9, 0); ctx.closePath();
    ctx.fillStyle = '#0e222ace'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = p.foam + 'ad'; ctx.stroke();
    for (let j = 1; j <= 3; j++) {
      const left = 9 * (1 - j / 4), top = -j * height / 4;
      ctx.beginPath(); ctx.moveTo(-left, top); ctx.lineTo(left, top); ctx.lineTo(-left - 2, top + height / 5); ctx.stroke();
    }
    ring(ctx, 0, -height, 3.4, 3.4); ctx.fillStyle = '#ffd398'; ctx.fill();
    ring(ctx, 0, -height, 8.5, 8.5); ctx.strokeStyle = '#ffcb8270'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  function bellWreck(ctx, reef) {
    const [x, y] = reef;
    ctx.save(); ctx.translate(x + 7, y + 8); ctx.rotate(-0.38);
    ctx.beginPath(); ctx.moveTo(-35, 0); ctx.lineTo(-21, -11); ctx.lineTo(21, -12); ctx.lineTo(36, 0); ctx.lineTo(25, 10); ctx.lineTo(-17, 14); ctx.closePath();
    ctx.fillStyle = '#0d1423'; ctx.fill(); ctx.strokeStyle = '#bc8d767d'; ctx.lineWidth = 2.3; ctx.stroke();
    ctx.strokeStyle = '#c1856d8e';
    for (let j = -19; j < 26; j += 8) {
      ctx.beginPath(); ctx.moveTo(j, 10); ctx.quadraticCurveTo(j - 1, -1, j + 6, -10); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-17, -28); ctx.lineTo(9, -19); ctx.lineTo(-13, -16);
    ctx.strokeStyle = '#ead2b493'; ctx.stroke(); ctx.restore();
  }

  function prepareChart(tide) {
    const surface = document.createElement('canvas');
    surface.width = chart.width;
    surface.height = chart.height;
    const ctx = surface.getContext('2d');
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    hueWash(ctx, tide);
    for (let i = 0; i < tide.reefs.length; i++) drawReef(ctx, tide.reefs[i], tide.palette, tide.seed * 101 + i * 888);
    if (tide.fronts.length) bellWreck(ctx, tide.reefs[3]);
    weatherTower(ctx, tide.reefs[tide.fronts.length ? 4 : 0], tide.palette);
    drawWharf(ctx, tide);
    frameMarks(ctx, tide);
    return surface;
  }

  function movingCurrents(ctx, tide, time) {
    for (const [x, y, rx, ry, dx, dy] of tide.streams) {
      const a = Math.atan2(dy, dx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ring(ctx, 0, 0, rx * 0.92, ry * 0.66);
      ctx.fillStyle = '#78bdfc14'; ctx.fill();
      ctx.clip();
      for (let i = 0; i < 36; i++) {
        const shift = ((i * 27 + time * (28 + i % 4 * 5)) % (rx * 2)) - rx;
        const cross = (i * 31 % 97 / 97 - 0.5) * ry * 1.4;
        const len = 10 + i % 5 * 5;
        ctx.beginPath(); ctx.moveTo(shift, cross); ctx.lineTo(shift + len, cross);
        if (i % 6 === 0) { ctx.lineTo(shift + len - 6, cross - 4); ctx.moveTo(shift + len, cross); ctx.lineTo(shift + len - 6, cross + 4); }
        ctx.strokeStyle = i % 6 === 0 ? tide.palette.sky + '9c' : tide.palette.sky + '48';
        ctx.lineWidth = i % 6 === 0 ? 1.6 : 1; ctx.stroke();
      }
      ctx.restore();
    }
  }

  function lightStation(ctx, time, moor, reduced) {
    const x = 70, y = 232;
    const a = reduced ? -0.32 : 0.47 * Math.sin(time * 0.61) - 0.18;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    const light = ctx.createLinearGradient(0, 0, 248, 0);
    light.addColorStop(0, '#ffd59186'); light.addColorStop(0.32, '#ffd59138'); light.addColorStop(1, '#ffd59100');
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(248, -52); ctx.lineTo(248, 52); ctx.closePath();
    ctx.fillStyle = light; ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(x, y);
    ring(ctx, 4, 33, 18, 7); ctx.fillStyle = '#020d16a7'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-11, 31); ctx.lineTo(-6, 0); ctx.lineTo(7, 0); ctx.lineTo(12, 31); ctx.closePath();
    ctx.fillStyle = '#dfc9a1'; ctx.fill(); ctx.strokeStyle = '#152a34'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9.3, 21); ctx.lineTo(-8, 12); ctx.lineTo(9, 12); ctx.lineTo(10.3, 21);
    ctx.closePath(); ctx.fillStyle = '#b96855'; ctx.fill();
    ctx.fillStyle = '#30414a'; ctx.fillRect(2, 22, 4.5, 9);
    ctx.fillStyle = '#152632'; ctx.fillRect(-9, -10, 18, 13);
    ctx.fillStyle = '#ffe1a5'; ctx.fillRect(-5.5, -8, 11, 8);
    ctx.fillStyle = '#142431'; ctx.fillRect(0, -8, 1.2, 8);
    ctx.beginPath(); ctx.moveTo(-11, -10); ctx.lineTo(0, -21); ctx.lineTo(11, -10); ctx.closePath();
    ctx.fillStyle = '#c1735f'; ctx.fill(); ctx.stroke();
    ctx.restore();
    const h = chart.harbor;
    for (const angle of [0.05, 1.28, -1.23]) {
      const sx = h.x + Math.cos(angle) * h.r, sy = h.y + Math.sin(angle) * h.r;
      ring(ctx, sx, sy, 4, 4); ctx.fillStyle = '#c4ffeb'; ctx.fill();
      ring(ctx, sx, sy, 12, 12); ctx.strokeStyle = '#94ffe75f'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (moor > 0) {
      ring(ctx, h.x, h.y, h.r + 2, h.r + 2, -Math.PI / 2, -Math.PI / 2 + tau * moor);
      ctx.strokeStyle = '#c6ffdf'; ctx.lineWidth = 5; ctx.stroke();
    }
  }

  Lumen.chartArt = { prepareChart, movingCurrents, lightStation, ring };
})();
