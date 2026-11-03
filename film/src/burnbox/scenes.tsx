import React from 'react';
import { AbsoluteFill, Freeze, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FPS } from '../components/Film';
import { BlurText, Camera, clamp, easeOut, popAt, type CamKey } from '../components/motion';
import { theme } from '../theme';
import marks from '../../public/clips/marks.json';

type Clip = 'inbox' | 'home' | 'email' | 'file' | 'link';
const MARKS = marks as Record<Clip, Record<string, number>>;
/** Seconds into a clip when a recorded moment happened. */
const mk = (clip: Clip, key: string): number => MARKS[clip][key] ?? 0;

/**
 * A stretch of real footage, full frame, starting `from` seconds into the clip. The camera moves through `keys`
 * (scene frames; x and y are frame pixels to centre on, z the zoom). When the clip runs out, its last frame holds.
 */
const Footage: React.FC<{ clip: Clip; from: number; keys: { f: number; px: number; py: number; z: number }[] }> = ({ clip, from, keys }) => {
  const frame = useCurrentFrame();
  const left = Math.round(((MARKS[clip].seconds ?? 0) - from) * FPS) - 2;
  const cam: CamKey[] = keys.map((k) => ({ f: k.f, x: k.px - 960, y: k.py - 540, z: k.z }));
  return (
    <Camera keys={cam}>
      <div style={{ position: 'absolute', left: -960, top: -540, width: 1920, height: 1080, overflow: 'hidden', borderRadius: 4 }}>
        <Freeze frame={Math.max(0, left)} active={frame >= left}>
          <OffthreadVideo src={staticFile(`clips/${clip}.mp4`)} startFrom={Math.round(from * FPS)} muted style={{ width: 1920, height: 1080, display: 'block' }} />
        </Freeze>
      </div>
    </Camera>
  );
};

/** The step label in the lower left: a raised pill with a glowing amber dot, then the line. */
const Caption: React.FC<{ step: string; text: string; at?: number }> = ({ step, text, at = 8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = popAt(frame, fps, at, 18);
  return (
    <div style={{ position: 'absolute', left: 70, bottom: 64, display: 'flex', alignItems: 'center', gap: 18, opacity: p, transform: `translateY(${String((1 - p) * 24)}px)`, fontFamily: theme.font }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px 14px 16px', borderRadius: 999, background: `linear-gradient(180deg, ${theme.shellA}, ${theme.shellB})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 18px 40px -10px rgba(0,0,0,.85)', color: theme.fg, fontSize: 30, fontWeight: 500, letterSpacing: -0.5 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.amberB, boxShadow: `0 0 16px ${theme.amberB}` }} />
        <span style={{ fontFamily: theme.mono, fontSize: 22, color: theme.amberA }}>{step}</span>
        {text}
      </div>
    </div>
  );
};

/** Darkens the footage edges so the caption always reads. */
const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)', pointerEvents: 'none' }} />
);

/** The Burn Box dial, as in the app: knurled ring that turns, outer ticks that light, a core that glows. */
const Dial: React.FC<{ size: number; lit: number; turn: number; core?: string; glow?: number }> = ({ size, lit, turn, core, glow = 0 }) => {
  const TICKS = 72;
  return (
    <svg width={size} height={size} viewBox="-160 -160 320 320" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="db" cx="50%" cy="38%" r="65%"><stop offset="0" stopColor="#2e2e31" /><stop offset=".7" stopColor="#1b1b1d" /><stop offset="1" stopColor="#141415" /></radialGradient>
        <radialGradient id="dc" cx="40%" cy="32%" r="65%"><stop offset="0" stopColor="#6a6a6e" /><stop offset=".45" stopColor="#2e2e31" /><stop offset="1" stopColor="#121213" /></radialGradient>
        <radialGradient id="dh" cx="50%" cy="38%" r="65%"><stop offset="0" stopColor={theme.amberA} /><stop offset="1" stopColor={theme.amberB} /></radialGradient>
        <filter id="dg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cy={14} r={128} fill="#000" opacity={0.7} style={{ filter: 'blur(14px)' }} />
      {Array.from({ length: TICKS }, (_, i) => {
        const a = -Math.PI / 2 + (i / TICKS) * Math.PI * 2;
        const on = i < Math.round(lit * TICKS);
        return <line key={i} x1={Math.cos(a) * 134} y1={Math.sin(a) * 134} x2={Math.cos(a) * 144} y2={Math.sin(a) * 144} stroke={on ? (i < TICKS / 2 ? theme.amberA : theme.amberB) : '#2a2a2c'} strokeWidth={3} strokeLinecap="round" filter={on ? 'url(#dg)' : undefined} />;
      })}
      <g transform={`rotate(${String(turn)})`}>
        <circle r={122} fill="url(#db)" stroke="rgba(255,255,255,.07)" strokeWidth={1.2} />
        {Array.from({ length: 110 }, (_, i) => {
          const a = (i / 110) * Math.PI * 2;
          return <line key={i} x1={Math.cos(a) * 106} y1={Math.sin(a) * 106} x2={Math.cos(a) * 121} y2={Math.sin(a) * 121} stroke={i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.65)'} strokeWidth={2} />;
        })}
      </g>
      <circle r={102} fill="#1f1f21" stroke="rgba(255,255,255,.06)" strokeWidth={1.2} />
      <circle r={58} fill="#0e0e0f" stroke="rgba(0,0,0,.9)" strokeWidth={3} />
      <circle r={34} fill={core ?? 'url(#dc)'} filter={glow > 0 ? 'url(#dg)' : undefined} opacity={1} />
      {glow > 0 ? <circle r={34} fill="url(#dh)" opacity={glow} filter="url(#dg)" /> : null}
    </svg>
  );
};

const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: theme.font, color: theme.fg, ...style }}>{children}</AbsoluteFill>
);

// 1. The email every small business gets.
export const HookScene: React.FC<{ duration: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = popAt(frame, fps, 6, 18);
  const att = popAt(frame, fps, 62, 16);
  const lnk = popAt(frame, fps, 84, 16);
  const ask = interpolate(frame, [150, 175], [0, 1], { ...clamp, easing: easeOut });
  const shake = frame > 30 && frame < 60 ? Math.sin(frame * 1.7) * 2 : 0;
  return (
    <Center>
      <div style={{ width: 1040, borderRadius: 34, padding: '34px 40px', background: `linear-gradient(180deg, ${theme.shellA}, ${theme.shellB})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07), 0 40px 90px -20px rgba(0,0,0,.9)', opacity: card, transform: `translateY(${String((1 - card) * 60 + shake)}px)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#c2410c', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 600 }}>N</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, color: theme.fg2 }}>Northwind Payables <span style={{ fontFamily: theme.mono, fontSize: 20, color: theme.fg3 }}>billing@northwind-payables.lab.test</span></div>
            <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1.4, marginTop: 4 }}>URGENT: Invoice #88213 is 14 days overdue</div>
          </div>
        </div>
        <div style={{ marginTop: 24, fontSize: 26, color: theme.fg2, fontWeight: 300 }}>A late fee of 8% will be added after 5:00 PM today.</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 26 }}>
          <div style={{ opacity: att, transform: `scale(${String(0.9 + att * 0.1)})`, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 999, background: theme.well, boxShadow: 'inset 0 2px 7px rgba(0,0,0,.85)', fontFamily: theme.mono, fontSize: 22 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: theme.amberB, boxShadow: `0 0 12px ${theme.amberB}` }} />invoice_sample.py
          </div>
          <div style={{ opacity: lnk, transform: `scale(${String(0.9 + lnk * 0.1)})`, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 999, background: theme.well, boxShadow: 'inset 0 2px 7px rgba(0,0,0,.85)', fontFamily: theme.mono, fontSize: 22 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: theme.hot, boxShadow: `0 0 12px ${theme.hot}` }} />View Invoice #88213
          </div>
        </div>
      </div>
      <div style={{ marginTop: 54, fontSize: 40, color: theme.fg2, fontWeight: 300, opacity: ask, letterSpacing: -0.6 }}>Open it? <span style={{ color: theme.fg3 }}>Click it?</span> <span style={{ color: theme.fg }}>Who do you ask?</span></div>
    </Center>
  );
};

// 2. Burn Box.
export const TitleScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = popAt(frame, fps, 0, 20);
  const lit = interpolate(frame, [6, duration - 20], [0, 1], { ...clamp, easing: easeOut });
  return (
    <Center>
      <div style={{ transform: `scale(${String(0.85 + p * 0.15)})`, opacity: p }}><Dial size={420} lit={lit} turn={frame * 0.6} glow={interpolate(frame, [40, 70], [0, 0.9], clamp)} /></div>
      <div style={{ marginTop: 30, fontSize: 120, fontWeight: 600, letterSpacing: -5 }}><BlurText text="Burn Box" at={18} /></div>
      <div style={{ marginTop: 8, fontSize: 40, fontWeight: 300, color: theme.fg2 }}><BlurText text="A detonation chamber for small teams." at={42} /></div>
    </Center>
  );
};

// 3. Forward it, unopened.
export const InboxScene: React.FC<{ duration: number }> = ({ duration }) => {
  const f = (s: number) => Math.round(s * FPS);
  return (
    <AbsoluteFill>
      <Footage clip="inbox" from={0.4} keys={[
        { f: 0, px: 960, py: 540, z: 1 },
        { f: f(mk('inbox', 'row') - 0.4), px: 720, py: 300, z: 1.45 },
        { f: f(mk('inbox', 'compose') - 0.2), px: 760, py: 330, z: 1.45 },
        { f: f(mk('inbox', 'compose') + 0.6), px: 1250, py: 700, z: 1.35 },
        { f: f(mk('inbox', 'sent') + 0.2), px: 1250, py: 700, z: 1.35 },
        { f: Math.max(f(mk('inbox', 'sent') + 1.6), duration - 10), px: 960, py: 560, z: 1.05 },
      ]} />
      <Vignette />
      <Caption step="01" text="Forward it, unopened" />
    </AbsoluteFill>
  );
};

// 4. The envelope, read in a sealed box.
export const EnvelopeScene: React.FC<{ duration: number }> = ({ duration }) => (
  <AbsoluteFill>
    <Footage clip="email" from={0} keys={[
      { f: 0, px: 960, py: 540, z: 1 },
      { f: 40, px: 520, py: 520, z: 1.45 },
      { f: Math.max(60, duration - 40), px: 470, py: 720, z: 1.55 },
    ]} />
    <Vignette />
    <Caption step="02" text="Even the envelope is read in a sealed box" />
  </AbsoluteFill>
);

// 5. One box per part.
export const SplitScene: React.FC<{ duration: number }> = ({ duration }) => (
  <AbsoluteFill>
    <Footage clip="email" from={Math.max(0, mk('email', 'split') - 0.6)} keys={[
      { f: 0, px: 1060, py: 380, z: 1.6 },
      { f: Math.max(30, duration - 10), px: 1050, py: 420, z: 1.75 },
    ]} />
    <Vignette />
    <Caption step="03" text="One fresh box per part" />
  </AbsoluteFill>
);

// 6. The attachment's box.
export const AttachmentScene: React.FC<{ duration: number }> = ({ duration }) => (
  <AbsoluteFill>
    <Footage clip="file" from={Math.max(0, mk('file', 'detonate') - 0.3)} keys={[
      { f: 0, px: 960, py: 560, z: 1.05 },
      { f: 45, px: 560, py: 690, z: 1.22 },
      { f: Math.round(duration * 0.55), px: 600, py: 700, z: 1.22 },
      { f: Math.max(60, duration - 10), px: 1200, py: 560, z: 1.25 },
    ]} />
    <Vignette />
    <Caption step="04" text="The attachment's box: fake secrets, a wall" />
  </AbsoluteFill>
);

// 7. The link's box.
export const LinkScene: React.FC<{ duration: number }> = ({ duration }) => (
  <AbsoluteFill>
    <Footage clip="link" from={Math.max(0, mk('link', 'detonate') - 0.3)} keys={[
      { f: 0, px: 960, py: 540, z: 1.05 },
      { f: 50, px: 520, py: 520, z: 1.5 },
      { f: Math.max(70, duration - 10), px: 1240, py: 470, z: 1.35 },
    ]} />
    <Vignette />
    <Caption step="05" text="The link's box: a fake login, traced" />
  </AbsoluteFill>
);

// 8. Burned: one verdict and a receipt.
export const VerdictScene: React.FC<{ duration: number }> = ({ duration }) => (
  <AbsoluteFill>
    <Footage clip="email" from={Math.max(0, mk('email', 'verdict') - 0.5)} keys={[
      { f: 0, px: 960, py: 540, z: 1 },
      { f: 40, px: 560, py: 430, z: 1.4 },
      { f: Math.round(duration * 0.55), px: 560, py: 430, z: 1.4 },
      { f: Math.max(60, duration - 12), px: 1150, py: 420, z: 1.5 },
    ]} />
    <Vignette />
    <Caption step="06" text="Burned. One verdict, one signed receipt" />
  </AbsoluteFill>
);

// 9. How it runs on Vultr.
export const HowScene: React.FC<{ duration: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const node = (label: string, sub: string, at: number, accent = false): React.ReactNode => {
    const p = popAt(frame, fps, at, 18);
    return (
      <div style={{ opacity: p, transform: `translateY(${String((1 - p) * 30)}px)`, padding: '26px 30px', borderRadius: 30, minWidth: 300, background: `linear-gradient(180deg, ${theme.shellA}, ${theme.shellB})`, boxShadow: accent ? `inset 0 1px 0 rgba(255,255,255,.07), 0 0 0 1.5px ${theme.amberB}, 0 0 40px rgba(245,154,58,.3)` : 'inset 0 1px 0 rgba(255,255,255,.07), 0 30px 60px -20px rgba(0,0,0,.9)' }}>
        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>{label}</div>
        <div style={{ fontSize: 22, color: theme.fg2, marginTop: 8, fontWeight: 300, lineHeight: 1.35 }}>{sub}</div>
      </div>
    );
  };
  const arrow = (at: number): React.ReactNode => (
    <div style={{ width: 70, height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${theme.amberA}, ${theme.amberB})`, boxShadow: `0 0 14px ${theme.amberB}`, opacity: interpolate(frame, [at, at + 12], [0, 1], clamp), transform: `scaleX(${String(interpolate(frame, [at, at + 14], [0, 1], clamp))})`, transformOrigin: 'left' }} />
  );
  const boxes = popAt(frame, fps, 90, 18);
  return (
    <Center>
      <div style={{ fontFamily: theme.mono, fontSize: 24, color: theme.fg3, letterSpacing: 2, marginBottom: 46 }}>ONE VULTR CLOUD COMPUTE VM · UBUNTU 24.04</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        {node('Your inbox', 'Forward as attachment', 10)}
        {arrow(40)}
        {node('Burn Box', 'Reads the envelope in a box, then splits it', 50, true)}
        {arrow(80)}
        <div style={{ display: 'flex', gap: 14, opacity: boxes, transform: `scale(${String(0.9 + boxes * 0.1)})` }}>
          {[0, 1, 2].map((i) => <Dial key={i} size={130} lit={1} turn={frame * (0.8 + i * 0.2)} />)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 26, marginTop: 50, alignItems: 'center' }}>
        {node('gVisor', 'A second kernel wall around every box', 120)}
        {node('Vultr Serverless Inference', 'Writes the verdict. Can only make it stricter.', 150, true)}
        {node('Signed receipt', 'Ed25519 proof each box is gone', 180)}
      </div>
    </Center>
  );
};

// 10. Sign-off.
export const OutroScene: React.FC<{ duration: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = popAt(frame, fps, 0, 20);
  return (
    <Center>
      <div style={{ opacity: p, transform: `scale(${String(0.9 + p * 0.1)})` }}><Dial size={300} lit={1} turn={frame * 0.4} glow={0.9} /></div>
      <div style={{ marginTop: 26, fontSize: 104, fontWeight: 600, letterSpacing: -4.5 }}><BlurText text="Burn Box" at={8} /></div>
      <div style={{ marginTop: 6, fontSize: 46, fontWeight: 400, letterSpacing: -1, color: theme.amberA, textShadow: '0 0 24px rgba(245,154,58,.35)' }}><BlurText text="Don't open it. Forward it." at={30} /></div>
      <div style={{ marginTop: 40, fontFamily: theme.mono, fontSize: 24, color: theme.fg3, opacity: interpolate(frame, [60, 80], [0, 1], clamp) }}>github.com/asiyetajwa/burnbox · Built on Vultr</div>
    </Center>
  );
};
