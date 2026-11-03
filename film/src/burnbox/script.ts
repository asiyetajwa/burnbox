// Burn Box film. Scene order, voiceover lines and minimum on-screen time. The app footage is the real app running
// live (scripts/record.mjs); public/clips/marks.json says when each moment happens in each clip.
// Voiceover: npm run voiceover burnbox. Written for the ear; <break time="0.4s" /> is an ElevenLabs pause tag.

import type { SceneSpec } from '../components/Film';

export type SceneId = 'hook' | 'title' | 'inbox' | 'envelope' | 'split' | 'attachment' | 'link' | 'verdict' | 'how' | 'outro';

export const SCENES: SceneSpec<SceneId>[] = [
  { id: 'hook', voiceover: 'Every small business gets this email. <break time="0.3s" /> A late fee by five o\'clock. An attachment. A link. And no security team to ask.', minSeconds: 9 },
  { id: 'title', voiceover: 'This is Burn Box. A detonation chamber for small teams. It opens the dangerous thing, so you never have to.', minSeconds: 7 },
  { id: 'inbox', voiceover: 'So don\'t open the email. Right-click it in your inbox, forward it as an attachment to Burn Box, and you\'re done.', minSeconds: 10.5 },
  { id: 'envelope', voiceover: 'Even reading the email happens inside a sealed box with no internet. The sender failed every check. Replies go to a lookalike domain. And the link shows one address, but goes to another.', minSeconds: 9 },
  { id: 'split', voiceover: 'Then Burn Box splits it up. The attachment and the link each get a fresh box of their own, running side by side.', minSeconds: 7.5 },
  { id: 'attachment', voiceover: 'Up close, the attachment goes straight for a cloud key, a crypto wallet and saved passwords. They\'re fake, planted for this run. It tries to phone home, and the wall stops it, every time. It tries to install itself, and delete shared files. <break time="0.2s" /> Denied.', minSeconds: 10 },
  { id: 'link', voiceover: 'The link opens a fake sign-in page. Burn Box types in a login that doesn\'t exist, and watches the page send it somewhere else.', minSeconds: 9 },
  { id: 'verdict', voiceover: 'Then every box burns. <break time="0.2s" /> One verdict, in plain English: malicious, delete it. And a signed receipt that proves each box is gone.', minSeconds: 8 },
  { id: 'how', voiceover: 'It all runs on one Vultr cloud server: a fresh, sealed container for every part, gVisor as a second wall, and verdicts written by a model on Vultr Serverless Inference. The model can make a verdict stricter, never softer, so no file can talk its way out.', minSeconds: 12 },
  { id: 'outro', voiceover: 'Burn Box. <break time="0.4s" /> Don\'t open it. Forward it.', minSeconds: 5.5, after: { file: 'sfx/stamp.mp3', gap: 0.15, seconds: 1.2, volume: 0.6 } },
];
