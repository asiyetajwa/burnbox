import { createFilm } from '../components/Film';
import { SCENES } from './script';
import { AttachmentScene, EnvelopeScene, HookScene, HowScene, InboxScene, LinkScene, OutroScene, SplitScene, TitleScene, VerdictScene } from './scenes';

export const burnboxFilm = createFilm('burnbox', SCENES, {
  hook: HookScene,
  title: TitleScene,
  inbox: InboxScene,
  envelope: EnvelopeScene,
  split: SplitScene,
  attachment: AttachmentScene,
  link: LinkScene,
  verdict: VerdictScene,
  how: HowScene,
  outro: OutroScene,
});
