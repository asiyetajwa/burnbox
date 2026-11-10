// Burn Box, Kiroween cut. Every app shot is the live demo host (Google Cloud, gVisor boxes, Gemini verdicts), recorded
// by scripts/record-kiro.mjs. Voiceover: node scripts/voiceover.mjs kiro. The model is named as the receipts name it.
// Written for the ear: "Gemini three point five Flash-Lite" so the voice reads the model name cleanly.

import type { SceneSpec } from '../components/Film';

export type SceneId = 'hook' | 'title' | 'save' | 'envelope' | 'split' | 'attachment' | 'link' | 'verdict' | 'quick' | 'team' | 'verify' | 'kiro' | 'outro';

export const SCENES: SceneSpec<SceneId>[] = [
  { id: 'hook', voiceover: 'Every small business gets this email. <break time="0.3s" /> A late fee by five o\'clock. An attachment. A link. And no security team to ask.', minSeconds: 9 },
  { id: 'title', voiceover: 'This is Burn Box, a detonation chamber for small teams, built with Kiro. It opens the dangerous thing, so you never have to.', minSeconds: 7 },
  { id: 'save', voiceover: 'So don\'t open the email. Save it, unopened, and drop it into Burn Box.', minSeconds: 6 },
  { id: 'envelope', voiceover: 'Even reading the email happens inside a sealed box with no internet. The sender failed every check. Replies go to a lookalike domain. And the link shows one address, but goes to another.', minSeconds: 9 },
  { id: 'split', voiceover: 'Then Burn Box splits it up. The attachment and the link each get a fresh box of their own, under gVisor, on Google Cloud.', minSeconds: 7.5 },
  { id: 'attachment', voiceover: 'Up close, the attachment goes straight for a cloud key, a crypto wallet and saved passwords. They\'re fake, planted for this run. It tries to phone home, and the wall stops it, every time. It tries to install itself, and delete shared files. <break time="0.2s" /> Denied.', minSeconds: 10 },
  { id: 'link', voiceover: 'The link opens a fake sign-in page. Burn Box types in a login that doesn\'t exist, and watches the page send it somewhere else.', minSeconds: 9 },
  { id: 'verdict', voiceover: 'Then every box burns. Gemini, three point five Flash-Lite, reads the record and writes the verdict in plain English. It can make a verdict stricter, never softer. And every run ends with a signed receipt.', minSeconds: 9 },
  { id: 'quick', voiceover: 'For a single link, there\'s a quick check. Paste it in, and get one answer, with the same signed receipt.', minSeconds: 7 },
  { id: 'team', voiceover: 'Teams get a shared workspace. Start a team, keep the code, and your runs stay off the public list, with their own history and filters.', minSeconds: 8 },
  { id: 'verify', voiceover: 'And anyone can check a receipt. The real one is valid. Change one word, and it isn\'t.', minSeconds: 8 },
  { id: 'kiro', voiceover: 'Burn Box was rebuilt in Keero, spec first. Steering documents set the rules, and five specs, each with requirements, a design and tasks, took it to the live product: Gemini verdicts, teams, the quick check, receipt verification, and the deploy.', minSeconds: 12 },
  { id: 'outro', voiceover: 'Burn Box. <break time="0.4s" /> Don\'t open it. Let the box open it.', minSeconds: 5.5, after: { file: 'sfx/stamp.mp3', gap: 0.15, seconds: 1.2, volume: 0.6 } },
];
