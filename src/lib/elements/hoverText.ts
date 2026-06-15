import { P5CanvasInstance } from "@p5-wrapper/react";
import { ColorLerp, grayScaleColors } from "../lib/colorLerp";
import { getGravityDirection, isGravityEnabled } from "../lib/gravity";
import { CustomElement, Vector } from "../types/p5";

// How fast the text eases toward its target angle (per second).
const ROTATION_EASE = 6;

class HoverText implements CustomElement {
  private text: string;
  private url: string;
  private offset: number;
  private colorLerp: ColorLerp;
  public readonly location: Vector;
  // Smoothed current angle; eases toward "upright vs gravity" while interacting
  // and back to 0 (screen-default) when floating.
  private rotation = 0;

  constructor(p5Types: P5CanvasInstance, text: string, url: string, offset: number) {
    this.text = text;
    this.url = url;
    this.offset = offset;
    this.colorLerp = new ColorLerp(grayScaleColors, false, 0.01);
    this.location = {
      x: p5Types.windowWidth / 2,
      y: p5Types.windowHeight / 2 + offset,
    };
  }

  public display(p5: P5CanvasInstance): void {
    this.updateRotation(p5);

    const color = this.colorLerp.step();
    p5.stroke(0);
    p5.textSize(this.mouseIntersects(p5) ? 72 : 52);
    p5.fill(color.r, color.g, color.b);
    p5.textAlign("center");

    // Rotate about the text's center so it stays upright relative to physical down
    // while the device is tilted; eases back to screen-default when floating.
    p5.push();
    p5.translate(this.location.x, this.location.y);
    p5.rotate(this.rotation);
    p5.text(this.text, 0, 0);
    p5.pop();
  }

  // Eases toward the angle that keeps the text upright against gravity (so the
  // screen-down baseline aligns with physical down) while interacting, and toward
  // 0 when free-floating. Takes the shortest path so it never spins the long way.
  private updateRotation(p5: P5CanvasInstance): void {
    let target = 0;
    if (isGravityEnabled()) {
      const g = getGravityDirection();
      // p5.rotate(θ) sends the text's down (0,1) to (−sinθ, cosθ); aligning that
      // with gravity-down (gx, gy) gives θ = atan2(−gx, gy).
      target = Math.atan2(-g.x, g.y);
    }
    // Shortest signed angular difference, robust to wrap-around.
    const diff = target - this.rotation;
    const delta = Math.atan2(Math.sin(diff), Math.cos(diff));
    const dt = Math.min(p5.deltaTime / 1000, 1 / 30);
    this.rotation += delta * Math.min(1, ROTATION_EASE * dt);
  }

  private mouseIntersects(p5: P5CanvasInstance): boolean {
    return p5.dist(p5.mouseX, p5.mouseY, this.location.x, this.location.y) < 75;
  }

  public mousePressed(p5: P5CanvasInstance): boolean {
    if (this.mouseIntersects(p5)) {
      window.open(this.url);
      return true;
    }
    return false;
  }

  public mouseReleased(_p5: P5CanvasInstance): void {
    return;
  }

  public windowResized(p5: P5CanvasInstance): void {
    this.location.x = p5.windowWidth / 2;
    this.location.y = p5.windowHeight / 2 + this.offset;
  }
}

export default HoverText;
