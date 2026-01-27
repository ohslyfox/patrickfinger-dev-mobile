import React, { useMemo } from "react";
import { P5Canvas, P5CanvasInstance, Sketch } from "@p5-wrapper/react";
import { ElementContainer } from "../types/p5";
import getSceneElements from "../elements/sceneElements";

interface Props {}

const Scene: React.FC<Props> = () => {
  const sketch: Sketch = useMemo(() => (p5: P5CanvasInstance) => {
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