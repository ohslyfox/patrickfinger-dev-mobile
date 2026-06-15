import { P5CanvasInstance } from "@p5-wrapper/react";

// Native size to rasterize the SVG at; particles are small, so this is plenty
// sharp while keeping the offscreen buffer cheap.
const RASTER_SIZE = 128;

type Graphics = ReturnType<P5CanvasInstance["createGraphics"]>;

/**
 * Loads an SVG into a p5 graphics buffer that can be drawn with `image()` and
 * colored with `tint()`. p5's own `loadImage()` rasterizes SVGs unreliably (it
 * can resolve to a zero-size image), so we draw the SVG into an offscreen buffer
 * via a native HTMLImageElement, which always renders SVG correctly.
 */
export function loadSvgSprite(
  p5: P5CanvasInstance,
  url: string
): Promise<Graphics> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const g = p5.createGraphics(RASTER_SIZE, RASTER_SIZE);
      g.clear();
      // Draw the native image straight onto the buffer's 2D context — p5's
      // image() doesn't accept a raw HTMLImageElement, but drawImage always does.
      const ctx = (g as unknown as { drawingContext: CanvasRenderingContext2D })
        .drawingContext;
      ctx.drawImage(img, 0, 0, RASTER_SIZE, RASTER_SIZE);
      resolve(g);
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}
