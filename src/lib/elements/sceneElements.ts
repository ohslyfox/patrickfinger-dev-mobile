import { P5CanvasInstance } from "@p5-wrapper/react";
import Container from "./container";
import Bubble, { ParticleType, ParticleImages } from "./bubble";
import HoverText from "./hoverText";
import Ripples from "./ripples";
import { ElementContainer } from "../types/p5";

const PARTICLE_COUNT = 12;
// Pairwise collision passes per frame: extra passes settle clusters where pushing
// one pair apart shoves a particle into another. n is small, so this is cheap.
const COLLISION_PASSES = 2;

export interface Scene {
  containers: ElementContainer[];
  ripples: Ripples;
  bubbles: Bubble[];
}

/** Resolves overlaps between every pair of particles (O(n²); n is small). */
export const resolveCollisions = (bubbles: Bubble[]): void => {
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        bubbles[i].collideWith(bubbles[j]);
      }
    }
  }
};

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

  const bubbles = Array.from({ length: PARTICLE_COUNT }, () => {
    const type = types[Math.floor(Math.random() * types.length)];
    return new Bubble(p5.windowWidth, p5.windowHeight, ripples, type, images);
  })
    // Draw farthest (smallest) first so nearer, larger particles sit in front.
    .sort((a, b) => a.depthValue - b.depthValue);

  const containers = [
    Container.getElementContainer([ripples]),
    Container.getElementContainer(bubbles),
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

  return { containers, ripples, bubbles };
};

export default getSceneElements;
