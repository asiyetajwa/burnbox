// Records the Burn Box film footage: a generic inbox (stage/inbox.html) where the email is forwarded unopened, then
// the real app running live (no mock data): the forwarded email splitting into boxes, the attachment's box and the
// link's box up close, and the verdict with its receipt. Each scene is Chrome's screencast (frames arrive only when
// the screen changes), encoded to public/clips/<scene>.mp4 at a constant 60 fps. Moments worth cutting to are noted
// in public/clips/marks.json, in seconds from the clip's first frame.
//
//   node scripts/record.mjs    (Burn Box running on :8990 with MAIL_DOMAIN=burnbox.test and mail intake on :2526)

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { chromium } from 'playwright';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:8990/';
const MAIL_PORT = Number(process.env.MAIL_PORT ?? 2526);
const OUT = 'public/clips';
const W = 1440, H = 810, SCALE = 4 / 3; // frames come out at 1920 by 1080
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
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
const allMarks = {};
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
}

/** Forwards the demo email (as an attachment, unopened) to Burn Box's mail intake, like the Send button would. */
function forwardEmail() {
  const eml = execFileSync('python3', ['-I', '-c', `
import email, sys
from email.message import EmailMessage
inner = email.message_from_bytes(open('../samples/invoice_overdue.eml','rb').read())
m = EmailMessage(); m['From'] = 'Ann Mwangi <ann@yourcompany.example>'; m['To'] = 'check@burnbox.test'
m['Subject'] = 'Fwd: URGENT: Invoice #88213 is 14 days overdue'; m.set_content('Is this real?'); m.add_attachment(inner)
sys.stdout.buffer.write(bytes(m))`]);
  return new Promise((done, fail) => {
    const s = createConnection(MAIL_PORT, '127.0.0.1');
    const steps = ['EHLO film\r\n', 'MAIL FROM:<ann@yourcompany.example>\r\n', 'RCPT TO:<check@burnbox.test>\r\n', 'DATA\r\n', null, 'QUIT\r\n'];
    let i = 0;
    s.on('data', (d) => {
      const text = d.toString();
      if (/^5/m.test(text)) { fail(new Error(text)); s.destroy(); return; }
      if (i >= steps.length) return;
      const next = steps[i++];
      if (next === null) s.write(Buffer.concat([Buffer.from(eml.toString('latin1').replace(/^\./gm, '..'), 'latin1'), Buffer.from('\r\n.\r\n')]));
      else s.write(next);
      if (/Queued as (BBX-\d+)/.test(text)) done(/Queued as (BBX-\d+)/.exec(text)[1]);
    });
    s.on('error', fail);
    s.on('close', () => done(null));
  });
}

// 1. The inbox: the email is never opened. Right-click, Forward as Attachment, send to Burn Box.
await page.goto(new URL('../stage/inbox.html', import.meta.url).href);
await wait(800);
let forwardedId = null;
await scene('inbox', async (mark) => {
  await page.mouse.move(mouse.x, mouse.y);
  await wait(1400);
  const row = await page.locator('#phish').boundingBox();
  await moveTo(row.x + 230, row.y + 38, 900);
  mark('row');
  await wait(700);
  await page.evaluate(() => window.stage.select());
  await page.mouse.down({ button: 'right' }); await page.mouse.up({ button: 'right' });
  await page.evaluate(([x, y]) => window.stage.menu(x + 6, y + 4), [row.x + 230, row.y + 38]);
  mark('menu');
  await wait(800);
  const opt = await page.locator('#fwd-att').boundingBox();
  await moveTo(opt.x + 70, opt.y + opt.height / 2, 600);
  await page.evaluate(() => window.stage.hover());
  await wait(500);
  await page.mouse.down(); await page.mouse.up();
  await page.evaluate(() => window.stage.compose());
  mark('compose');
  await wait(700);
  await page.evaluate(() => window.stage.type('check@burnbox.test'));
  await wait(1700);
  const send = await page.locator('#send').boundingBox();
  await moveTo(send.x + send.width / 2, send.y + send.height / 2, 700);
  await wait(250);
  await page.mouse.down(); await page.mouse.up();
  await page.evaluate(() => window.stage.send());
  forwardedId = await forwardEmail();
  mark('sent');
  await wait(2600);
});
console.log('forwarded as', forwardedId);

// 2. The app home, on the email tab: where to forward it.
await page.goto(APP);
mouse = { x: W / 2, y: H / 2 };
await wait(1500);
await scene('home', async (mark) => {
  await page.mouse.move(mouse.x, mouse.y);
  await wait(1000);
  await clickOn('#m-email');
  mark('email-tab');
  await wait(2600);
  await moveTo(560, 520, 900);
  await wait(1600);
});

// 3. The forwarded email, live: the envelope box, the red flags, then a box per link and attachment.
// The run started the moment the email arrived; the app replays its recorded events in their real order.
await page.goto(`${APP}#replay-${String(forwardedId)}`);
await page.reload();
mouse = { x: W - 120, y: H - 80 };
await page.waitForSelector('#v-email:not([hidden])');
await scene('email', async (mark) => {
  mark('open');
  await page.waitForSelector('#flags li', { timeout: 30000 });
  mark('flags');
  await page.waitForSelector('#kids .kid:nth-child(2)', { timeout: 60000 });
  mark('split');
  await page.waitForSelector('#v-verdict:not([hidden])', { timeout: 120000 });
  mark('verdict');
  await wait(3200);
  await page.mouse.move(1100, 400);
  await page.evaluate(() => window.scrollTo({ top: 520, behavior: 'smooth' }));
  mark('scroll');
  await wait(3000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(1200);
});

// 4. The attachment's box up close: the same file, detonated on its own.
await page.goto(APP);
mouse = { x: W / 2, y: H / 2 };
await wait(1200);
await scene('file', async (mark) => {
  await page.mouse.move(mouse.x, mouse.y);
  await clickOn('[data-sample=invoice]');
  await wait(500);
  await clickOn('#detonate');
  mark('detonate');
  await page.waitForSelector('#v-run:not([hidden])');
  await page.waitForSelector('#canaries .canary.hit', { timeout: 30000 });
  mark('canary');
  await page.waitForSelector('#stamp.on', { timeout: 60000 });
  mark('burned');
  await page.waitForSelector('#v-verdict:not([hidden])', { timeout: 60000 });
  mark('verdict');
  await wait(2500);
});

// 5. The link's box up close: the fake sign-in page, a fake login typed, and where the page sends it.
await page.goto(APP);
mouse = { x: W / 2, y: H / 2 };
await wait(1200);
await scene('link', async (mark) => {
  await page.mouse.move(mouse.x, mouse.y);
  await clickOn('[data-sample=phish]');
  await wait(500);
  await clickOn('#detonate');
  mark('detonate');
  await page.waitForSelector('#shot img', { timeout: 60000 });
  mark('page');
  await page.waitForSelector('#stamp.on', { timeout: 60000 });
  mark('burned');
  await page.waitForSelector('#v-verdict:not([hidden])', { timeout: 60000 });
  mark('verdict');
  await wait(2500);
});

writeFileSync(`${OUT}/marks.json`, JSON.stringify(allMarks, null, 2));
if (errors.length) console.log('page errors:', errors);
await browser.close();
