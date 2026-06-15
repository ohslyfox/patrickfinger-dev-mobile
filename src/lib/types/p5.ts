import { P5CanvasInstance } from "@p5-wrapper/react";

export interface Vector {
  x: number;
  y: number;
}

type p5Method = (p5: P5CanvasInstance) => void;

type P5Methods = {
  display: p5Method;
  // Returns true if the element consumed the tap (e.g. a link opened), so callers
  // can suppress other tap effects like spawning a ripple.
  mousePressed: (p5: P5CanvasInstance) => boolean | void;
  mouseReleased: p5Method;
  windowResized: p5Method;
};

export interface CustomElement extends P5Methods {
  readonly location: Vector;
}

export interface ElementContainer extends P5Methods {
  readonly elements: CustomElement[];
}
