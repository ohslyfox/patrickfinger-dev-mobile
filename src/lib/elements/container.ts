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

  public mousePressed(p5: P5CanvasInstance): void {
    for (const elem of this.elements) {
      elem.mousePressed(p5);
    }
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
