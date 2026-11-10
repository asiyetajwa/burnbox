import React from 'react';
import { AbsoluteFill, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FPS } from '../components/Film';
import { BlurText, Camera, clamp, popAt, type CamKey } from '../components/motion';
import { theme } from '../theme';
import { Caption, Center, Dial, Vignette } from '../burnbox/scenes';
import marks from '../../public/clips-kiro/marks.json';

type Clip = 'save' | 'email' | 'attachment' | 'team' | 'teamlist' | 'link' | 'quick' | 'verify';
const MARKS = marks as Partial<Record<Clip, Record<string, number>>>;
const mk = (clip: Clip, key: string): number => MARKS[clip]?.[key] ?? 0;
type Rect = { x: number; y: number; w: number; h: number };

/** Live-host footage, full frame, from `from` seconds, with camera keys in frame pixels. Holds the last frame. */
const Footage: React.FC<{ clip: Clip; from: number; keys: { f: number; px: number; py: number; z: number }[]; hide?: Rect[] }> = ({ clip, from, keys, hide = [] }) => {
  const frame = useCurrentFrame();
  const m = MARKS[clip];
  if (!m) {
    // Not recorded yet (needs the host redeploy): a plain slate, so the cut can be timed and reviewed.
    return (
      <Center>
        <div style={{ fontFamily: theme.mono, fontSize: 30, color: theme.fg3 }}>[ {clip} · recorded on the live host after the redeploy ]</div>
      </Center>
    );
  }
  const left = Math.round(((m.seconds ?? 0) - from) * FPS) - 2;
  const cam: CamKey[] = keys.map((k) => ({ f: k.f, x: k.px - 960, y: k.py - 540, z: k.z }));
  return (
    <Camera keys={cam}>
      <div style={{ position: 'absolute', left: -960, top: -540, width: 1920, height: 1080, overflow: 'hidden', borderRadius: 4 }}>
        <Freeze frame={Math.max(0, left)} active={frame >= left}>
          <OffthreadVideo src={staticFile(`clips-kiro/${clip}.mp4`)} startFrom={Math.round(from * FPS)} muted style={{ width: 1920, height: 1080, display: 'block' }} />
        </Freeze>
        {hide.map((r, i) => (
          <div key={i} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 14, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', background: 'rgba(16,16,17,.35)' }} />
        ))}
      </div>
    </Camera>
  );
};

const shot = (clip: Clip, from: () => number, keys: (d: number) => { f: number; px: number; py: number; z: number }[], step: string, text: string): React.FC<{ duration: number }> =>
  ({ duration }) => (
    <AbsoluteFill>
      <Footage clip={clip} from={Math.max(0, from())} keys={keys(duration)} />
      <Vignette />
      <Caption step={step} text={text} />
    </AbsoluteFill>
  );

export const SaveScene = shot('save', () => 0.3, (d) => [
  { f: 0, px: 960, py: 540, z: 1 },
  { f: Math.round(mk('save', 'row') * FPS), px: 720, py: 300, z: 1.4 },
  { f: Math.round(mk('save', 'saved') * FPS), px: 900, py: 620, z: 1.1 },
  { f: Math.max(40, d - 20), px: 960, py: 640, z: 1.05 },
], '01', 'Save it, unopened');

export const EnvelopeScene = shot('email', () => mk('email', 'open') - 0.2, (d) => [
  { f: 0, px: 960, py: 540, z: 1 },
  { f: 40, px: 520, py: 520, z: 1.45 },
  { f: Math.max(60, d - 40), px: 470, py: 720, z: 1.55 },
], '02', 'Even the envelope is read in a sealed box');

export const SplitScene = shot('email', () => mk('email', 'split') - 0.6, (d) => [
  { f: 0, px: 1060, py: 380, z: 1.6 },
  { f: Math.max(30, d - 10), px: 1050, py: 420, z: 1.75 },
], '03', 'One fresh gVisor box per part');

export const AttachmentScene = shot('attachment', () => mk('attachment', 'detonate') - 0.3, (d) => [
  { f: 0, px: 960, py: 560, z: 1.05 },
  { f: 45, px: 560, py: 690, z: 1.22 },
  { f: Math.round(d * 0.55), px: 600, py: 700, z: 1.22 },
  { f: Math.max(60, d - 10), px: 1200, py: 560, z: 1.25 },
], '04', 'The attachment\'s box: fake secrets, a wall');

export const LinkScene = shot('link', () => mk('link', 'detonate') - 0.3, (d) => [
  { f: 0, px: 960, py: 540, z: 1.05 },
  { f: 50, px: 520, py: 520, z: 1.5 },
  { f: Math.max(70, d - 10), px: 1240, py: 470, z: 1.35 },
], '05', 'The link\'s box: a fake login, traced');

export const VerdictScene = shot('email', () => mk('email', 'verdict') - 0.5, (d) => [
  { f: 0, px: 960, py: 540, z: 1 },
  { f: 40, px: 560, py: 430, z: 1.4 },
  { f: Math.round(d * 0.55), px: 560, py: 430, z: 1.4 },
  { f: Math.max(60, d - 12), px: 1150, py: 420, z: 1.5 },
], '06', 'Verdict by Gemini, signed receipt');

export const QuickScene = shot('quick', () => mk('quick', 'go') - 2.2, (d) => [
  { f: 0, px: 760, py: 380, z: 1.3 },
  { f: Math.max(40, d - 20), px: 760, py: 600, z: 1.25 },
], '07', 'Quick check: one link, one answer');

// The team code is a live credential for the demo team, so it is blurred.
const TEAM_CODE: Rect = { x: 190, y: 350, w: 520, h: 90 };
export const TeamScene: React.FC<{ duration: number }> = ({ duration }) => {
  const first = Math.round(Math.max(0, mk('team', 'on') - 0.5) * FPS);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={first}>
        <Footage clip="team" from={0.6} hide={[TEAM_CODE]} keys={[{ f: 0, px: 960, py: 420, z: 1.2 }, { f: first, px: 760, py: 360, z: 1.35 }]} />
      </Sequence>
      <Sequence from={first}>
        <Footage clip="teamlist" from={0.4} keys={[{ f: 0, px: 900, py: 520, z: 1.2 }, { f: Math.max(30, duration - first - 10), px: 820, py: 560, z: 1.3 }]} />
      </Sequence>
      <Vignette />
      <Caption step="08" text="A team workspace, off the public list" />
    </AbsoluteFill>
  );
};

export const VerifyScene = shot('verify', () => 0.4, (d) => [
  { f: 0, px: 760, py: 420, z: 1.2 },
  { f: Math.round((mk('verify', 'real') - 0.4) * FPS), px: 640, py: 520, z: 1.35 },
  { f: Math.round((mk('verify', 'forged') - 0.4) * FPS), px: 640, py: 520, z: 1.35 },
  { f: Math.max(60, d - 10), px: 660, py: 520, z: 1.4 },
], '09', 'Anyone can check a receipt');

// How it was built: the real /.kiro tree, file by file.
const SPECS: [string, string][] = [
  ['live-inference', 'Gemini verdicts, labelled on every receipt'],
  ['verdict-history-workspace', 'Team history behind unguessable codes'],
  ['link-quick-check', 'One link, one signed answer'],
  ['receipt-verification', 'Public signature check'],
  ['host-deploy', 'Volume-preserving deploy to Google Cloud'],
];
export const KiroScene: React.FC<{ duration: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const row = (at: number): React.CSSProperties => { const p = popAt(frame, fps, at, 18); return { opacity: p, transform: `translateX(${String((1 - p) * -30)}px)` }; };
  const mono: React.CSSProperties = { fontFamily: theme.mono, fontSize: 26, color: theme.fg };
  return (
    <Center>
      <div style={{ display: 'flex', gap: 60, alignItems: 'flex-start' }}>
        <div style={{ padding: '34px 40px', borderRadius: 30, background: `linear-gradient(180deg, ${theme.shellA}, ${theme.shellB})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07), 0 30px 60px -20px rgba(0,0,0,.9)', minWidth: 620 }}>
          <div style={{ ...mono, color: theme.amberA, fontSize: 30, ...row(4) }}>/.kiro</div>
          <div style={{ ...mono, marginTop: 18, color: theme.fg2, ...row(12) }}>  steering/</div>
          <div style={{ ...mono, marginLeft: 60, color: theme.fg3, fontSize: 22, ...row(18) }}>product.md · tech.md · structure.md</div>
          <div style={{ ...mono, marginTop: 18, color: theme.fg2, ...row(26) }}>  specs/</div>
          {SPECS.map(([s], i) => (
            <div key={s} style={{ ...mono, marginLeft: 60, marginTop: 8, ...row(34 + i * 10) }}>{s}/ <span style={{ color: theme.fg3, fontSize: 20 }}>requirements · design · tasks</span></div>
          ))}
        </div>
        <div style={{ paddingTop: 108, display: 'grid', gap: 18 }}>
          {SPECS.map(([s, what], i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, color: theme.fg, ...row(44 + i * 10) }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: theme.amberB, boxShadow: `0 0 14px ${theme.amberB}` }} />{what}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 50, fontSize: 30, color: theme.fg2, fontWeight: 300, opacity: interpolate(frame, [110, 130], [0, 1], clamp) }}>Built spec-first in Kiro · github.com/asiyetajwa/burnbox-kiro</div>
    </Center>
  );
};

export const KiroTitleScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = popAt(frame, fps, 0, 20);
  const lit = interpolate(frame, [6, duration - 20], [0, 1], clamp);
  return (
    <Center>
      <div style={{ transform: `scale(${String(0.85 + p * 0.15)})`, opacity: p }}><Dial size={420} lit={lit} turn={frame * 0.6} glow={interpolate(frame, [40, 70], [0, 0.9], clamp)} /></div>
      <div style={{ marginTop: 30, fontSize: 120, fontWeight: 600, letterSpacing: -5 }}><BlurText text="Burn Box" at={18} /></div>
      <div style={{ marginTop: 8, fontSize: 40, fontWeight: 300, color: theme.fg2 }}><BlurText text="A detonation chamber for small teams. Built with Kiro." at={42} /></div>
    </Center>
  );
};

export const KiroOutroScene: React.FC<{ duration: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = popAt(frame, fps, 0, 20);
  return (
    <Center>
      <div style={{ opacity: p, transform: `scale(${String(0.9 + p * 0.1)})` }}><Dial size={300} lit={1} turn={frame * 0.4} glow={0.9} /></div>
      <div style={{ marginTop: 26, fontSize: 104, fontWeight: 600, letterSpacing: -4.5 }}><BlurText text="Burn Box" at={8} /></div>
      <div style={{ marginTop: 6, fontSize: 46, fontWeight: 400, letterSpacing: -1, color: theme.amberA, textShadow: '0 0 24px rgba(245,154,58,.35)' }}><BlurText text="Don't open it. Let the box open it." at={30} /></div>
      <div style={{ marginTop: 40, fontFamily: theme.mono, fontSize: 24, color: theme.fg3, opacity: interpolate(frame, [60, 80], [0, 1], clamp) }}>Built with Kiro · Running on Google Cloud · Verdicts by Gemini</div>
    </Center>
  );
};
