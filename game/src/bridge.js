/* The bridge: navigation controls, HUD, field guide, pause, and voyage debrief. */
(() => {
  'use strict';
  const { chart, rig, tides, math, Voyage, Deck, Radio } = Lumen;
  const $ = id => document.getElementById(id);
  const title = $('title-screen'), play = $('play-screen'), overlay = $('overlay'), panel = $('dialog');
  const canvas = $('chart'), visual = new Deck(canvas);
  const sprites = (name, cls = '') => `<svg aria-hidden="true" class="${cls}"><use href="#${name}"></use></svg>`;
  const lampMark = '<path d="m6 1 4.5 6L6 13 1.5 7Z"/>';
  const held = new Set(), queued = [];
  const directions = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
  const unit = 1 / 120;
  const number = (n, width = 2) => String(n).padStart(width, '0');
  const timer = sec => `${number(Math.floor(Math.ceil(sec) / 60))}:${number(Math.ceil(sec) % 60)}`;
  function pref(name, fallback = '') {
    try { return localStorage.getItem(`lumen:${name}`) ?? fallback; } catch { return fallback; }
  }
  function store(name, value) {
    try { localStorage.setItem(`lumen:${name}`, value); } catch { /* Private browsing may block storage. */ }
  }
  const audio = new Radio(pref('mute') === 'true');
  let calm = pref('calm') === 'true';
  let run = null, modal = '', pointer = null, boost = false, frameBuffer = 0, lastFrame = null;
  let hudClock = 0, hudKey = '', toastUntil = 0, backFocus = null;

  function audioButtons() {
    for (const button of document.querySelectorAll('[data-audio]')) {
      button.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound');
      button.setAttribute('aria-pressed', String(audio.muted));
      button.querySelector('use').setAttribute('href', audio.muted ? '#silent' : '#audio');
      const label = button.querySelector('span');
      if (label) label.textContent = audio.muted ? 'Sound off' : 'Sound on';
    }
  }
  function toggleAudio() { store('mute', audio.toggle()); audioButtons(); }
  function clearInput() { held.clear(); queued.length = 0; boost = false; frameBuffer = 0; pointer = null; }
  function course() {
    return {
      x: Number(held.has('ArrowRight') || held.has('KeyD')) - Number(held.has('ArrowLeft') || held.has('KeyA')),
      y: Number(held.has('ArrowDown') || held.has('KeyS')) - Number(held.has('ArrowUp') || held.has('KeyW')),
      boost,
    };
  }
  function say(text, seconds = 1.9, warning = false) {
    $('toast-text').textContent = text;
    $('toast').classList.toggle('warn', warning);
    $('toast').hidden = false;
    toastUntil = performance.now() + seconds * 1000;
  }
  function chartPoint(event) {
    const r = canvas.getBoundingClientRect();
    return { x: (event.clientX - r.left) / r.width * chart.width, y: (event.clientY - r.top) / r.height * chart.height };
  }
  function sailing() { return run?.phase === 'sailing' && !modal; }

  function setTideUI() {
    $('tide-number').textContent = `LUMEN TOW / TIDE ${number(run.index + 1)} OF ${number(tides.length)}`;
    $('tide-name').textContent = run.tide.name;
    hudKey = '';
    updateHUD();
    visual.reset(); visual.resize(); visual.paint(run, null, 0);
    say(`TIDE ${number(run.index + 1)} · ${run.tide.call.toUpperCase()}`, 2.5);
  }
  function updateHUD() {
    const { ship, line, tide, landed } = run;
    const filled = line.map(lamp => lamp.charge);
    const key = `${landed},${ship.hull},${run.score},${filled.join('')}`;
    if (key !== hudKey) {
      hudKey = key;
      $('lights-count').innerHTML = `${Math.min(landed, tide.goal)}<span>/</span>${tide.goal}`;
      $('lights-meter').setAttribute('aria-label', `${landed} lights home, quota ${tide.goal}`);
      $('light-pips').innerHTML = Array.from({ length: tide.goal }, (_, i) => `<svg class="pip${landed > i ? ' lit' : ''}" viewBox="0 0 12 14">${lampMark}</svg>`).join('');
      $('hull-pips').innerHTML = Array.from({ length: rig.hull }, (_, i) => sprites('hull', ship.hull > i ? 'intact' : '')).join('');
      $('hull-meter').setAttribute('aria-label', `Hull ${ship.hull} of ${rig.hull}`);
      $('hull-meter').classList.toggle('urgent', ship.hull === 1);
      $('score-value').textContent = number(run.score, 6);
      $('tow-pips').innerHTML = Array.from({ length: rig.slots }, (_, i) => `<span class="tow-slot${filled[i] ? ' tied' : ''}${filled[i] === 2 ? ' twice' : ''}">${sprites('light')}</span>`).join('');
      $('tow-meter').setAttribute('aria-label', `Towline ${line.length} of ${rig.slots} slots filled`);
    }
    const clockText = timer(run.clock);
    if ($('clock-value').textContent !== clockText) $('clock-value').textContent = clockText;
    $('clock-meter').classList.toggle('urgent', run.clock <= 15);
    $('boost-value').value = ship.boost;
    $('boost-label').textContent = ship.boost >= 1 ? 'Ready' : 'Charging';
    let hint = 'Hook lanterns and tow them to the green harbor.';
    if (run.dockTime > 0) hint = 'Unloading at Safe Harbor…';
    else if (line.length === rig.slots) hint = 'Full tow! Return to Safe Harbor to bank a combo.';
    else if (line.some(lamp => lamp.snag > 0.09)) hint = 'Line snagging! Back off the reef or cut the tail.';
    else if (run.hookTarget(null)) hint = 'Lantern in range — click it or press Space to hook.';
    else if (line.length) hint = 'Tow it home, or risk a longer run for more lights.';
    if ($('instruction-text').textContent !== hint) $('instruction-text').textContent = hint;
  }

  function clearPanel(restore = true) {
    const origin = backFocus;
    overlay.hidden = true; modal = ''; title.inert = false; play.inert = false; backFocus = null;
    if (restore && origin?.isConnected && !origin.closest('[hidden]')) origin.focus({ preventScroll: true });
  }
  const panelHeader = (tag, headline, copy) => `<p class="eyebrow">${sprites('light')} ${tag}</p><h2 id="dialog-title">${headline}</h2>${copy ? `<p class="lead">${copy}</p>` : ''}`;
  const button = (action, text, primary, icon = '') => `<button type="button" class="${primary ? 'primary' : 'secondary'}" data-action="${action}">${icon ? sprites(icon) : ''}${text}</button>`;
  const actionBar = (...actions) => `<div class="panel-actions">${actions.join('')}</div>`;
  function chartRoute(completed) {
    return `<ol class="route" aria-label="Voyage progress">${tides.map((t, i) => `<li class="${i < completed ? 'complete' : ''}"><span>${i < completed ? '◆  Lit' : `○  Tide ${number(i + 1)}`}</span>${t.name}</li>`).join('')}</ol>`;
  }
  const statRow = (...stats) => `<dl class="stats">${stats.map(([name, value]) => `<div><dt class="micro">${name}</dt><dd>${value}</dd></div>`).join('')}</dl>`;

  function showPanel(kind) {
    if (overlay.hidden) backFocus = document.activeElement;
    clearInput();
    modal = kind;
    play.inert = true; title.inert = true;
    panel.className = 'panel ' + kind;
    if (kind === 'guide') {
      panel.innerHTML = panelHeader('Lantern Service / Deck Manual', 'Field <em>guide.</em>', 'Bring enough light home on each tide. Three tides rekindle the coast.') +
        `<div class="guide-grid">
          <div><strong>${sprites('bolt')} 01 / Sail the skiff</strong><p><kbd>WASD</kbd> or arrow keys steer. <kbd>Shift</kbd> gives a quick burst; wait for boost to recharge.</p></div>
          <div><strong>${sprites('hook')} 02 / Cast a line</strong><p>Get inside the dotted ring, then click a lantern. <kbd>Space</kbd> hooks the nearest. Tow up to three.</p></div>
          <div><strong>${sprites('light')} 03 / Bank at harbor</strong><p>Stay in the green ring to unload. Pink lanterns count double. A full tow earns a big combo bonus.</p></div>
          <div><strong>${sprites('hull')} 04 / Read the sea</strong><p>Reefs, pink rogue wakes, and copper surges can damage your hull or snag the tow. <kbd>X</kbd> cuts the tail.</p></div>
        </div><label class="assist"><input id="calm-mode" type="checkbox" ${calm ? 'checked' : ''}> Calm waters: extra time and gentler weather</label>` +
        actionBar(button('start', 'Cast off', true, 'sail'), button('dismiss', 'Back to title', false));
    } else if (kind === 'pause') {
      panel.innerHTML = panelHeader(`Tide ${number(run.index + 1)} / ${run.tide.name}`, 'At <em>anchor.</em>', 'The clock and the currents are on hold.') +
        actionBar(button('resume', 'Resume voyage', true, 'sail'), button('start', 'Restart voyage', false), button('title', 'Title screen', false));
    } else if (kind === 'next') {
      const next = tides[run.index + 1];
      const last = run.tallies.at(-1);
      panel.innerHTML = panelHeader(`Tide ${number(run.index + 1)} / Lights home`, 'Harbor <em>lit.</em>', `<strong>Next: ${next.name}.</strong> ${next.briefing}`) +
        statRow(['Lights banked', last.charge], ['Tide score', last.score.toLocaleString('en')], ['Time + hull bonus', `+${last.bonus}`]) + chartRoute(run.tallies.length) +
        actionBar(button('advance', 'Next tide', true, 'arrow'), button('title', 'Title screen', false));
    } else {
      const won = run.phase === 'won';
      const bestKey = run.calm ? 'calm-best' : 'best';
      const previous = Math.max(0, Number(pref(bestKey)) || 0);
      const best = Math.max(run.score, previous);
      if (best > previous) store(bestKey, best);
      const grade = run.score >= 4300 ? 'Master Keeper' : run.score >= 3550 ? 'Senior Keeper' : 'Lantern Keeper';
      const headline = won ? 'The coast <em>is lit.</em>' : run.cause === 'The tide turned' ? 'The tide <em>turned.</em>' : 'Hull lost <em>at sea.</em>';
      const tagline = won ? 'All three harbors are shining again. The Lantern Service salutes you.' : 'The harbor needs another run. Cut a snagged tail early and bank in smaller trips when the sea gets rough.';
      panel.innerHTML = panelHeader(won ? `Voyage complete / ${grade}` : 'Voyage ended / Salvage report', headline, tagline) +
        statRow(['Final score', run.score.toLocaleString('en')], ['Lights home', run.totalCharge], ['Best tow', `${run.bestTow} / ${rig.slots}`]) +
        chartRoute(run.tallies.length) + `<p class="high">${run.score > previous ? 'New personal best' : 'Personal best'} ${best.toLocaleString('en')} · ${timer(run.activeTime)} under sail${run.calm ? ' · Calm waters' : ''}</p>` +
        actionBar(button('start', 'Play again', true, 'sail'), button('title', 'Title screen', false));
    }
    overlay.hidden = false;
    panel.querySelector('.primary')?.focus({ preventScroll: true });
  }

  function returnToTitle() {
    clearInput(); clearPanel(false);
    play.hidden = true; title.hidden = false; run = null;
    $('cast-off').focus({ preventScroll: true });
  }
  function launch() {
    clearInput(); clearPanel(false);
    audio.unlock(); audio.event({ kind: 'launch' });
    run = new Voyage(calm); title.hidden = true; play.hidden = false;
    setTideUI(); canvas.focus({ preventScroll: true });
  }
  function resume() {
    clearInput(); clearPanel(false);
    canvas.focus({ preventScroll: true });
  }
  function advance() {
    clearInput(); clearPanel(false);
    run.loadTide(run.index + 1); setTideUI(); audio.event({ kind: 'launch' });
    canvas.focus({ preventScroll: true });
  }
  const actions = { start: launch, dismiss: () => clearPanel(), resume, advance, title: returnToTitle };
  panel.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (action) actions[action]();
  });
  panel.addEventListener('change', event => {
    if (event.target.id === 'calm-mode') { calm = event.target.checked; store('calm', calm); }
  });
  $('cast-off').addEventListener('click', launch);
  $('open-guide').addEventListener('click', () => showPanel('guide'));
  $('pause-button').addEventListener('click', () => { if (sailing()) showPanel('pause'); });
  for (const button of document.querySelectorAll('[data-audio]')) button.addEventListener('click', toggleAudio);
  audioButtons();

  canvas.tabIndex = -1;
  canvas.addEventListener('pointermove', event => { if (sailing()) pointer = chartPoint(event); });
  canvas.addEventListener('pointerleave', () => { pointer = null; });
  canvas.addEventListener('pointerdown', event => {
    if (!sailing()) return;
    if (event.button === 0) { pointer = chartPoint(event); queued.push({ kind: 'hook', pointer }); }
    if (event.button === 2) queued.push({ kind: 'release' });
    if (event.button === 0 || event.button === 2) { event.preventDefault(); canvas.focus({ preventScroll: true }); audio.unlock(); }
  });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  for (const pad of document.querySelectorAll('[data-steer]')) {
    const key = pad.dataset.steer;
    pad.addEventListener('pointerdown', event => {
      if (!sailing()) return;
      event.preventDefault(); pad.setPointerCapture(event.pointerId); held.add(key);
    });
    for (const kind of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(kind, () => held.delete(key));
  }
  $('touch-hook').addEventListener('click', () => { if (sailing()) queued.push({ kind: 'hook', pointer: null }); });
  $('touch-boost').addEventListener('click', () => { if (sailing()) boost = true; });

  function trapFocus(event) {
    const all = Array.from(panel.querySelectorAll('button,input'));
    const first = all[0], last = all.at(-1);
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const code = event.code;
    const native = event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement;
    if (modal && code === 'Tab') { trapFocus(event); return; }
    if (!event.repeat && code === 'KeyM') { toggleAudio(); return; }
    if (code === 'Escape' || code === 'KeyP') {
      if (event.repeat) return;
      if (modal === 'guide') { clearPanel(); event.preventDefault(); }
      else if (modal === 'pause') { resume(); event.preventDefault(); }
      else if (modal && code === 'Escape') { returnToTitle(); event.preventDefault(); }
      else if (sailing()) { showPanel('pause'); event.preventDefault(); }
      return;
    }
    if (!run && !modal && code === 'Enter' && !native && !event.repeat) { event.preventDefault(); launch(); return; }
    if (!run && !modal && event.key === '?') { event.preventDefault(); showPanel('guide'); return; }
    if (!sailing()) return;
    if (directions.has(code)) { held.add(code); event.preventDefault(); }
    else if (code === 'Space' && !native) {
      event.preventDefault(); if (!event.repeat) queued.push({ kind: 'hook', pointer: null });
    } else if ((code === 'ShiftLeft' || code === 'ShiftRight') && !event.repeat) boost = true;
    else if (code === 'KeyX' && !event.repeat) queued.push({ kind: 'release' });
  });
  document.addEventListener('keyup', event => held.delete(event.code));
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden && sailing()) showPanel('pause'); });

  function handleEvent(e) {
    visual.onEvent(e, run); audio.event(e);
    switch (e.kind) {
      case 'miss': say(e.label, 1.2, true); break;
      case 'hook': say(`LANTERN HOOKED · ${e.count} / ${rig.slots} ON TOW`, 1.0); break;
      case 'bank': say(e.count === rig.slots ? `FULL TOW · +${e.points} POINTS` : `${e.charge} ${e.charge === 1 ? 'LIGHT' : 'LIGHTS'} HOME · +${e.points}`, 1.9); break;
      case 'hit': case 'snap': say(e.label, 1.7, true); break;
      case 'release': say('TAIL RELEASED', 1.15); break;
      case 'repair': say('HARBOR SERVICE · HULL PATCHED', 1.9); break;
      case 'clear': showPanel('next'); break;
      case 'won': case 'loss': showPanel('results'); break;
    }
    hudKey = '';
  }
  function frame(now) {
    const dt = lastFrame === null ? 0 : math.clamp((now - lastFrame) / 1000, 0, 0.08);
    lastFrame = now;
    if (run) {
      const active = sailing();
      if (active) {
        frameBuffer += dt;
        while (frameBuffer >= unit && run.phase === 'sailing') {
          for (const e of queued.splice(0)) {
            if (e.kind === 'hook') run.hook(e.pointer);
            else run.cut(run.line.length - 1, 'TAIL RELEASED', true);
          }
          run.step(unit, course());
          boost = false; frameBuffer -= unit;
        }
        for (const e of run.events.splice(0)) handleEvent(e);
        const forceHUD = !hudKey || now >= hudClock;
        if (forceHUD) { updateHUD(); hudClock = now + 83; }
      }
      visual.paint(run, pointer, active ? dt : 0);
      if (now > toastUntil && !$('toast').hidden) $('toast').hidden = true;
    }
    audio.ambience(sailing(), run?.index);
    requestAnimationFrame(frame);
  }
  // Read-only chart coordinates for replaying real keyboard/pointer input in browser tests.
  Lumen.readVoyage = () => run?.summary() ?? null;
  requestAnimationFrame(frame);
})();
