import { P5CanvasInstance } from "@p5-wrapper/react";
import { CustomElement, Vector } from "../types/p5";

// How long a ripple lives, and how fast its leading edge expands (px/s). Slow and
// long-lived so the wave reads as a wide, glossy swell rather than a quick flash.
const LIFETIME = 2.6;
const SPEED = 300;
// Radius (px) of the wavefront band that pushes bubbles, and the outward force
// (px/s² of acceleration) applied while the front sweeps over a bubble at full
// strength. Big enough to overpower gravity (≈900) by a wide margin, so the wave
// launches bubbles outward/upward like an explosion before they fall back.
const FRONT_THICKNESS = 150;
const PUSH_IMPULSE = 4200;
// Extra upward bias (fraction of the push) added on top of the radial shove, so
// the wave throws bubbles up against gravity — even those below the tap point —
// for an "explode upward" feel rather than just radially outward.
const UPWARD_BIAS = 0.6;
// Concentric rings drawn per ripple, trailing behind the leading edge.
const RING_COUNT = 4;
const RING_SPACING = 34;
const MAX_STROKE = 4;

interface Ripple {
  x: number;
  y: number;
  age: number; // seconds since spawn
}

/**
 * Expanding translucent "gravitational wave" rings spawned on tap. Renders the
 * rings and reports the outward impulse its wavefronts apply at any point, so the
 * bubbles can be pushed away as a wave passes over them.
 */
class Ripples implements CustomElement {
  public readonly location: Vector = { x: 0, y: 0 };
  private readonly ripples: Ripple[] = [];

  public display(p5: P5CanvasInstance): void {
    const dt = Math.min(p5.deltaTime / 1000, 1 / 30);
    this.advance(dt);
    this.render(p5);
  }

  // Ripples aren't spawned via the tap-dispatch (which would fire even when a
  // link was tapped); the Scene calls spawn() directly only when the tap wasn't
  // consumed by a link.
  public mousePressed(_p5: P5CanvasInstance): void {
    return;
  }

  /** Emits a wave at the given point. */
  public spawn(x: number, y: number): void {
    this.ripples.push({ x, y, age: 0 });
  }

  public mouseReleased(_p5: P5CanvasInstance): void {
    return;
  }

  public windowResized(_p5: P5CanvasInstance): void {
    return;
  }

  /**
   * Net outward force (px/s² of acceleration) at `point` this frame, summed over
   * every active ripple whose wavefront is currently sweeping across it. Returns
   * the zero vector when no front is near. Callers integrate it over their frame
   * delta (and divide by mass).
   */
  public forceAt(point: Vector): Vector {
    const force: Vector = { x: 0, y: 0 };
    for (const ripple of this.ripples) {
      const front = ripple.age * SPEED;
      const dx = point.x - ripple.x;
      const dy = point.y - ripple.y;
      const dist = Math.hypot(dx, dy) || 1;
      // Only the band around the leading edge pushes; strength falls off across
      // the band and as the whole ripple fades over its lifetime.
      const bandDistance = Math.abs(dist - front);
      if (bandDistance > FRONT_THICKNESS) continue;
      const bandFalloff = 1 - bandDistance / FRONT_THICKNESS;
      const lifeFalloff = 1 - ripple.age / LIFETIME;
      const strength = PUSH_IMPULSE * bandFalloff * lifeFalloff;
      force.x += (dx / dist) * strength;
      // Radial push plus an upward bias (screen -y) so the wave launches bubbles
      // up against gravity, not just outward.
      force.y += (dy / dist) * strength - strength * UPWARD_BIAS;
    }
    return force;
  }

  private advance(dt: number): void {
    for (const ripple of this.ripples) ripple.age += dt;
    // Drop expired ripples in place (oldest are first).
    let live = 0;
    for (const ripple of this.ripples) {
      if (ripple.age < LIFETIME) this.ripples[live++] = ripple;
    }
    this.ripples.length = live;
  }

  private render(p5: P5CanvasInstance): void {
    for (const ripple of this.ripples) {
      const progress = ripple.age / LIFETIME; // 0..1
      const front = ripple.age * SPEED;
      const fade = 1 - progress;

      // Glossy translucent lens body: a soft filled disc inside the leading edge,
      // brightest near the front so it reads as a swell of light, not a flat ring.
      p5.noStroke();
      p5.fill(150, 195, 255, 26 * fade);
      p5.ellipse(ripple.x, ripple.y, front * 2, front * 2);

      // Trailing rings, dimmer toward the center.
      p5.noFill();
      for (let i = 0; i < RING_COUNT; i++) {
        const radius = front - i * RING_SPACING;
        if (radius <= 0) continue;
        const ringFade = fade * (1 - i / RING_COUNT);
        p5.strokeWeight(MAX_STROKE * ringFade);
        p5.stroke(180, 210, 255, 130 * ringFade);
        p5.ellipse(ripple.x, ripple.y, radius * 2, radius * 2);
      }

      // Bright crisp leading edge plus a thin near-white highlight just inside it,
      // for a glassy specular sheen on the wavefront.
      if (front > 0) {
        p5.strokeWeight(MAX_STROKE * fade);
        p5.stroke(210, 230, 255, 200 * fade);
        p5.ellipse(ripple.x, ripple.y, front * 2, front * 2);

        const highlight = front - MAX_STROKE * 1.5;
        if (highlight > 0) {
          p5.strokeWeight(1.2 * fade);
          p5.stroke(255, 255, 255, 150 * fade);
          p5.ellipse(ripple.x, ripple.y, highlight * 2, highlight * 2);
        }
      }
    }
  }
}

export default Ripples;
