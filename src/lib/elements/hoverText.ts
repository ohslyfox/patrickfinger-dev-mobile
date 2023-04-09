import p5Types from "p5";
import { ColorLerp, grayScaleColors } from "../lib/colorLerp";
import { CustomElement, Vector } from "../types/p5";

class HoverText implements CustomElement {
  private text: string;
  private url: string;
  private offset: number;
  private colorLerp: ColorLerp;
  public readonly location: Vector;

  constructor(p5Types: p5Types, text: string, url: string, offset: number) {
    this.text = text;
    this.url = url;
    this.offset = offset;
    this.colorLerp = new ColorLerp(grayScaleColors, false, 0.01);
    this.location = {
      x: p5Types.windowWidth / 2,
      y: p5Types.windowHeight / 2 + offset,
    };
  }

  public display(p5: p5Types): void {
    const color = this.colorLerp.step();
    p5.stroke(0);
    p5.textSize(52);
    p5.fill(color.r, color.g, color.b);
    p5.textAlign("center");
    if (this.mouseIntersects(p5)) {
      p5.textSize(72);
    }
    p5.text(this.text, this.location.x, this.location.y);
  }

  private mouseIntersects(p5: p5Types): boolean {
    return p5.dist(p5.mouseX, p5.mouseY, this.location.x, this.location.y) < 75;
  }

  public mousePressed(p5: p5Types): boolean {
    if (this.mouseIntersects(p5)) {
      window.open(this.url);
      return true;
    }
    return false;
  }

  public mouseReleased(_p5: p5Types): void {
    return;
  }

  public windowResized(p5: p5Types): void {
    this.location.x = p5.windowWidth / 2;
    this.location.y = p5.windowHeight / 2 + this.offset;
  }
}

export default HoverText;
