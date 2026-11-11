// Records the Kiroween cut of the Burn Box film against the live demo host (a cloud host, sandboxed boxes, model
// verdicts): no local stack and no mock data. Scenes are recorded one group at a time, because some need the host to
// be redeployed first. Each scene is Chrome's screencast, encoded to public/clips-kiro/<scene>.mp4 at 60 fps, with
// the moments worth cutting to in public/clips-kiro/marks.json (merged, so groups can be recorded on different days).
//
//   ONLY=save,attachment,team,verify node scripts/record-kiro.mjs
//   (save, email, attachment, team, link, quick, verify; APP_URL defaults to the live host)

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const APP = process.env.APP_URL ?? 'http://136.109.165.109/';
const ONLY = new Set((process.env.ONLY ?? 'save,email,attachment,team,link,quick,verify').split(','));
const OUT = 'public/clips-kiro';
const W = 1440, H = 810, SCALE = 4 / 3; // frames come out at 1920 by 1080
mkdirSync(OUT, { recursive: true });

// Opt-in proxy for sandboxes whose Chromium cannot reach the host directly: set FILM_PROXY to a proxy
// server URL (a local no-auth relay works) and the recorder routes through it. Unset means a direct
// connection, exactly as before.
const proxyUrl = process.env.FILM_PROXY;
let proxy;
if (proxyUrl) {
  const u = new URL(proxyUrl);
  proxy = { server: `${u.protocol}//${u.host}` };
  if (u.username) proxy.username = decodeURIComponent(u.username);
  if (u.password) proxy.password = decodeURIComponent(u.password);
}
const browser = await chromium.launch(proxy ? { proxy } : {});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
// A visible pointer that follows the mouse, with a ripple on each click, so the viewer can follow the hand.
await ctx.addInitScript(() => {
  const css = 'position:fixed;left:0;top:0;width:26px;height:30px;pointer-events:none;z-index:2147483647;transition:none';
  const make = () => {
    const c = document.createElement('div');
    c.id = '__cur';
    c.style.cssText = css;
    c.innerHTML = '<svg width="26" height="30" viewBox="0 0 23 25"><path d="M3 2 L20 11.2 L12.4 13.2 L9 20.6 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    return c;
  };
  addEventListener('mousemove', (e) => { const c = document.getElementById('__cur') ?? make(); c.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 3}px)`; }, true);
  addEventListener('mousedown', (e) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:${e.clientX - 20}px;top:${e.clientY - 20}px;width:40px;height:40px;border-radius:50%;background:rgba(245,154,58,.25);border:2px solid rgba(245,154,58,.8);pointer-events:none;z-index:2147483646;transition:transform .45s ease-out,opacity .45s ease-out`;
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = 'scale(1.7)'; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 500);
  }, true);
});
// The film never names the inference model (Brian's ruling, 2026-11-11). The live app prints it on receipts and
// verdict cards, so every text node that names it is blurred on screen, like the team code: redacted, not rewritten.
// Second ruling (same day): the film markets no non-AWS product, so the app's "Google Cloud" header badge is
// blurred the same way; the film only ever says "the cloud".
await ctx.addInitScript(() => {
  const NAME = /gemini[\w.\-() ]*|google cloud/i;
  const hide = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (NAME.test(n.nodeValue ?? '') && !n.parentElement?.closest('[data-redact], textarea, script, style')) hits.push(n);
    }
    for (const n of hits) {
      const m = NAME.exec(n.nodeValue ?? '');
      if (!m) continue;
      const tail = n.splitText(m.index);
      tail.splitText(m[0].length);
      const span = document.createElement('span');
      span.dataset.redact = '';
      span.style.cssText = 'filter:blur(7px);display:inline-block';
      tail.replaceWith(span);
      span.appendChild(tail);
    }
  };
  const start = () => {
    hide(document.body);
    new MutationObserver(() => hide(document.body)).observe(document.body, { subtree: true, childList: true, characterData: true });
  };
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const cdp = await ctx.newCDPSession(page);
let frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  frames.push({ data, t: metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => undefined);
});
const wait = (ms) => page.waitForTimeout(ms);
const allMarks = existsSync(`${OUT}/marks.json`) ? JSON.parse(readFileSync(`${OUT}/marks.json`, 'utf8')) : {};
let mouse = { x: W / 2, y: H / 2 };
async function moveTo(x, y, ms = 700) {
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    await page.mouse.move(mouse.x + (x - mouse.x) * e, mouse.y + (y - mouse.y) * e);
    await wait(ms / steps);
  }
  mouse = { x, y };
}
async function clickOn(selector, opts = {}) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`Nothing to click: ${selector}`);
  await moveTo(box.x + box.width * (opts.fx ?? 0.5), box.y + box.height * (opts.fy ?? 0.5), opts.ms ?? 700);
  await wait(120);
  await page.mouse.down({ button: opts.button ?? 'left' });
  await wait(90);
  await page.mouse.up({ button: opts.button ?? 'left' });
}

async function scene(name, run) {
  frames = [];
  const marks = {};
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 });
  await wait(250);
  const startWall = Date.now() / 1000;
  const mark = (label) => { marks[label] = Date.now() / 1000 - startWall; };
  await run(mark);
  await wait(400);
  await cdp.send('Page.stopScreencast');
  await wait(150);
  if (!frames.length) throw new Error(`No frames for ${name}`);
  const dir = `${OUT}/${name}-frames`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const lines = [];
  frames.forEach((f, i) => {
    const file = `${String(i).padStart(5, '0')}.jpg`;
    writeFileSync(`${dir}/${file}`, Buffer.from(f.data, 'base64'));
    const next = frames[i + 1]?.t ?? f.t + 0.4;
    lines.push(`file '${file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  lines.push(`file '${String(frames.length - 1).padStart(5, '0')}.jpg'`);
  writeFileSync(`${dir}/list.txt`, `${lines.join('\n')}\n`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', 'fps=60,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '14', `${OUT}/${name}.mp4`]);
  rmSync(dir, { recursive: true, force: true });
  const offset = startWall - frames[0].t;
  allMarks[name] = Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Math.max(0, +(v + offset).toFixed(2))]));
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${OUT}/${name}.mp4`]).toString().trim());
  allMarks[name].seconds = +seconds.toFixed(2);
  console.log(`${name}: ${seconds.toFixed(1)}s, ${String(frames.length)} frames`, JSON.stringify(allMarks[name]));
  writeFileSync(`${OUT}/marks.json`, JSON.stringify(allMarks, null, 2));
}

const home = async () => { await page.goto(APP); mouse = { x: W / 2, y: H / 2 }; await wait(1500); await page.mouse.move(mouse.x, mouse.y); };
const run = (selector) => page.waitForSelector(selector, { timeout: 180000 });

// The email is saved unopened from the inbox (forwarding is not live on the demo host: no mail domain yet).
if (ONLY.has('save')) {
  await page.goto(new URL('../stage/inbox.html?save', import.meta.url).href);
  mouse = { x: W / 2, y: H / 2 };
  await wait(800);
  await scene('save', async (mark) => {
    await page.mouse.move(mouse.x, mouse.y);
    await wait(1200);
    const row = await page.locator('#phish').boundingBox();
    await moveTo(row.x + 230, row.y + 38, 900);
    mark('row');
    await wait(600);
    await page.evaluate(() => window.stage.select());
    await page.evaluate(([x, y]) => window.stage.menu(x + 6, y + 4), [row.x + 230, row.y + 38]);
    mark('menu');
    await wait(800);
    const opt = await page.locator('#save-file').boundingBox();
    await moveTo(opt.x + 70, opt.y + opt.height / 2, 600);
    await page.evaluate(() => window.stage.hover('#save-file'));
    await wait(500);
    await page.mouse.down(); await page.mouse.up();
    await page.evaluate(() => window.stage.saved());
    mark('saved');
    await wait(2400);
  });
}

// The saved email dropped into Burn Box on the live host, then the whole run: envelope, split, verdict.
if (ONLY.has('email')) {
  await home();
  await scene('email', async (mark) => {
    await clickOn('#m-email');
    await wait(900);
    await page.setInputFiles('#eml-in', '../samples/invoice_overdue.eml');
    mark('dropped');
    await wait(900);
    await clickOn('#detonate');
    mark('open');
    await run('#v-email:not([hidden])');
    await page.mouse.move(W - 60, H - 40);
    await run('#flags li');
    mark('flags');
    await run('#kids .kid:nth-child(2)');
    mark('split');
    await run('#v-verdict:not([hidden])');
    mark('verdict');
    await wait(3500);
    await page.evaluate(() => window.scrollTo({ top: 520, behavior: 'smooth' }));
    mark('scroll');
    await wait(3200);
  });
}

// The attachment's box up close, as a team run: the team is made first, so the run stays off the public list.
if (ONLY.has('team') || ONLY.has('attachment')) {
  await home();
  if (ONLY.has('team')) {
    await scene('team', async (mark) => {
      await clickOn('.nav [data-go=past]');
      await wait(1200);
      await clickOn('#team-name');
      await page.keyboard.type('Northwind Accounts', { delay: 70 });
      await wait(400);
      await clickOn('#team-new button');
      await run('#team-made:not([hidden])');
      mark('code');
      await wait(2600);
      await clickOn('#team-made-ok');
      await run('#team-on:not([hidden])');
      mark('on');
      await wait(2200);
    });
  }
  if (ONLY.has('attachment')) {
    await home();
    await scene('attachment', async (mark) => {
      await clickOn('[data-sample=invoice]');
      await wait(500);
      await clickOn('#detonate');
      mark('detonate');
      await run('#v-run:not([hidden])');
      await page.mouse.move(W - 60, H - 40);
      await run('#canaries .canary.hit');
      mark('canary');
      await run('#stamp.on');
      mark('burned');
      await run('#v-verdict:not([hidden])');
      mark('verdict');
      await wait(4000);
    });
  }
  if (ONLY.has('team')) {
    await home();
    await scene('teamlist', async (mark) => {
      await clickOn('.nav [data-go=past]');
      await run('#past tr[data-id]');
      mark('list');
      await wait(1500);
      await page.selectOption('#f-level', 'malicious');
      mark('filter');
      await wait(2500);
    });
  }
}

// The link's box on its own: the fake sign-in page, a fake login typed, and where the page sends it.
if (ONLY.has('link')) {
  await home();
  await scene('link', async (mark) => {
    await clickOn('[data-sample=phish]');
    await wait(500);
    await clickOn('#detonate');
    mark('detonate');
    await run('#shot img');
    mark('page');
    await run('#stamp.on');
    mark('burned');
    await run('#v-verdict:not([hidden])');
    mark('verdict');
    await wait(3500);
  });
}

// The quick check: one link, one answer.
if (ONLY.has('quick')) {
  await page.goto(`${APP}#quick`);
  await page.reload();
  mouse = { x: W / 2, y: H / 2 };
  await wait(1500);
  await scene('quick', async (mark) => {
    await page.mouse.move(mouse.x, mouse.y);
    await clickOn('#q-link');
    await page.keyboard.type('http://invoices-portal.lab.test/view?inv=88213', { delay: 35 });
    await wait(400);
    await clickOn('#q-go');
    mark('go');
    await run('#q-card:not([hidden])');
    mark('answer');
    await page.evaluate(() => document.querySelector('#q-card').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    await wait(4500);
  });
}

// Receipt verification: a real receipt checks out, and the same receipt with one word changed does not.
if (ONLY.has('verify')) {
  const runs = await (await fetch(`${APP}api/runs`)).json();
  // The newest malicious email run whose boxes were all caught (older receipts carry the pre-fix "safe" link box).
  let target, receipt;
  for (const r of runs.filter((x) => x.kind === 'email' && x.verdict === 'malicious')) {
    const text = await (await fetch(`${APP}api/runs/${r.id}/receipt`)).text();
    if (!text.includes('"verdict": "safe"')) { target = r; receipt = text; break; }
  }
  if (!target) throw new Error('No fully caught email receipt to verify');
  const forged = receipt.replace('"verdict": "malicious"', '"verdict": "safe"');
  await page.goto(`${APP}#verify`);
  await page.reload();
  mouse = { x: W / 2, y: H / 2 };
  await wait(1500);
  await scene('verify', async (mark) => {
    await page.mouse.move(mouse.x, mouse.y);
    // A pasted receipt leaves the box scrolled to its end, where the model's name sits; show its top instead.
    const top = () => page.evaluate(() => { document.querySelector('#vf-text').scrollTop = 0; });
    await clickOn('#vf-text');
    await page.fill('#vf-text', receipt);
    await top();
    await wait(700);
    await clickOn('#vf-go');
    await run('#vf-card:not([hidden])');
    const toCard = () => page.evaluate(() => document.querySelector('#vf-card').scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await toCard();
    mark('real');
    await wait(3600);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await wait(700);
    await clickOn('#vf-text');
    await page.fill('#vf-text', forged);
    await top();
    mark('forged-in');
    await wait(900);
    await clickOn('#vf-go');
    await wait(1200);
    await toCard();
    mark('forged');
    await wait(3600);
  });
  console.log('verified receipt of', target.id);
}

if (errors.length) console.log('page errors:', errors);
await browser.close();
/** (end) */
