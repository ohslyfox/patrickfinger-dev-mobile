import React, { useMemo } from "react";
import { P5Canvas, P5CanvasInstance, Sketch } from "@p5-wrapper/react";
import { ElementContainer } from "../types/p5";
import getSceneElements from "../elements/sceneElements";

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

    let elementContainers: ElementContainer[] = [];
    p5.setup = () => {
      p5.createCanvas(p5.windowWidth, p5.windowHeight);
      elementContainers = getSceneElements(p5);
    };

    p5.draw = () => {
      p5.background(0);
      for (const container of elementContainers) {
        container.display(p5);
      }
    };

    p5.windowResized = () => {
      p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
      for (const container of elementContainers) {
        if (container.windowResized) {
          container.windowResized(p5);
        }
      }
    };

    p5.mousePressed = () => {
      for (const container of elementContainers) {
        if (container.mousePressed) {
          container.mousePressed(p5);
        }
      }
    };

    p5.mouseReleased = () => {
      for (const container of elementContainers) {
        if (container.mouseReleased) {
          container.mouseReleased(p5);
        }
      }
    };
  }, []);

  return <P5Canvas sketch={sketch} />;
};

export default Scene;