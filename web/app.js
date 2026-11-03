// Burn Box web app: hand over a file or link, watch the box live, read the verdict and keep the receipt.
(() => {
  const $ = (s) => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const P = (x, y, z, s) => [(x - y) * 0.866 * s, (x + y) * 0.5 * s - z * s];
  const poly = (pts) => pts.map((p) => p.join(',')).join(' ');
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f))); return `rgb(${ch.join(',')})`; };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Logo and the empty-frame drop icon.
  (() => {
    const g = $('#logo'), s = 48, c = '#9bb0a6';
    el('polygon', { points: poly([P(-.5, -.5, .5, s), P(.5, -.5, .5, s), P(.5, .5, .5, s), P(-.5, .5, .5, s)]), fill: shade(c, .28) }, g);
    el('polygon', { points: poly([P(-.5, .5, -.5, s), P(.5, .5, -.5, s), P(.5, .5, .5, s), P(-.5, .5, .5, s)]), fill: c }, g);
    el('polygon', { points: poly([P(.5, -.5, -.5, s), P(.5, .5, -.5, s), P(.5, .5, .5, s), P(.5, -.5, .5, s)]), fill: shade(c, -.16) }, g);
    const [cx, cy] = P(.5, 0, 0, s);
    el('ellipse', { rx: s * .26, ry: s * .26, fill: '#e8336f', transform: `matrix(-0.866,0.5,0,-1,${cx},${cy})` }, g);
    const o = $('#open-cube');
    const st = { fill: 'none', stroke: 'currentColor', 'stroke-width': 3.5, 'stroke-linejoin': 'round', opacity: .5 };
    el('polygon', { points: poly([P(-.5, -.5, .5, s), P(.5, -.5, .5, s), P(.5, -.5, -.5, s), P(.5, .5, -.5, s), P(-.5, .5, -.5, s), P(-.5, .5, .5, s)]), ...st }, o);
    el('polyline', { points: poly([P(-.5, .5, .5, s), P(.5, .5, .5, s), P(.5, -.5, .5, s)]), ...st }, o);
    el('polyline', { points: poly([P(.5, .5, .5, s), P(.5, .5, -.5, s)]), ...st }, o);
  })();

  function stamp(svg) {
    el('circle', { r: 54, fill: 'rgba(251,250,247,.85)', stroke: '#e8336f', 'stroke-width': 4 }, svg);
    el('circle', { r: 38, fill: 'none', stroke: '#e8336f', 'stroke-width': 2 }, svg);
    const id = `a-${svg.id}`; const d = el('defs', {}, svg);
    el('path', { id, d: 'M-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0' }, d);
    const t = el('text', { fill: '#e8336f', 'font-family': 'IBM Plex Mono, monospace', 'font-size': 11, 'font-weight': 600, 'letter-spacing': 2.2 }, svg);
    el('textPath', { href: `#${id}` }, t).textContent = 'DESTROYED · SIGNED · NO SURVIVORS · ';
    const b = el('text', { 'text-anchor': 'middle', y: 9, fill: '#e8336f', 'font-family': 'Bricolage Grotesque, Arial Narrow, sans-serif', 'font-size': 24, 'font-weight': 800 }, svg);
    b.textContent = 'BURNED';
  }
  stamp($('#stamp')); stamp($('#stamp2'));

  // The glass box.
  const box = $('#box');
  const S = 150;
  const defs = el('defs', {}, box);
  const rg = el('radialGradient', { id: 'chrome', cx: '34%', cy: '30%', r: '75%' }, defs);
  [['0', '#fff'], ['.12', '#eef0f3'], ['.45', '#a9afb6'], ['.72', '#5c6269'], ['.92', '#c9cdd2']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, rg));
  el('ellipse', { cx: 0, cy: 118, rx: 170, ry: 34, fill: '#000', opacity: .07 }, box);
  const boxG = el('g', {}, box);
  const face = (pts, fill, op) => el('polygon', { points: poly(pts.map(([x, y, z]) => P(x, y, z, S))), fill, 'fill-opacity': op, stroke: '#ffffff', 'stroke-opacity': .7, 'stroke-width': 1.5 }, boxG);
  face([[-.5, -.5, -.5], [.5, -.5, -.5], [.5, .5, -.5], [-.5, .5, -.5]], '#b9c9c3', .9);
  face([[-.5, -.5, -.5], [-.5, .5, -.5], [-.5, .5, .5], [-.5, -.5, .5]], '#c4d8d2', .55);
  face([[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5]], '#d3e2dd', .55);
  const sample = el('g', {}, boxG);
  const [sx, sy] = P(0, 0, -.5, S);
  el('ellipse', { cx: sx, cy: sy + 2, rx: 40, ry: 12, fill: '#000', opacity: .12 }, sample);
  const ball = el('circle', { cx: sx, cy: sy - 40, r: 42, fill: 'url(#chrome)' }, sample);
  const fronts = [
    face([[-.5, .5, -.5], [.5, .5, -.5], [.5, .5, .5], [-.5, .5, .5]], '#c4d8d2', .32),
    face([[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]], '#b7ccc6', .32),
    face([[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]], '#e3eeea', .42),
  ];
  const sparks = el('g', {}, box);
  function spark() {
    if (reduced) return;
    const a = Math.random() * Math.PI * 2;
    const [x0, y0] = [sx + Math.cos(a) * 30, sy - 40 + Math.sin(a) * 20];
    const [x1, y1] = [sx + Math.cos(a) * 112, sy - 40 + Math.sin(a) * 72];
    const l = el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: '#e92b0c', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '6 8' }, sparks);
    const hit = el('circle', { cx: x1, cy: y1, r: 7, fill: 'none', stroke: '#e92b0c', 'stroke-width': 2.5 }, sparks);
    fronts.forEach((f) => f.setAttribute('stroke', '#e92b0c'));
    setTimeout(() => { l.remove(); hit.remove(); fronts.forEach((f) => f.setAttribute('stroke', '#ffffff')); }, 420);
  }
  function resetBox(kind) {
    boxG.style.transition = 'none'; boxG.style.opacity = '1'; boxG.style.transform = 'none';
    ball.setAttribute('fill', 'url(#chrome)'); sample.style.opacity = kind === 'link' ? '0' : '1';
    $('#stamp').classList.remove('on'); $('#shot').classList.remove('on');
  }
  function burnBox() {
    boxG.style.transition = 'opacity .8s ease, transform .8s ease'; boxG.style.transformOrigin = '0 0';
    boxG.style.opacity = '.12'; boxG.style.transform = 'scale(.92)';
    $('#shot').classList.remove('on'); $('#stamp').classList.add('on');
  }

  // API.
  const api = async (path, opts) => {
    const r = await fetch(path, opts);
    const ct = r.headers.get('content-type') ?? '';
    const body = ct.includes('json') ? await r.json() : await r.text();
    if (!r.ok) throw new Error(body?.error ?? `The server said ${r.status}`);
    return body;
  };
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); }

  // Health: is the box ready?
  api('/api/health').then((h) => {
    const ok = h.sandbox.docker && h.sandbox.box;
    $('#where').innerHTML = `<i style="background:${ok ? 'var(--sage-deep)' : 'var(--signal)'}"></i>Vultr · ${ok ? 'Box Ready' : 'Box Offline'}${h.inference === 'vultr' ? ' · Vultr Inference' : ''}`;
  }).catch(() => { $('#where').innerHTML = '<i style="background:var(--signal)"></i>Server Unreachable'; });

  // Views.
  function show(v) {
    for (const k of ['new', 'run', 'verdict', 'past']) $(`#v-${k}`).hidden = k !== v;
    document.querySelectorAll('.nav button').forEach((b) => b.setAttribute('aria-current', (b.dataset.go === v || (v !== 'past' && b.dataset.go === 'new')) ? 'page' : 'false'));
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.go === 'new') reset();
    if (b.dataset.go === 'past') loadPast();
    show(b.dataset.go);
  }));

  // Intake.
  let choice = null; // { type: 'sample'|'file'|'url', ... }
  let mode = 'file';
  function setMode(m) {
    mode = m;
    $('#m-file').setAttribute('aria-pressed', String(m === 'file'));
    $('#m-link').setAttribute('aria-pressed', String(m === 'link'));
    const chosen = !$('#chosen').hidden;
    $('#file-pane').hidden = m !== 'file' || chosen;
    $('#link-pane').hidden = m !== 'link' || chosen;
  }
  $('#m-file').addEventListener('click', () => { reset(); setMode('file'); });
  $('#m-link').addEventListener('click', () => { reset(); setMode('link'); $('#link').focus(); });
  function showChosen(name, sub, color) {
    const c = $('#chosen'); c.hidden = false;
    c.querySelector('i').style.background = color; c.querySelector('b').textContent = name; c.querySelector('span').textContent = sub;
    $('#file-pane').hidden = true; $('#link-pane').hidden = true;
    $('#detonate').disabled = false;
  }
  function reset() {
    choice = null; $('#chosen').hidden = true; $('#detonate').disabled = true; $('#link').value = ''; $('#file-in').value = '';
    document.querySelectorAll('.sample').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    setMode(mode);
  }
  $('#clear').addEventListener('click', reset);
  const colors = { invoice: 'var(--clay)', phish: 'var(--blush)', benign: 'var(--mint)' };
  document.querySelectorAll('.sample').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.sample;
    const isLink = id === 'phish';
    setMode(isLink ? 'link' : 'file');
    choice = { type: 'sample', id, name: b.querySelector('b').textContent, kind: isLink ? 'link' : 'file' };
    document.querySelectorAll('.sample').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    showChosen(choice.name, isLink ? 'Test link · opens in a browser inside the box' : 'Test file · self-written, harmless outside the box', colors[id]);
  }));
  const drop = $('#drop'), fileIn = $('#file-in');
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) takeFile(f); });
  fileIn.addEventListener('change', () => { if (fileIn.files[0]) takeFile(fileIn.files[0]); });
  function takeFile(f) {
    if (f.size > 25 * 1024 * 1024) { toast('Files can be up to 25 MB.'); return; }
    const kb = f.size < 1048576 ? `${Math.max(1, Math.round(f.size / 1024))} KB` : `${(f.size / 1048576).toFixed(1)} MB`;
    choice = { type: 'file', file: f, name: f.name, kind: 'file' };
    showChosen(f.name, `${kb} · ready to detonate`, 'var(--sage)');
  }
  $('#link').addEventListener('input', (e) => {
    const v = e.target.value.trim();
    const ok = /^https?:\/\/[^\s/]+\.[^\s]+/.test(v);
    $('#detonate').disabled = !ok;
    choice = ok ? { type: 'url', url: v, name: v.replace(/^https?:\/\//, ''), kind: 'link' } : null;
  });
  $('#link').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('#detonate').disabled) start(); });
  $('#detonate').addEventListener('click', start);

  // Run view.
  const STEPS = ['Seal', 'Plant Canaries', 'Detonate', 'Record', 'Burn', 'Verdict'];
  const setStep = (i) => { $('#steps').innerHTML = STEPS.map((s, k) => `<span class="step ${k < i ? 'ok' : k === i ? 'now' : ''}">${s}</span>`).join(''); };
  const CANARY_LABEL = { cloud_key: 'Cloud Key', wallet: 'Wallet', password: 'Password', login: 'Fake Login' };
  let counts, queue, draining, current;
  const hhmmss = (iso) => (iso ? new Date(iso).toISOString().slice(11, 19) : '');

  function line(kind, verb, text, at) {
    const ln = document.createElement('div'); ln.className = `ln t-${kind}`;
    ln.innerHTML = `<time>${hhmmss(at)}</time><b>${esc(verb)}</b><span>${esc(text)}</span>`;
    const tr = $('#trace'); tr.querySelector('.cursor')?.before(ln); tr.scrollTop = tr.scrollHeight;
  }
  function bump(k) { counts[k] += 1; $(`#c-${k} b`).textContent = String(counts[k]); if (k !== 'proc') $(`#c-${k}`).classList.add('bump'); }

  async function start() {
    if (!choice) return;
    $('#detonate').disabled = true;
    let run;
    try {
      if (choice.type === 'sample') run = await api('/api/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sample: choice.id }) });
      else if (choice.type === 'url') run = await api('/api/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: choice.url }) });
      else run = await api(`/api/runs?name=${encodeURIComponent(choice.name)}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: choice.file });
    } catch (e) { toast(e.message); $('#detonate').disabled = false; return; }
    watch(run);
  }

  function watch(run) {
    current = run;
    counts = { egress: 0, deny: 0, proc: 0 };
    queue = []; draining = false;
    $('#r-id').textContent = `Run ${run.id} · ${run.kind === 'link' ? 'Link' : 'File'}`;
    $('#r-name').textContent = run.name;
    const st = $('#r-status'); st.classList.remove('done'); st.querySelector('span').textContent = 'Detonating';
    $('#trace').innerHTML = '<span class="cursor"></span>';
    $('#shot .pg').innerHTML = '<b></b><div class="fld" id="f-user"></div><div class="fld" id="f-pass"></div><div class="sub">Sign In</div>'; $('#shot .pg').style.padding = '';
    resetBox(run.kind);
    const can = run.kind === 'link' ? ['login'] : ['cloud_key', 'wallet', 'password'];
    $('#canaries').style.gridTemplateColumns = `repeat(${can.length}, minmax(0, 1fr))`;
    $('#canaries').innerHTML = can.map((c) => `<div class="canary" id="cn-${c}"><i></i><b>${CANARY_LABEL[c]}</b><span>Untouched</span></div>`).join('');
    for (const k of ['egress', 'deny', 'proc']) { $(`#c-${k} b`).textContent = '0'; $(`#c-${k}`).classList.remove('bump'); }
    $('#r-note').textContent = run.kind === 'link' ? 'A browser inside the box is visiting the link. It can reach only a private lab network, and the details it types are fake.' : 'Everything here happens inside the box. Your computer and your network are never touched.';
    setStep(0); show('run');
    const es = new EventSource(`/api/runs/${run.id}/events`);
    es.onmessage = (m) => { const e = JSON.parse(m.data); if (e.type === 'end') es.close(); queue.push(e); drain(); };
    es.onerror = () => { es.close(); };
  }

  // Events arrive in bursts; they are shown in their real order, a beat apart, so a person can follow them.
  function drain() {
    if (draining) return;
    draining = true;
    const step = () => {
      const e = queue.shift();
      if (!e) { draining = false; return; }
      let wait = 0;
      try { wait = apply(e); } catch (err) { console.error(err); }
      setTimeout(step, reduced ? 0 : wait);
    };
    step();
  }

  function apply(e) {
    switch (e.type) {
      case 'stage':
        if (e.stage === 'starting') { setStep(0); return 150; }
        if (e.stage === 'sealed') {
          const l = e.limits ?? {};
          line('box', 'sealed', `net=${String(l.network).split(' ')[0]}  root=${l.root}  mem=${l.memory}  cpu=${l.cpus}  t=${l.seconds}s  ${l.runtime}`, e.at);
          setStep(1); return 350;
        }
        if (e.stage === 'canaries') { line('box', 'canaries', `${e.planted.length} planted: ${e.planted.map((c) => CANARY_LABEL[c] ?? c).join(', ').toLowerCase()}`, e.at); setStep(2); return 350; }
        if (e.stage === 'detonate') { line('exec', 'run', e.cmd ?? e.url ?? '', e.at); setStep(3); return 300; }
        if (e.stage === 'burning') { setStep(4); return 200; }
        if (e.stage === 'burned') { line('box', 'burned', `container ${e.container} removed${e.destroyed ? ', confirmed gone' : ''}`, e.destroyedAt); burnBox(); return 900; }
        if (e.stage === 'verdict') { setStep(5); $('#r-status span').textContent = 'Writing Verdict'; return 300; }
        return 100;
      case 'exec': bump('proc'); line('exec', 'exec', (e.argv ?? []).join(' ') || e.path, e.at); return 220;
      case 'canary': {
        const c = $(`#cn-${e.canary}`);
        if (c) { c.classList.add('hit'); c.querySelector('span').textContent = `Reached ${e.ts?.slice(0, 8) ?? ''}`; }
        ball.setAttribute('fill', '#e8336f'); setTimeout(() => ball.setAttribute('fill', 'url(#chrome)'), 500);
        if (e.canary !== 'login') line('canary', 'read', e.path ?? '', e.at); return 450;
      }
      case 'egress': bump('egress'); spark(); line('egress', e.port === 53 ? 'dns' : 'connect', `${e.host}:${e.port}  ${e.blocked ? 'BLOCKED' : 'ALLOWED (lab)'}`, e.at); return 200;
      case 'lookup': line('egress', 'lookup', `${e.host}  BLOCKED`, e.at); return 250;
      case 'write_denied': bump('deny'); line('deny', 'write', `${e.path}  DENIED`, e.at); return 300;
      case 'delete_denied': bump('deny'); line('deny', 'delete', `${e.path}  DENIED`, e.at); return 300;
      case 'write': line('ok', 'write', e.path, e.at); return 220;
      case 'delete': line('note', 'delete', `${e.path} (inside the box)`, e.at); return 220;
      case 'stdout': line('note', 'stdout', e.text, e.at); return 160;
      case 'page':
        $('#shot .url').textContent = e.url; { const t = $('#shot .pg b'); if (t) t.textContent = e.title || 'Page'; }
        $('#shot').classList.add('on'); line('note', 'visit', e.url, e.at); return 600;
      case 'screenshot': {
        const img = document.createElement('img'); img.src = e.data; img.alt = 'What the page looked like inside the box';
        img.style.cssText = 'display:block;width:100%;height:auto';
        const pg = $('#shot .pg'); pg.replaceChildren(img); pg.style.padding = '0';
        return 500;
      }
      case 'form': line('note', 'page', `${e.fields} fields, sends to ${e.action}`, e.at); return 400;
      case 'typed': if ($('#f-user')) { $('#f-user').textContent = e.user ?? ''; $('#f-pass').textContent = '••••••••••'; } line('canary', 'typed', `${e.user} and a one-time password (fake)`, e.at); return 400;
      case 'post': line('canary', 'posted', `to ${e.to}${e.crossSite ? '  (not the page you saw)' : ''}`, e.at); return 450;
      case 'note': line('note', 'note', e.message, e.at); return 200;
      case 'error': $('#r-status span').textContent = 'Failed'; line('deny', 'error', e.message, e.at); toast(e.message); return 0;
      case 'done': finish(); return 0;
      default: return 0;
    }
  }

  async function finish() {
    $('#trace .cursor')?.remove();
    const st = $('#r-status'); st.classList.add('done'); st.querySelector('span').textContent = 'Done';
    try { renderVerdict(await api(`/api/runs/${current.id}`)); } catch (e) { toast(e.message); }
  }

  // Verdict.
  const WORD = { malicious: 'Malicious.', suspicious: 'Suspicious.', safe: 'Safe.' };
  const PILL = { malicious: 'Malicious', suspicious: 'Suspicious', safe: 'Safe' };
  const CLS = { malicious: 'mal', suspicious: 'sus', safe: 'safe' };
  const utc = (iso) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC` : '');
  function renderVerdict(r) {
    const v = r.verdict, f = r.facts, b = r.box;
    $('#v-top').className = `v-top ${CLS[v.level]}`;
    $('#v-runid').textContent = `Run ${r.id}${r.duration ? ` · ${r.duration} s inside the box` : ''}`;
    $('#v-word').textContent = WORD[v.level];
    $('#v-file').textContent = r.name;
    $('#v-summary').textContent = v.summary;
    const planted = r.kind === 'link' ? 1 : 3;
    const reached = f.canaries.length;
    const denied = f.writesDenied.length + f.deletesDenied.length;
    $('#v-counts').innerHTML = `<div class="count"><b>${reached} of ${planted}</b><span>Canaries Touched</span></div><div class="count"><b>${f.egressTotal}</b><span>Egress Blocked</span></div><div class="count"><b>${denied}</b><span>Changes Denied</span></div>`;
    const col = { canary: 'var(--hot)', egress: 'var(--signal)', deny: 'var(--uv)', note: 'var(--sky)', ok: 'var(--sage-deep)' };
    $('#v-tried').innerHTML = v.tried.map((t, i) => `<li><i style="background:${col[t.kind]}">${i + 1}</i><span>${esc(t.what)}</span><em>${esc(t.outcome)}</em></li>`).join('');
    const kindOf = { stage: 'box', exec: 'exec', canary: 'canary', egress: 'egress', lookup: 'egress', write_denied: 'deny', delete_denied: 'deny', write: 'ok', stdout: 'note', post: 'canary', page: 'note', note: 'note' };
    $('#v-trace').innerHTML = r.events.filter((e) => kindOf[e.type]).map((e) => {
      const text = e.type === 'stage' ? (e.stage === 'sealed' ? `container ${e.container}` : e.stage === 'detonate' ? (e.cmd ?? '') : '') : e.type === 'egress' ? `${e.host}:${e.port} ${e.blocked ? 'BLOCKED' : ''}` : (e.path ?? e.host ?? e.text ?? e.to ?? e.url ?? e.message ?? (e.argv ?? []).join(' '));
      return `<div class="ln t-${kindOf[e.type]}"><time>${hhmmss(e.at)}</time><b>${esc(e.type === 'stage' ? e.stage : e.type.replace('_', ' '))}</b><span>${esc(text)}</span></div>`;
    }).join('');
    const l = b.limits;
    const rc = r.receipt?.body ?? {};
    $('#rc').innerHTML = [
      ['run', r.id], ['what', r.name], ['sha256', `${r.sha256.slice(0, 16)}…`], ['container', b.container],
      ['limits', `${l.network.split(' ')[0] === 'none' ? 'no network' : 'lab network only'} · read-only root · ${l.memory} · ${l.cpus} CPU · ${l.seconds} s · ${l.runtime}`],
      ['canaries', `${planted} planted · ${reached} reached`], ['started', utc(b.startedAt)], ['destroyed', `${utc(b.destroyedAt)}${b.destroyed ? ', confirmed' : ''}`],
      ['verdict', `${PILL[v.level]} · ${rc.verdictBy ?? ''}`], ['signature', `ed25519 ${(r.receipt?.signature ?? '').slice(0, 10)}…`],
    ].map(([k, val]) => `<dt>${k}</dt><dd>${esc(val)}</dd>`).join('');
    show('verdict');
  }
  $('#again').addEventListener('click', () => { reset(); show('new'); });
  $('#dl').addEventListener('click', () => { if (current) location.href = `/api/runs/${current.id}/receipt`; });

  // Past runs.
  async function loadPast() {
    try {
      const list = await api('/api/runs');
      $('#past').innerHTML = list.length ? list.map((r) => `<tr data-id="${esc(r.id)}"><td class="m">${esc(r.id)}</td><td class="m">${esc(r.name)}</td><td>${r.verdict ? `<span class="pill ${CLS[r.verdict]}">${PILL[r.verdict]}</span>` : esc(r.status)}</td><td class="m">${r.canaries} of ${r.canariesPlanted}</td><td class="m">${r.egress}</td><td class="m">${esc(utc(r.destroyedAt).replace(' UTC', ''))}</td></tr>`).join('') : '<tr><td colspan="6">No runs yet. Detonate a test sample to see one here.</td></tr>';
    } catch (e) { toast(e.message); }
  }
  $('#past').addEventListener('click', async (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    try { const r = await api(`/api/runs/${tr.dataset.id}`); current = r; if (r.verdict) renderVerdict(r); else watch(r); } catch (err) { toast(err.message); }
  });

  // A shared link to a run opens it directly.
  const m = /^#(BBX-\d{4,})$/.exec(location.hash);
  if (m) api(`/api/runs/${m[1]}`).then((r) => { current = r; if (r.verdict) renderVerdict(r); else watch(r); }).catch(() => {});
})();
