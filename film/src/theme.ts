import { continueRender, delayRender, staticFile } from 'remotion';

// Burn Box's look: dark machined hardware, one warm amber fill. Geist and Geist Mono (SIL Open Font License).
export const theme = {
  bg: '#0d0d0e',
  shellA: '#242426',
  shellB: '#1b1b1d',
  well: '#101011',
  fg: '#ecebe7',
  fg2: '#a6a49f',
  fg3: '#6f6d69',
  amberA: '#ffe383',
  amberB: '#f59a3a',
  hot: '#ff6b3d',
  safe: '#9bd6a9',
  font: "'Geist', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
} as const;

let fontsRequested = false;

/** Loads both fonts before the first frame renders. */
export function ensureFonts(): void {
  if (fontsRequested || typeof document === 'undefined') return;
  fontsRequested = true;
  const handle = delayRender('Loading fonts');
  Promise.all([
    new FontFace('Geist', `url(${staticFile('fonts/geist.woff2')}) format('woff2')`, { weight: '100 900' }).load(),
    new FontFace('Geist Mono', `url(${staticFile('fonts/geist-mono.woff2')}) format('woff2')`, { weight: '100 900' }).load(),
  ])
    .then((faces) => { for (const f of faces) document.fonts.add(f); })
    .catch((err: unknown) => { console.error(err); })
    .finally(() => { continueRender(handle); });
}
