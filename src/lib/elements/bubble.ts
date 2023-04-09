import p5Types from "p5";
import { ColorLerp, rainbowColors } from "../lib/colorLerp";
import { CustomElement, Vector } from "../types/p5";

class Bubble implements CustomElement {
  public readonly location: Vector;
  private vecloity: Vector;
  private lerp: ColorLerp;
  private sizeOffset: number;

  constructor(maxX: number, maxY: number) {
    this.location = {
      x: Math.floor(Math.random() * maxX),
      y: Math.floor(Math.random() * maxY),
    };
    const xVel = Math.random() * 6 - 3;
    const yVel = Math.sqrt(Math.pow(3, 2) - Math.pow(xVel, 2));
    this.sizeOffset = Math.floor(Math.random() * 30);
    this.vecloity = {
      x: xVel,
      y: yVel,
    };
    this.lerp = new ColorLerp(rainbowColors, true, 0.01);
  }

  public windowResized(p5: p5Types): void {
    if (this.boundX(p5) || this.boundY(p5)) {
      this.location.x = p5.windowWidth / 2;
      this.location.y = p5.windowHeight / 2;
    }
  }

  public display(p5: p5Types): void {
    this.move(p5);
    this.lerp.step();
    p5.fill(0, 0, 0, 0);
    p5.strokeWeight(2);
    p5.stroke(this.lerp.color.r, this.lerp.color.g, this.lerp.color.b);
    p5.ellipse(
      this.location.x,
      this.location.y,
      30 + this.sizeOffset,
      30 + this.sizeOffset
    );
  }

  public mousePressed(_p5: p5Types): void {
    return;
  }

  public mouseReleased(_p5: p5Types): void {
    return;
  }

  private boundX(p5: p5Types): boolean {
    return this.location.x <= 0 || this.location.x >= p5.windowWidth;
  }

  private boundY(p5: p5Types): boolean {
    return this.location.y <= 0 || this.location.y >= p5.windowHeight;
  }

  private move(p5: p5Types): void {
    this.location.x += this.vecloity.x;
    this.location.y += this.vecloity.y;

    const boundX = this.boundX(p5);
    const boundY = this.boundY(p5);
    if (boundX || boundY) {
      if (boundX) {
        this.vecloity.x *= -1;
      }
      if (boundY) {
        this.vecloity.y *= -1;
      }
      this.lerp.stepForwardRand();
      this.setNextSizeOffset();
    }
  }

  private setNextSizeOffset(): void {
    this.sizeOffset = Math.floor(Math.random() * 30);
  }
}

export default Bubble;