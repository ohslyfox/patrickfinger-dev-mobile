import { Vector } from "../types/p5";

// Device-orientation-driven gravity, shared by every bubble.
//
// The accelerometer (`accelerationIncludingGravity`) reports the gravity vector
// in the device's own coordinate frame (x: right, y: up the device, ~±9.8 m/s²).
// We turn that into a screen-space "down" direction so the bubbles fall toward
// whichever edge is physically lowest. Held upright, gravity points down (+y in
// screen space). When no sensor is available (desktop) or permission is denied,
// we fall back to a constant downward pull.

const FALLBACK: Vector = { x: 0, y: 1 };
const ZERO: Vector = { x: 0, y: 0 };

// Smoothed, normalized screen-space down vector. Magnitude ~1 (a unit direction);
// callers scale it by their own gravity strength.
const current: Vector = { x: FALLBACK.x, y: FALLBACK.y };

// How quickly the smoothed vector chases the raw sensor reading (per update).
const SMOOTHING = 0.12;
// Below this magnitude the accelerometer reading is too weak/noisy to trust a
// direction from (e.g. device in free fall), so we hold the last good one.
const MIN_MAGNITUDE = 0.5;

let listening = false;
// Gravity is off until the first interaction: bubbles free-float and bounce, then
// gravity kicks in once the user taps (which is also the iOS motion gesture).
let enabled = false;

/** Whether gravity has been switched on by the first interaction. */
export function isGravityEnabled(): boolean {
  return enabled;
}

/**
 * Current screen-space gravity direction (unit-ish). Returns the zero vector
 * until {@link startGravityTracking} has been called (first interaction). Do not
 * mutate the result.
 */
export function getGravity(): Vector {
  return enabled ? current : ZERO;
}

function setFromDevice(ax: number, ay: number): void {
  // Device frame: +x right, +y up. Screen "down" is -y of the device, and the
  // accelerometer's y already points up the device, so screen-down x/y follow
  // from negating appropriately. Compensate for screen rotation so "down" stays
  // physically down when the phone is turned to landscape.
  const angle =
    (typeof screen !== "undefined" && screen.orientation?.angle) || 0;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // accelerationIncludingGravity reports the reaction to gravity along the device
  // axes (+x right, +y up the screen). The ground lies opposite, so the device-x
  // component of "down" is -ax. Screen +y already points downward (opposite the
  // device's +y up), so the device-y component of screen-down is +ay. Held
  // upright (ay ≈ +9.8) this gives (0, +1) — straight down the screen.
  const dx = -ax;
  const dy = ay;

  // Rotate by the screen orientation so a landscape turn keeps "down" physical.
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;

  const mag = Math.hypot(rx, ry);
  if (mag < MIN_MAGNITUDE) return;

  const nx = rx / mag;
  const ny = ry / mag;
  current.x += (nx - current.x) * SMOOTHING;
  current.y += (ny - current.y) * SMOOTHING;
}

function handleMotion(event: DeviceMotionEvent): void {
  const g = event.accelerationIncludingGravity;
  if (!g || g.x == null || g.y == null) return;
  setFromDevice(g.x, g.y);
}

/**
 * Starts listening to device motion. On iOS this must be called from a user
 * gesture (it triggers the permission prompt). Safe to call more than once.
 */
export function startGravityTracking(): void {
  // Switch gravity on at the first interaction, even if no motion sensor exists
  // (desktop keeps the constant downward fallback from here on).
  enabled = true;

  if (listening || typeof window === "undefined") return;

  const motionCtor = window.DeviceMotionEvent as
    | (typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      })
    | undefined;
  if (!motionCtor) return; // no sensor → keep the constant fallback

  const attach = () => {
    window.addEventListener("devicemotion", handleMotion);
    listening = true;
  };

  if (typeof motionCtor.requestPermission === "function") {
    motionCtor
      .requestPermission()
      .then((state) => {
        if (state === "granted") attach();
      })
      .catch(() => {
        /* denied or unavailable → keep the fallback */
      });
  } else {
    attach();
  }
}
