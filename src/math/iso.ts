export interface GridCoord {
  gx: number;
  gy: number;
}

export interface ScreenCoord {
  x: number;
  y: number;
}

export interface IsoProjection {
  tileWidth: number;
  tileHeight: number;
  originX: number;
  originY: number;
}

export const DEFAULT_ISO_PROJECTION: IsoProjection = {
  tileWidth: 64,
  tileHeight: 32,
  originX: 0,
  originY: 0,
};

export function gridToScreen(
  { gx, gy }: GridCoord,
  projection: IsoProjection,
): ScreenCoord {
  return {
    x: (gx - gy) * (projection.tileWidth / 2) + projection.originX,
    y: (gx + gy) * (projection.tileHeight / 2) + projection.originY,
  };
}

export function screenToGrid(
  { x, y }: ScreenCoord,
  projection: IsoProjection,
): GridCoord {
  const a = (x - projection.originX) / (projection.tileWidth / 2);
  const b = (y - projection.originY) / (projection.tileHeight / 2);
  return {
    gx: Math.round((a + b) / 2),
    gy: Math.round((b - a) / 2),
  };
}

export function isInsideGrid(
  { gx, gy }: GridCoord,
  width: number,
  height: number,
): boolean {
  return gx >= 0 && gy >= 0 && gx < width && gy < height;
}
