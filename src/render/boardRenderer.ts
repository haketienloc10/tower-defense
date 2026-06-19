import { gridToScreen, type GridCoord, type IsoProjection } from "../math/iso";
import type { BoardActor } from "../sim/staticBoard";

export interface BoardRenderState {
  width: number;
  height: number;
  selected: GridCoord | null;
  markerTile: number;
  tick: number;
  seed: number;
  levelName: string;
  actors: readonly BoardActor[];
  combat: {
    waveIndex: number;
    aliveEnemies: number;
    defeatedEnemies: number;
    leakedEnemies: number;
    waveEnded: boolean;
    telegraphColumns?: readonly number[];
  };
  run?: {
    phase: string;
    gold: number;
    playerLevel: number;
    boardCount: number;
    boardCap: number;
  };
}

const TILE_FILL = "#253241";
const TILE_ALT_FILL = "#2f4553";
const TILE_STROKE = "#7ad7c7";
const TILE_SELECTED = "#f8d66d";

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  projection: IsoProjection,
  state: BoardRenderState,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawBackground(ctx);
  const markerCoord = {
    gx: state.markerTile % state.width,
    gy: Math.floor(state.markerTile / state.width),
  };

  for (let depth = 0; depth <= state.width + state.height - 2; depth += 1) {
    for (let gx = 0; gx < state.width; gx += 1) {
      const gy = depth - gx;
      if (gy < 0 || gy >= state.height) continue;
      drawTile(
        ctx,
        projection,
        { gx, gy },
        state.selected,
        markerCoord,
        state.combat.telegraphColumns ?? [],
      );
    }
  }

  for (const actor of sortBoardActorsByDepth(state.actors)) {
    drawActor(ctx, projection, actor);
  }

  drawHud(ctx, state);
}

export function sortBoardActorsByDepth(
  actors: readonly BoardActor[],
): BoardActor[] {
  return [...actors].sort((a, b) => {
    const depthA = a.tile.gx + a.tile.gy;
    const depthB = b.tile.gx + b.tile.gy;
    if (depthA !== depthB) return depthA - depthB;
    return a.id.localeCompare(b.id);
  });
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    ctx.canvas.width,
    ctx.canvas.height,
  );
  gradient.addColorStop(0, "#101820");
  gradient.addColorStop(1, "#1d2a2d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  projection: IsoProjection,
  coord: GridCoord,
  selected: GridCoord | null,
  marker: GridCoord,
  telegraphColumns: readonly number[],
): void {
  const center = gridToScreen(coord, projection);
  const halfW = projection.tileWidth / 2;
  const halfH = projection.tileHeight / 2;
  const isSelected = selected?.gx === coord.gx && selected.gy === coord.gy;
  const isMarker = marker.gx === coord.gx && marker.gy === coord.gy;
  const isTelegraphed = telegraphColumns.includes(coord.gx);

  ctx.beginPath();
  ctx.moveTo(center.x, center.y - halfH);
  ctx.lineTo(center.x + halfW, center.y);
  ctx.lineTo(center.x, center.y + halfH);
  ctx.lineTo(center.x - halfW, center.y);
  ctx.closePath();
  ctx.fillStyle = isSelected
    ? TILE_SELECTED
    : isTelegraphed
      ? "#ff6b35"
      : isMarker
        ? "#c685ff"
        : (coord.gx + coord.gy) % 2 === 0
          ? TILE_FILL
          : TILE_ALT_FILL;
  ctx.strokeStyle = isSelected ? "#fff4c2" : TILE_STROKE;
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.fill();
  ctx.stroke();
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  projection: IsoProjection,
  actor: BoardActor,
): void {
  const foot = gridToScreen(actor.tile, projection);
  const y = foot.y + projection.tileHeight / 2;

  ctx.save();
  ctx.translate(foot.x, y);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = actor.color;
  ctx.strokeStyle = "#111820";
  ctx.lineWidth = 2;
  if (actor.team === "enemy") {
    ctx.beginPath();
    ctx.arc(0, -22, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(18, -32);
    ctx.lineTo(14, -8);
    ctx.lineTo(-14, -8);
    ctx.lineTo(-18, -32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (actor.hpRatio !== undefined) {
    ctx.fillStyle = "#111820";
    ctx.fillRect(-18, -48, 36, 5);
    ctx.fillStyle = actor.team === "enemy" ? "#ff6b6b" : "#7adf8f";
    ctx.fillRect(-18, -48, 36 * actor.hpRatio, 5);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText(actor.team === "enemy" ? "!" : String(actor.cost), 0, -25);
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, state: BoardRenderState): void {
  ctx.fillStyle = "rgba(8, 12, 16, 0.72)";
  ctx.fillRect(16, 16, 400, 216);
  ctx.fillStyle = "#eff8f5";
  ctx.font = "14px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`seed: ${state.seed}`, 32, 42);
  ctx.fillText(`tick: ${state.tick}`, 32, 66);
  const selected = state.selected
    ? `(${state.selected.gx}, ${state.selected.gy})`
    : "none";
  ctx.fillText(`selected: ${selected}`, 32, 90);
  ctx.fillText(`level: ${state.levelName}`, 32, 114);
  const allyCount = state.actors.filter(
    (actor) => actor.team === "ally",
  ).length;
  ctx.fillText(`M1 data/render: ${allyCount} units`, 32, 134);
  ctx.fillText(`wave: ${state.combat.waveIndex}`, 32, 158);
  ctx.fillText(
    `M2 combat: alive ${state.combat.aliveEnemies} / defeated ${state.combat.defeatedEnemies}`,
    32,
    178,
  );
  ctx.fillText(
    `leaked: ${state.combat.leakedEnemies} / ended: ${state.combat.waveEnded}`,
    32,
    198,
  );
  if (state.run) {
    ctx.fillText(
      `M3 ${state.run.phase}: gold ${state.run.gold} / level ${state.run.playerLevel}`,
      32,
      218,
    );
    ctx.fillText(
      `board: ${state.run.boardCount}/${state.run.boardCap}`,
      32,
      238,
    );
  }
}
