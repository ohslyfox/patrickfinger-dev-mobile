import { lerp } from "./util";

export interface Color {
  r: number;
  g: number;
  b: number;
}

// Saturated galaxy tones — clearly chromatic blue/teal/violet/pink/gold while
// staying luminous over the dark gradient sky. Deeper than the old near-white
// pastels so the particles (and tinted SVG icons) actually read as colored.
export const pastelGalaxyColors: Color[] = [
  { r: 96, g: 178, b: 255 }, // vivid sky blue
  { r: 64, g: 220, b: 230 }, // bright cyan-teal
  { r: 140, g: 130, b: 255 }, // electric periwinkle
  { r: 196, g: 120, b: 240 }, // violet-magenta
  { r: 255, g: 130, b: 200 }, // hot pink
  { r: 255, g: 200, b: 130 }, // warm gold (star glow)
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
