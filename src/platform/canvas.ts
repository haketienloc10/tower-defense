export function createCanvasApp(root: HTMLElement): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 640;
  canvas.setAttribute("aria-label", "Auto-battler Tower Defense board");

  root.replaceChildren(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is not available");
  }

  resizeCanvas(canvas);
  window.addEventListener("resize", () => resizeCanvas(canvas));
  return ctx;
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const width = Math.max(640, window.innerWidth);
  const height = Math.max(480, window.innerHeight);
  const scale = window.devicePixelRatio || 1;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  const ctx = canvas.getContext("2d");
  ctx?.setTransform(scale, 0, 0, scale, 0, 0);
}
