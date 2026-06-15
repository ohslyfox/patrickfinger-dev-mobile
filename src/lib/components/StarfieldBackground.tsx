import { useSyncExternalStore, type CSSProperties } from "react";
import styles from "../../styles/StarfieldBackground.module.css";

const STAR_COUNT = 100;
const STAR_COLORS = ["#cfe8ff", "#9fd4ff", "#4cc1ff", "#7fb6c9", "#b89bc4"];

interface StarStyle {
  left: string;
  top: string;
  width: string;
  height: string;
  ["--star-color"]: string;
  ["--twinkle-duration"]: string;
  ["--twinkle-delay"]: string;
}

function generateStars(): StarStyle[] {
  return Array.from({ length: STAR_COUNT }, () => {
    const size = 1 + Math.random() * 2.5;
    return {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${size}px`,
      height: `${size}px`,
      "--star-color":
        STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      "--twinkle-duration": `${1.8 + Math.random() * 2.4}s`,
      "--twinkle-delay": `${Math.random() * 2.5}s`,
    };
  });
}

// Star positions are random per load, so the server (which can't know them) and
// the first client render must agree to avoid a hydration mismatch:
// useSyncExternalStore renders no stars on the server, the randomized set on the
// client, then swaps in the client snapshot.
const EMPTY_STARS: StarStyle[] = [];
let clientStars: StarStyle[] | null = null;

const subscribe = () => () => {};
const getClientSnapshot = (): StarStyle[] => (clientStars ??= generateStars());
const getServerSnapshot = (): StarStyle[] => EMPTY_STARS;

/**
 * Fixed full-viewport backdrop behind the p5 canvas: a dark teal/mauve gradient
 * sky scattered with softly twinkling stars, mirroring the desktop site's loading
 * skeleton. Sits at z-index -1 so the (transparent) sketch canvas draws over it.
 */
export default function StarfieldBackground() {
  const stars = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  return (
    <div className={styles.background} aria-hidden="true">
      {stars.map((style, i) => (
        <span key={i} className={styles.star} style={style as CSSProperties} />
      ))}
    </div>
  );
}
