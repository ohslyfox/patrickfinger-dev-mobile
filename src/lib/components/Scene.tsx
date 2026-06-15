import React, { useMemo } from "react";
import { P5Canvas, P5CanvasInstance, Sketch } from "@p5-wrapper/react";
import getSceneElements, { Scene as SceneGraph } from "../elements/sceneElements";
import { startGravityTracking } from "../lib/gravity";
import { loadSvgSprite } from "../lib/loadSvgSprite";
import type { ParticleImages } from "../elements/bubble";

interface Props {}

const Scene: React.FC<Props> = () => {
  const sketch: Sketch = useMemo(() => (p5: P5CanvasInstance) => {
    // Disable p5 2.x's Friendly Error System. Its sketch verifier runs a
    // `presetup` hook that grabs the last <script> in the document and re-parses
    // it with acorn — under a bundler that's a Turbopack chunk, not plain sketch
    // source, so it throws "Unexpected token (1:8)". The verifier reads the flag
    // off the p5 constructor (a documented static property), which we reach via
    // the instance's constructor — no need to import p5 directly.
    (p5.constructor as unknown as { disableFriendlyErrors: boolean }).disableFriendlyErrors =
      true;

    let scene: SceneGraph | null = null;
    // p5 2.x supports an async setup: it awaits before the first draw, so we can
    // load the SVG sprites up front. A failed load just falls back to no image for
    // that type (the bubble renders nothing for it) rather than breaking setup.
    p5.setup = async () => {
      p5.createCanvas(p5.windowWidth, p5.windowHeight);
      const images: ParticleImages = {};
      await Promise.all([
        loadSvgSprite(p5, "./rocket.svg")
          .then((img) => {
            images.rocket = img;
          })
          .catch(() => undefined),
        loadSvgSprite(p5, "./galaxy.svg")
          .then((img) => {
            images.galaxy = img;
          })
          .catch(() => undefined),
      ]);
      scene = getSceneElements(p5, images);
    };

    p5.draw = () => {
      // Transparent (not background(0)) so the CSS starfield/gradient backdrop
      // shows through; clear() still wipes the previous frame's trails.
      p5.clear();
      if (!scene) return;
      for (const container of scene.containers) {
        container.display(p5);
      }
    };

    p5.windowResized = () => {
      p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
      if (!scene) return;
      for (const container of scene.containers) {
        container.windowResized(p5);
      }
    };

    p5.mousePressed = () => {
      // First touch doubles as the iOS user gesture that unlocks motion access.
      startGravityTracking();
      if (!scene) return;
      // Let elements handle the tap first; if a link consumed it, don't also emit
      // a gravity wave — just open the link.
      let consumed = false;
      for (const container of scene.containers) {
        if (container.mousePressed(p5)) consumed = true;
      }
      if (!consumed) scene.ripples.spawn(p5.mouseX, p5.mouseY);
    };

    p5.mouseReleased = () => {
      if (!scene) return;
      for (const container of scene.containers) {
        container.mouseReleased(p5);
      }
    };
  }, []);

  return <P5Canvas sketch={sketch} />;
};

export default Scene;