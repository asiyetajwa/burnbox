import { createFilm } from '../components/Film';
import { HookScene } from '../burnbox/scenes';
import { SCENES } from './script';
import { AttachmentScene, EnvelopeScene, KiroOutroScene, KiroScene, KiroTitleScene, LinkScene, QuickScene, SaveScene, SplitScene, TeamScene, VerdictScene, VerifyScene } from './scenes';

export const kiroFilm = createFilm('kiro', SCENES, {
  hook: HookScene,
  title: KiroTitleScene,
  save: SaveScene,
  envelope: EnvelopeScene,
  split: SplitScene,
  attachment: AttachmentScene,
  link: LinkScene,
  verdict: VerdictScene,
  quick: QuickScene,
  team: TeamScene,
  verify: VerifyScene,
  kiro: KiroScene,
  outro: KiroOutroScene,
});
