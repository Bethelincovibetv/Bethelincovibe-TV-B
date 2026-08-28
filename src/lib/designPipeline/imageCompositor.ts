import { MaskShapeKey } from "./types";
import { drawRoundRect } from "./backgroundEngine";

/**
 * Loads an image safely into Canvas context with CORS fallback
 */
export function loadCanvasImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(null);
      fallback.src = src;
    };
    img.src = src;
  });
}

/**
 * Draws an image into a rectangular bounding box with focal-point aware cropping
 */
export function drawFocalImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  focalX: number = 0.5,
  focalY: number = 0.5
) {
  const imgW = img.width;
  const imgH = img.height;
  const imgAspect = imgW / imgH;
  const destAspect = dw / dh;

  let sx = 0;
  let sy = 0;
  let sWidth = imgW;
  let sHeight = imgH;

  if (imgAspect > destAspect) {
    // Image is wider than destination -> crop sides based on focalX
    sWidth = imgH * destAspect;
    const maxSx = imgW - sWidth;
    sx = Math.max(0, Math.min(maxSx, (imgW * focalX) - (sWidth / 2)));
  } else {
    // Image is taller than destination -> crop top/bottom based on focalY
    sHeight = imgW / destAspect;
    const maxSy = imgH - sHeight;
    sy = Math.max(0, Math.min(maxSy, (imgH * focalY) - (sHeight / 2)));
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dw, dh);
}

/**
 * Renders a masked stock photo into canvas based on chosen MaskShapeKey
 */
export function renderMaskedSubjectImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  maskShape: MaskShapeKey,
  bounds: { x: number; y: number; width: number; height: number },
  focalPoint: { x: number; y: number },
  borderColor: string = "#F59E0B",
  glowColor: string = "rgba(245, 158, 11, 0.4)"
) {
  const { x, y, width, height } = bounds;

  ctx.save();

  if (maskShape === "circle_portal") {
    const size = Math.min(width, height);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = size / 2;

    // Glowing outer ring
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Clip circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    drawFocalImage(ctx, img, centerX - radius, centerY - radius, size, size, focalPoint.x, focalPoint.y);
    ctx.restore();

    // Inset golden border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (maskShape === "arch_frame") {
    // Elegant architectural arch (half circle top + rect bottom)
    const archRadius = width / 2;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x, y + archRadius);
    ctx.arc(x + archRadius, y + archRadius, archRadius, Math.PI, 0, false);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();

    ctx.fillStyle = "#0F172A";
    ctx.fill();
    ctx.restore();

    // Clip arch & draw
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x, y + archRadius);
    ctx.arc(x + archRadius, y + archRadius, archRadius, Math.PI, 0, false);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.clip();

    drawFocalImage(ctx, img, x, y, width, height, focalPoint.x, focalPoint.y);
    ctx.restore();

    // Arch stroke
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x, y + archRadius);
    ctx.arc(x + archRadius, y + archRadius, archRadius, Math.PI, 0, false);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.stroke();
  } else if (maskShape === "diamond_shield") {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(x + width, cy);
    ctx.lineTo(cx, y + height);
    ctx.lineTo(x, cy);
    ctx.closePath();
    ctx.clip();

    drawFocalImage(ctx, img, x, y, width, height, focalPoint.x, focalPoint.y);
    ctx.restore();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(x + width, cy);
    ctx.lineTo(cx, y + height);
    ctx.lineTo(x, cy);
    ctx.closePath();
    ctx.stroke();
  } else if (maskShape === "angled_diagonal") {
    const skew = Math.min(60, width * 0.12);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;

    ctx.beginPath();
    ctx.moveTo(x, y + skew);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height - skew);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.clip();

    drawFocalImage(ctx, img, x, y, width, height, focalPoint.x, focalPoint.y);
    ctx.restore();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + skew);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height - skew);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.stroke();
  } else {
    // Default rounded card layer
    const radius = Math.min(28, width * 0.05);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 12;

    drawRoundRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = "#0F172A";
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundRect(ctx, x, y, width, height, radius);
    ctx.clip();
    drawFocalImage(ctx, img, x, y, width, height, focalPoint.x, focalPoint.y);
    ctx.restore();

    // Crisp dual outline
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    drawRoundRect(ctx, x, y, width, height, radius);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, x + 4, y + 4, width - 8, height - 8, Math.max(4, radius - 4));
    ctx.stroke();
  }

  ctx.restore();
}
