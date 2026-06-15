import { P5CanvasInstance } from "@p5-wrapper/react";
import Container from "./container";
import Bubble, { ParticleType, ParticleImages } from "./bubble";
import HoverText from "./hoverText";
import Ripples from "./ripples";
import { ElementContainer } from "../types/p5";

const PARTICLE_COUNT = 12;

export interface Scene {
  containers: ElementContainer[];
  ripples: Ripples;
}

const getSceneElements = (
  p5: P5CanvasInstance,
  images: ParticleImages = {}
): Scene => {
  // One shared ripple field: it spawns waves on tap and the bubbles read the
  // outward impulse from it. Rendered first so the waves sit behind the bubbles.
  const ripples = new Ripples();

  // Types to choose from. Circle is disabled for now; the SVG-icon types are only
  // offered if their image actually loaded.
  const types: ParticleType[] = ["star"];
  if (images.rocket) types.push("rocket");
  if (images.galaxy) types.push("galaxy");

  const containers = [
    Container.getElementContainer([ripples]),
    Container.getElementContainer(
      Array.from({ length: PARTICLE_COUNT }, () => {
        const type = types[Math.floor(Math.random() * types.length)];
        return new Bubble(
          p5.windowWidth,
          p5.windowHeight,
          ripples,
          type,
          images
        );
      })
        // Draw farthest (smallest) first so nearer, larger particles sit in front.
        .sort((a, b) => a.depthValue - b.depthValue)
    ),
    Container.getElementContainer([
      new HoverText(p5, "résumé", "./resume.pdf", -150),
      new HoverText(p5, "projects", "https://github.com/ohslyfox", 0),
      new HoverText(
        p5,
        "linkedin",
        "https://www.linkedin.com/in/patrick-f-50ab75132",
        150
      ),
    ]),
  ];

  return { containers, ripples };
};

export default getSceneElements;
