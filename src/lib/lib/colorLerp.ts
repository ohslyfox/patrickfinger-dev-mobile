import { lerp } from "./util";

export interface Color {
  r: number;
  g: number;
  b: number;
}

export const rainbowColors: Color[] = [
  { r: 255, g: 0, b: 0 },
  { r: 255, g: 255, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 0, g: 255, b: 255 },
  { r: 75, g: 25, b: 255 },
  { r: 255, g: 0, b: 255 },
];

export const grayScaleColors: Color[] = [
  { r: 255, g: 255, b: 255 },
  { r: 230, g: 230, b: 230 },
  { r: 205, g: 205, b: 205 },
  { r: 180, g: 180, b: 180 },
  { r: 205, g: 205, b: 205 },
  { r: 230, g: 230, b: 230 },
];

export class ColorLerp {
  private colors: Color[];
  private currentColor: Color;
  private idx: number;
  private lerpVal: number;
  private lerpAmt: number;

  constructor(colors: Color[], randStartIdx: boolean = false, lerpAmt = 0.001) {
    this.colors = colors;
    this.idx = randStartIdx ? Math.floor(Math.random() * colors.length) : 0;
    this.currentColor = {
      r: colors[this.idx].r,
      g: colors[this.idx].g,
      b: colors[this.idx].b,
    };
    this.lerpVal = 0;
    this.lerpAmt = lerpAmt;
  }

  public get color(): Color {
    return this.currentColor;
  }

  public step(): Color {
    this.lerpVal = Math.min(1, this.lerpVal + this.lerpAmt);
    if (this.lerpVal >= 1) {
      this.idx = (this.idx + 1) % this.colors.length;
      this.lerpVal = 0;
    }

    const nextIndex = this.idx === this.colors.length - 1 ? 0 : this.idx + 1;
    const currentColor = this.colors[this.idx];
    const nextColor = this.colors[nextIndex];
    this.currentColor.r = Math.round(
      lerp(currentColor.r, nextColor.r, this.lerpVal)
    );
    this.currentColor.g = Math.round(
      lerp(currentColor.g, nextColor.g, this.lerpVal)
    );
    this.currentColor.b = Math.round(
      lerp(currentColor.b, nextColor.b, this.lerpVal)
    );
    return this.currentColor;
  }

  public stepForwardRand(): void {
    const rand = Math.floor(Math.random() * 100);
    for (let i = 0; i < rand; i++) {
      this.step();
    }
  }
}
