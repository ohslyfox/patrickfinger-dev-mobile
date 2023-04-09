export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

export const map = (
  input: number,
  y1: number,
  y2: number,
  y3: number,
  y4: number
): number => {
  return y3 + ((y4 - y3) / (y2 - y1)) * (input - y1);
};

export const mapAndBound = (
  input: number,
  y1: number,
  y2: number,
  y3: number,
  y4: number
): number => {
  const val = map(input, y1, y2, y3, y4);
  return Math.max(y3, Math.min(y4, val));
};
