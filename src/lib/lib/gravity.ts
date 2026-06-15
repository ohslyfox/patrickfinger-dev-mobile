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

// Idle reset: after this long with no tap and no significant device rotation
// (and once the particles have mostly settled), gravity fades back off and the
// particles return to free-floating. The strength eases over RESET_FADE for a
// smooth transition rather than snapping.
const IDLE_TIMEOUT = 3; // seconds
const RESET_FADE = 1.5; // seconds to fade gravity strength 1 → 0
// Device rotation handling. rotationRate is noisy, so we low-pass it and only
// treat *sustained* rotation above a high bar as a real "user is moving it"
// signal — minor jitter/sensor noise no longer cancels a pending reset.
const ROTATION_THRESHOLD = 90; // deg/s (summed axes), smoothed
const ROTATION_SMOOTHING = 0.1; // low-pass factor for the rotation magnitude

let listening = false;
// Gravity is off until the first interaction: bubbles free-float and bounce, then
// gravity kicks in once the user taps (which is also the iOS motion gesture).
let enabled = false;
// Seconds since the last tap or significant device rotation.
let idleTime = 0;
// 1 while gravity is fully on; eases toward 0 during an idle reset so callers can
// fade the pull out smoothly.
let strength = 0;
// Low-pass-filtered rotation magnitude (deg/s), so brief sensor spikes don't read
// as the user actively moving the device.
let rotationMag = 0;

/** Whether gravity is currently influencing particles at all (strength > 0). */
export function isGravityEnabled(): boolean {
  return enabled && strength > 0.001;
}

/**
 * Smoothed screen-space "down" unit direction (not strength-scaled, so it stays
 * stable during the fade). Use with {@link isGravityEnabled} to orient UI to
 * physical down. Do not mutate the result.
 */
export function getGravityDirection(): Vector {
  return current;
}

/**
 * Resets the idle timer and restores full gravity. Call on a deliberate tap — an
 * unambiguous interaction, so it's safe to snap strength back to 1.
 */
export function noteInteraction(): void {
  idleTime = 0;
  if (enabled) strength = 1;
}

/**
 * Advances the idle timer and gravity-strength fade. `dt` is seconds since the
 * last frame; `particlesStill` reports whether the field has mostly settled (so a
 * reset only happens once things are calm). Once idle past IDLE_TIMEOUT with the
 * particles still, the strength eases to 0 and gravity switches off.
 */
export function updateGravity(dt: number, particlesStill: boolean): void {
  if (!enabled) return;
  idleTime += dt;
  const idle = idleTime >= IDLE_TIMEOUT && particlesStill;
  if (idle) {
    strength = Math.max(0, strength - dt / RESET_FADE);
    if (strength === 0) enabled = false; // fully returned to free-float
  } else {
    strength = Math.min(1, strength + dt / RESET_FADE);
  }
}

// Scratch for the strength-scaled gravity returned by getGravity (no per-call
// allocation).
const scaled: Vector = { x: 0, y: 0 };

/**
 * Current screen-space gravity vector (direction × strength). Returns the zero
 * vector until {@link startGravityTracking} (first interaction) and as it fades
 * back to free-float. Do not mutate the result.
 */
export function getGravity(): Vector {
  if (!enabled) return ZERO;
  scaled.x = current.x * strength;
  scaled.y = current.y * strength;
  return scaled;
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

  // Low-pass the rotation rate so only *sustained* turning reads as the user
  // actively moving the device. Sustained rotation just keeps the idle timer
  // reset; unlike a tap it does NOT snap gravity back to full, so a brief jiggle
  // can't yank a settling reset back to life.
  const r = event.rotationRate;
  if (r) {
    const spin =
      Math.abs(r.alpha ?? 0) + Math.abs(r.beta ?? 0) + Math.abs(r.gamma ?? 0);
    rotationMag += (spin - rotationMag) * ROTATION_SMOOTHING;
    if (rotationMag > ROTATION_THRESHOLD) idleTime = 0;
  }
}

/**
 * Starts listening to device motion. On iOS this must be called from a user
 * gesture (it triggers the permission prompt). Safe to call more than once.
 */
export function startGravityTracking(): void {
  // Switch gravity on at the first interaction, even if no motion sensor exists
  // (desktop keeps the constant downward fallback from here on).
  enabled = true;
  strength = 1;
  idleTime = 0;

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
