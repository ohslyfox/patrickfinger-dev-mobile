import { P5CanvasInstance } from "@p5-wrapper/react";
import { ColorLerp, pastelGalaxyColors } from "../lib/colorLerp";
import { getGravity, isGravityEnabled } from "../lib/gravity";
import Ripples from "./ripples";
import { CustomElement, Vector } from "../types/p5";

export type ParticleType = "circle" | "star" | "rocket" | "galaxy";

// A drawable sprite for icon particles. We rasterize SVGs into a p5 graphics
// buffer (see loadSvgSprite), and both p5.Image and p5.Graphics are accepted by
// image()/tint(); the type is derived from the instance so we need no direct `p5`
// dependency.
export type P5Image = ReturnType<P5CanvasInstance["createGraphics"]>;

// SVG-icon particle types render a tinted, rotated sprite instead of a vector
// outline; map each to the loaded image supplied at construction.
export type ParticleImages = Partial<Record<ParticleType, P5Image>>;

const BASE_DIAMETER = 30;
const MAX_SIZE_OFFSET = 30;
const MIN_DIAMETER = BASE_DIAMETER;
const MAX_DIAMETER = BASE_DIAMETER + MAX_SIZE_OFFSET;

// A 5-pointed star (matching the award-star SVG): outer points at this fraction
// of the radius, inner vertices pulled in to STAR_INNER_RATIO of that.
const STAR_POINTS = 5;
const STAR_INNER_RATIO = 0.42;

// Depth/perspective: a particle's size maps to how far "back" it reads. The
// smallest particles fade toward this opacity and stroke weight (atmospheric
// perspective), the largest sit in front at full strength.
const FAR_ALPHA = 90;
const NEAR_ALPHA = 255;
const FAR_STROKE = 1;
const NEAR_STROKE = 2.5;
// Deeper (smaller) particles bounce within an inset boundary so they stay in the
// background band: the farthest are held this fraction of the half-extent in from
// each edge; the nearest reach the full edge.
const FAR_BOUNDARY_INSET = 0.18;
// Approach speed (px/s) a wall contact must exceed to count as a fresh collision
// (and recolor); below it the particle is settling/resting, so it doesn't.
const IMPACT_SPEED = 40;
// How much spin a wall impact transfers from tangential motion into rotation,
// and a cap (rad/s) so repeated bounces can't spin a particle into a blur.
const SPIN_TRANSFER = 0.004;
const MAX_ANGULAR_VELOCITY = 6;
// Per-frame angular friction while a particle rests against a wall, so a settled
// particle's spin bleeds off instead of turning forever on the boundary.
const ANGULAR_CONTACT_DAMPING = 0.9;

// Gravity strength in px/s². Scaled by the (unit) device-down direction so the
// bubbles accelerate toward whichever edge is physically lowest.
const GRAVITY = 900;
// Air resistance: velocity decays by this fraction per second, giving a terminal
// velocity instead of accelerating forever.
const DRAG = 0.6;
// Fraction of speed kept on a wall bounce (1 = perfectly elastic, 0 = dead stop).
const RESTITUTION = 0.7;
// Bounciness of particle-vs-particle collisions (slightly springy).
const PARTICLE_RESTITUTION = 0.85;
// Small tangential damping on bounce so bubbles don't skate along a wall forever.
const WALL_FRICTION = 0.92;
// Speed ceiling (px/s) so overlapping ripple shoves can't fling a bubble off the
// canvas in a single frame.
const MAX_SPEED = 1800;
// Above this speed (px/s) a particle leaves a motion trail; the trail keeps up to
// TRAIL_LENGTH past positions, fading and shrinking toward the tail.
const TRAIL_SPEED = 600;
const TRAIL_LENGTH = 10;
// Gentle free-float drift speed (px/s) particles ease back to when idle, and the
// per-second rate they ease toward it.
const FREE_FLOAT_SPEED = 70;
const FREE_FLOAT_EASE = 0.6;
// On returning to free-float, the inward drift heading is jittered by up to ±half
// this (radians) so particles fan out, and each gets this outward velocity kick
// (px/s) to spring back into motion / out of a corner.
const FREE_FLOAT_SPREAD = Math.PI * 0.7;
const REVIVE_KICK = 160;
// At or below this speed (px/s) a particle counts as "still" for idle detection.
const STILL_SPEED = 90;

class Bubble implements CustomElement {
  public readonly location: Vector;
  private readonly velocity: Vector;
  private readonly acceleration: Vector;
  private readonly diameter: number;
  private readonly mass: number;
  private readonly ripples: Ripples;
  private readonly type: ParticleType;
  private readonly image?: P5Image;
  private lerp: ColorLerp;
  // Tracks whether the bubble was already against a wall last frame, so a color
  // change fires once per collision instead of every frame it rests on the floor.
  private touchingWall = false;
  // Conserved angular momentum: rotation spins indefinitely at angularVelocity,
  // which wall impacts nudge (no damping), so the particle keeps turning.
  private rotation: number;
  private angularVelocity: number;
  // Depth in [0, 1] derived from size (0 = smallest/farthest, 1 = largest/nearest),
  // driving atmospheric perspective (alpha + stroke weight).
  private readonly depth: number;
  private readonly alpha: number;
  private readonly strokeWeight: number;
  // Recent positions (newest last) for the high-speed motion trail.
  private readonly trail: Vector[] = [];
  // Drift direction the particle eases toward when free-floating; re-aimed inward
  // on the return to free-float so it doesn't drift into a wall.
  private driftDir: Vector;
  // Whether gravity was on last frame, to detect the moment it switches off (the
  // return to free-float) and apply a reviving kick then.
  private wasGravity = false;

  constructor(
    maxX: number,
    maxY: number,
    ripples: Ripples,
    type: ParticleType = "circle",
    images: ParticleImages = {}
  ) {
    this.location = {
      x: Math.floor(Math.random() * maxX),
      y: Math.floor(Math.random() * maxY),
    };
    this.diameter =
      BASE_DIAMETER + Math.floor(Math.random() * MAX_SIZE_OFFSET);
    // Mass scales with area (∝ diameter²) so larger bubbles carry more momentum
    // and shrug off air resistance more, normalized to ~1 at the base size.
    this.mass = (this.diameter / BASE_DIAMETER) ** 2;

    // Perspective depth from size: smaller particles read as farther back, so
    // they're dimmer and more thinly stroked.
    this.depth =
      (this.diameter - MIN_DIAMETER) / (MAX_DIAMETER - MIN_DIAMETER);
    this.alpha = FAR_ALPHA + (NEAR_ALPHA - FAR_ALPHA) * this.depth;
    this.strokeWeight = FAR_STROKE + (NEAR_STROKE - FAR_STROKE) * this.depth;

    // Free-float at a steady drift until the first tap turns on gravity.
    this.velocity = { x: Math.random() * 120 - 60, y: Math.random() * 120 - 60 };
    this.acceleration = { x: 0, y: 0 };
    const driftAngle = Math.random() * Math.PI * 2;
    this.driftDir = { x: Math.cos(driftAngle), y: Math.sin(driftAngle) };
    this.ripples = ripples;
    this.type = type;
    this.image = images[type];
    // Initial spin (rad/s) is conserved from here; wall impacts adjust it.
    this.angularVelocity = Math.random() * 1.2 - 0.6;
    this.rotation = Math.random() * Math.PI * 2;
    this.lerp = new ColorLerp(pastelGalaxyColors, true, 0.01);
  }

  /** Perspective depth in [0, 1]; smaller = farther back. Used to depth-sort. */
  public get depthValue(): number {
    return this.depth;
  }

  /** Whether the particle has mostly settled — used for idle-reset detection. */
  public get isStill(): boolean {
    return Math.hypot(this.velocity.x, this.velocity.y) <= STILL_SPEED;
  }

  // Free-float drift: ease the velocity toward a gentle constant speed along the
  // particle's drift direction, so settled particles smoothly resume floating
  // instead of freezing once gravity has faded off.
  private applyFreeFloatDrift(dt: number): void {
    const targetX = this.driftDir.x * FREE_FLOAT_SPEED;
    const targetY = this.driftDir.y * FREE_FLOAT_SPEED;
    const ease = Math.min(1, FREE_FLOAT_EASE * dt);
    this.velocity.x += (targetX - this.velocity.x) * ease;
    this.velocity.y += (targetY - this.velocity.y) * ease;
  }

  // On the return to free-float: aim the drift back toward the canvas interior
  // (so a particle resting against a wall/corner heads inward, not into it) and
  // apply an immediate outward kick so it springs back into motion.
  private reviveFreeFloat(p5: P5CanvasInstance): void {
    // Direction from this particle toward the canvas center.
    let ix = p5.windowWidth / 2 - this.location.x;
    let iy = p5.windowHeight / 2 - this.location.y;
    const len = Math.hypot(ix, iy);
    if (len > 0.001) {
      ix /= len;
      iy /= len;
    } else {
      ix = 0;
      iy = -1;
    }
    // Jitter the inward heading so the particles fan out rather than all aiming
    // dead-center.
    const jitter = (Math.random() - 0.5) * FREE_FLOAT_SPREAD;
    const cos = Math.cos(jitter);
    const sin = Math.sin(jitter);
    this.driftDir = { x: ix * cos - iy * sin, y: ix * sin + iy * cos };
    // Reviving kick along the new inward drift direction.
    this.velocity.x += this.driftDir.x * REVIVE_KICK;
    this.velocity.y += this.driftDir.y * REVIVE_KICK;
  }

  /**
   * Resolves a collision with another particle if they overlap: pushes them apart
   * along the contact normal (split by inverse mass) and exchanges the normal
   * component of their velocities as an elastic impulse, so they bounce off each
   * other instead of passing through. Tangential motion is left untouched.
   */
  public collideWith(other: Bubble): void {
    const dx = other.location.x - this.location.x;
    const dy = other.location.y - this.location.y;
    const distSq = dx * dx + dy * dy;
    const minDist = this.diameter / 2 + other.diameter / 2;
    if (distSq >= minDist * minDist || distSq === 0) return;

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;

    // Separate along the normal, each moved inversely to its mass so the heavier
    // one barely shifts.
    const overlap = minDist - dist;
    const invA = 1 / this.mass;
    const invB = 1 / other.mass;
    const totalInv = invA + invB;
    this.location.x -= nx * overlap * (invA / totalInv);
    this.location.y -= ny * overlap * (invA / totalInv);
    other.location.x += nx * overlap * (invB / totalInv);
    other.location.y += ny * overlap * (invB / totalInv);

    // Relative velocity along the normal; only resolve if they're approaching.
    const rvx = other.velocity.x - this.velocity.x;
    const rvy = other.velocity.y - this.velocity.y;
    const approach = rvx * nx + rvy * ny;
    if (approach >= 0) return;

    // Elastic impulse split by inverse mass (momentum conserved).
    const impulse = (-(1 + PARTICLE_RESTITUTION) * approach) / totalInv;
    this.velocity.x -= nx * impulse * invA;
    this.velocity.y -= ny * impulse * invA;
    other.velocity.x += nx * impulse * invB;
    other.velocity.y += ny * impulse * invB;
  }

  public windowResized(p5: P5CanvasInstance): void {
    this.location.x = Math.min(this.location.x, p5.windowWidth);
    this.location.y = Math.min(this.location.y, p5.windowHeight);
  }

  public display(p5: P5CanvasInstance): void {
    this.move(p5);
    this.lerp.step();
    this.drawTrail(p5);
    if (this.image) {
      this.drawImage(p5, this.image);
    } else if (this.type === "star") {
      this.drawOutline(p5);
      this.drawStar(p5);
    } else {
      this.drawOutline(p5);
      p5.ellipse(this.location.x, this.location.y, this.diameter, this.diameter);
    }
  }

  // Fading motion trail behind a fast-moving particle: each stored past position
  // is a dot that shrinks and fades toward the tail (oldest = faintest/smallest).
  private drawTrail(p5: P5CanvasInstance): void {
    if (this.trail.length === 0) return;
    p5.noStroke();
    const { r, g, b } = this.lerp.color;
    for (let i = 0; i < this.trail.length; i++) {
      const t = (i + 1) / this.trail.length; // 0 (tail) .. 1 (head)
      p5.fill(r, g, b, this.alpha * 0.5 * t);
      const size = this.diameter * 0.6 * t;
      p5.ellipse(this.trail[i].x, this.trail[i].y, size, size);
    }
  }

  // Stroke/fill setup shared by the vector (star, circle) particle types.
  private drawOutline(p5: P5CanvasInstance): void {
    p5.fill(0, 0, 0, 0);
    // Depth cues: nearer (larger) particles are brighter and more thickly stroked.
    p5.strokeWeight(this.strokeWeight);
    p5.stroke(
      this.lerp.color.r,
      this.lerp.color.g,
      this.lerp.color.b,
      this.alpha
    );
  }

  // Draws a tinted, rotated SVG sprite (rocket, galaxy) fitted to the diameter.
  // The white-filled source is tinted to the particle's pastel color, with the
  // depth alpha applied so distant icons recede like the vector particles.
  private drawImage(p5: P5CanvasInstance, image: P5Image): void {
    p5.push();
    p5.translate(this.location.x, this.location.y);
    p5.rotate(this.rotation);
    p5.imageMode(p5.CENTER);
    p5.tint(
      this.lerp.color.r,
      this.lerp.color.g,
      this.lerp.color.b,
      this.alpha
    );
    p5.image(image, 0, 0, this.diameter, this.diameter);
    p5.noTint();
    p5.pop();
  }

  // Draws a 5-pointed star inscribed in the particle's diameter, rotating with the
  // particle's spin. Vertices alternate between the outer radius and the pulled-in
  // inner radius (STAR_INNER_RATIO), matching the award-star SVG silhouette.
  private drawStar(p5: P5CanvasInstance): void {
    const outer = this.diameter / 2;
    const inner = outer * STAR_INNER_RATIO;
    const step = Math.PI / STAR_POINTS;
    // Start at the top point (-90°), then offset by the current rotation.
    const start = -Math.PI / 2 + this.rotation;

    p5.beginShape();
    for (let i = 0; i < STAR_POINTS * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = start + i * step;
      p5.vertex(
        this.location.x + Math.cos(angle) * radius,
        this.location.y + Math.sin(angle) * radius
      );
    }
    p5.endShape(p5.CLOSE);
  }

  public mousePressed(_p5: P5CanvasInstance): void {
    return;
  }

  public mouseReleased(_p5: P5CanvasInstance): void {
    return;
  }

  private move(p5: P5CanvasInstance): void {
    // Seconds since the last frame; clamp so a stalled tab doesn't teleport.
    const dt = Math.min(p5.deltaTime / 1000, 1 / 30);

    // Angular momentum is conserved: rotation keeps advancing at the current
    // angular velocity with no damping, so the particle spins indefinitely.
    this.rotation += this.angularVelocity * dt;

    // A passing gravitational wave shoves the bubble outward (heavier bubbles are
    // moved less for the same push). Active in both phases.
    const push = this.ripples.forceAt(this.location);
    this.velocity.x += (push.x / this.mass) * dt;
    this.velocity.y += (push.y / this.mass) * dt;

    const gravity = isGravityEnabled();
    if (gravity) {
      // Gravity is an acceleration (mass-independent in free fall): all bubbles
      // fall at the same rate, but mass still governs momentum and how much drag
      // slows them.
      const g = getGravity();
      this.acceleration.x = g.x * GRAVITY;
      this.acceleration.y = g.y * GRAVITY;
      this.velocity.x += this.acceleration.x * dt;
      this.velocity.y += this.acceleration.y * dt;

      // Air resistance, attenuated by mass so heavier bubbles coast further.
      const drag = Math.exp((-DRAG / this.mass) * dt);
      this.velocity.x *= drag;
      this.velocity.y *= drag;
    } else {
      // On the falling edge of gravity (return to free-float), give a reviving
      // kick aimed inward so particles spring back to life and don't sit stuck in
      // a corner.
      if (this.wasGravity) this.reviveFreeFloat(p5);
      // Free-float: keep a gentle drift so settled particles don't freeze.
      this.applyFreeFloatDrift(dt);
    }
    this.wasGravity = gravity;

    // Cap speed so overlapping waves can't fling a bubble off-canvas in one frame.
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed > MAX_SPEED) {
      this.velocity.x *= MAX_SPEED / speed;
      this.velocity.y *= MAX_SPEED / speed;
    }

    this.location.x += this.velocity.x * dt;
    this.location.y += this.velocity.y * dt;

    this.bounce(p5);
    this.updateTrail(Math.hypot(this.velocity.x, this.velocity.y));
  }

  // Grow the trail while moving fast, otherwise let it shrink away one point per
  // frame so it fades out smoothly when the particle slows.
  private updateTrail(speed: number): void {
    if (speed > TRAIL_SPEED) {
      this.trail.push({ x: this.location.x, y: this.location.y });
      while (this.trail.length > TRAIL_LENGTH) this.trail.shift();
    } else if (this.trail.length > 0) {
      this.trail.shift();
    }
  }

  // Reflect off the walls with restitution (momentum preserved minus loss) and a
  // little tangential friction. Deeper particles bounce inside an inset boundary
  // so they stay in the background band.
  private bounce(p5: P5CanvasInstance): void {
    const r = this.diameter / 2;
    // Deeper (smaller) particles are clamped further in from each edge, keeping
    // them in a tighter central band that reads as "further back".
    const insetX = (1 - this.depth) * FAR_BOUNDARY_INSET * (p5.windowWidth / 2);
    const insetY = (1 - this.depth) * FAR_BOUNDARY_INSET * (p5.windowHeight / 2);
    const minX = r + insetX;
    const maxX = p5.windowWidth - r - insetX;
    const minY = r + insetY;
    const maxY = p5.windowHeight - r - insetY;
    let hit = false;
    // Approach speed into the wall hit this frame, and the tangential spin kick a
    // genuine impact would impart (applied only on a fresh impact, below).
    let impact = 0;
    let spinKick = 0;

    if (this.location.x < minX) {
      impact = Math.max(impact, Math.abs(this.velocity.x));
      this.location.x = minX;
      this.velocity.x = Math.abs(this.velocity.x) * RESTITUTION;
      // Tangential motion along a side wall (vertical) grips and spins the
      // particle; +y (downward) on the left wall rolls counter-clockwise.
      spinKick -= (this.velocity.y / r) * SPIN_TRANSFER * 60;
      this.velocity.y *= WALL_FRICTION;
      hit = true;
    } else if (this.location.x > maxX) {
      impact = Math.max(impact, Math.abs(this.velocity.x));
      this.location.x = maxX;
      this.velocity.x = -Math.abs(this.velocity.x) * RESTITUTION;
      spinKick += (this.velocity.y / r) * SPIN_TRANSFER * 60;
      this.velocity.y *= WALL_FRICTION;
      hit = true;
    }

    if (this.location.y < minY) {
      impact = Math.max(impact, Math.abs(this.velocity.y));
      this.location.y = minY;
      this.velocity.y = Math.abs(this.velocity.y) * RESTITUTION;
      spinKick += (this.velocity.x / r) * SPIN_TRANSFER * 60;
      this.velocity.x *= WALL_FRICTION;
      hit = true;
    } else if (this.location.y > maxY) {
      impact = Math.max(impact, Math.abs(this.velocity.y));
      this.location.y = maxY;
      this.velocity.y = -Math.abs(this.velocity.y) * RESTITUTION;
      // On the floor, +x (rightward) motion rolls clockwise.
      spinKick -= (this.velocity.x / r) * SPIN_TRANSFER * 60;
      this.velocity.x *= WALL_FRICTION;
      hit = true;
    }

    // Re-aim free-float drift inward off any wall it's against, so the gentle
    // drift never keeps pushing a particle into a wall/corner (which would pin it).
    if (this.location.x <= minX && this.driftDir.x < 0) {
      this.driftDir.x = -this.driftDir.x;
    } else if (this.location.x >= maxX && this.driftDir.x > 0) {
      this.driftDir.x = -this.driftDir.x;
    }
    if (this.location.y <= minY && this.driftDir.y < 0) {
      this.driftDir.y = -this.driftDir.y;
    } else if (this.location.y >= maxY && this.driftDir.y > 0) {
      this.driftDir.y = -this.driftDir.y;
    }

    const freshImpact = hit && !this.touchingWall && impact > IMPACT_SPEED;

    // Only a real impact imparts spin; while a particle stays in contact its spin
    // bleeds off via rolling friction, so resting particles settle instead of
    // being re-spun every frame (which made them turn forever on the boundary).
    if (freshImpact) {
      this.angularVelocity += spinKick;
    } else if (hit) {
      this.angularVelocity *= ANGULAR_CONTACT_DAMPING;
    }

    // Keep conserved spin within a sane range so repeated bounces don't blur it.
    this.angularVelocity = Math.max(
      -MAX_ANGULAR_VELOCITY,
      Math.min(MAX_ANGULAR_VELOCITY, this.angularVelocity)
    );

    // Recolor only on a genuine impact, not while settling against the boundary.
    if (freshImpact) this.lerp.stepForwardRand();
    this.touchingWall = hit;
  }
}

export default Bubble;
