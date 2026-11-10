import React from 'react';
import { Composition } from 'remotion';
import { FPS } from './components/Film';
import { burnboxFilm } from './burnbox/BurnBoxFilm';
import { kiroFilm } from './kiro/KiroFilm';

export const Root: React.FC = () => (
  <>
    <Composition
      id="BurnBoxLandscape"
      component={burnboxFilm.Component}
      durationInFrames={burnboxFilm.durationInFrames}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={burnboxFilm.defaultProps}
      calculateMetadata={burnboxFilm.calculateMetadata}
    />
    <Composition
      id="BurnBoxKiroween"
      component={kiroFilm.Component}
      durationInFrames={kiroFilm.durationInFrames}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={kiroFilm.defaultProps}
      calculateMetadata={kiroFilm.calculateMetadata}
    />
  </>
);
