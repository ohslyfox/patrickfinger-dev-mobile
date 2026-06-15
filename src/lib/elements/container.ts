import { CustomElement, ElementContainer } from "../types/p5";
import { P5CanvasInstance } from "@p5-wrapper/react";

class Container implements ElementContainer {
  public readonly elements: CustomElement[];

  public static getElementContainer(
    elements: CustomElement[]
  ): ElementContainer {
    return new Container(elements);
  }

  private constructor(elements: CustomElement[]) {
    this.elements = elements;
  }

  public display(p5: P5CanvasInstance): void {
    for (const elem of this.elements) {
      elem.display(p5);
    }
  }

  // Returns true if any element consumed the tap (so the caller can skip other
  // tap effects, e.g. a ripple, when a link was opened).
  public mousePressed(p5: P5CanvasInstance): boolean {
    let consumed = false;
    for (const elem of this.elements) {
      if (elem.mousePressed(p5)) consumed = true;
    }
    return consumed;
  }

  public mouseReleased(p5: P5CanvasInstance): void {
    for (const elem of this.elements) {
      elem.mouseReleased(p5);
    }
  }

  public windowResized(p5: P5CanvasInstance): void {
    for (const elem of this.elements) {
      elem.windowResized(p5);
    }
  }
}

export default Container;
