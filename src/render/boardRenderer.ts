import { gridToScreen, type GridCoord, type IsoProjection } from "../math/iso";
import type { BoardActor } from "../sim/staticBoard";
import type { VisualEvent } from "./visualEvents";

export interface BoardRenderState {
  width: number;
  height: number;
  selected: GridCoord | null;
  markerTile: number;
  tick: number;
  seed: number;
  levelName: string;
  home: GridCoord;
  gates: readonly GridCoord[];
  actors: readonly BoardActor[];
  effects?: readonly VisualEvent[];
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

const TILE_FILL = "#294334";
const TILE_ALT_FILL = "#31523c";
const TILE_STROKE = "#75d18b";
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
        state,
        state.selected,
        markerCoord,
        state.combat.telegraphColumns ?? [],
      );
    }
  }

  for (const actor of sortBoardActorsByDepth(state.actors)) {
    drawActor(ctx, projection, actor, state.tick);
  }

  for (const effect of state.effects ?? []) {
    drawEffect(ctx, projection, effect, state.tick);
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
  const gradient = ctx.createRadialGradient(
    ctx.canvas.width * 0.5,
    ctx.canvas.height * 0.35,
    80,
    ctx.canvas.width * 0.5,
    ctx.canvas.height * 0.35,
    Math.max(ctx.canvas.width, ctx.canvas.height),
  );
  gradient.addColorStop(0, "#203944");
  gradient.addColorStop(0.58, "#10212c");
  gradient.addColorStop(1, "#081018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#8cefff";
  for (let i = 0; i < 24; i += 1) {
    const x = (i * 137) % ctx.canvas.width;
    const y = 40 + ((i * 83) % Math.max(1, ctx.canvas.height - 80));
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  projection: IsoProjection,
  coord: GridCoord,
  state: BoardRenderState,
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
  const isHome = state.home.gx === coord.gx && state.home.gy === coord.gy;
  const isGate = state.gates.some(
    (gate) => gate.gx === coord.gx && gate.gy === coord.gy,
  );

  ctx.beginPath();
  ctx.moveTo(center.x, center.y - halfH);
  ctx.lineTo(center.x + halfW, center.y);
  ctx.lineTo(center.x, center.y + halfH);
  ctx.lineTo(center.x - halfW, center.y);
  ctx.closePath();
  const tileGradient = ctx.createLinearGradient(
    center.x,
    center.y - halfH,
    center.x,
    center.y + halfH,
  );
  const baseFill =
    (coord.gx * 7 + coord.gy * 11 + state.seed) % 5 === 0
      ? "#3a6143"
      : (coord.gx + coord.gy) % 2 === 0
        ? TILE_FILL
        : TILE_ALT_FILL;
  tileGradient.addColorStop(
    0,
    isSelected
      ? TILE_SELECTED
      : isTelegraphed
        ? "#ff8b42"
        : isHome
          ? "#5fe0ff"
          : isGate
            ? "#ff72a8"
            : isMarker
              ? "#a985ff"
              : baseFill,
  );
  tileGradient.addColorStop(1, isTelegraphed ? "#5b1e1e" : "#142c2c");
  ctx.fillStyle = tileGradient;
  ctx.strokeStyle = isSelected
    ? "#fff4c2"
    : isTelegraphed
      ? "#ffe66d"
      : isHome || isGate
        ? "#ffffff"
        : TILE_STROKE;
  ctx.lineWidth = isSelected || isHome || isGate ? 2 : 1;
  ctx.fill();
  ctx.stroke();

  if (isHome || isGate) {
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.fillStyle = isHome ? "#d9fbff" : "#ffd3e3";
    ctx.strokeStyle = "#111820";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (isHome) {
      ctx.moveTo(0, -20);
      ctx.lineTo(18, -6);
      ctx.lineTo(12, 14);
      ctx.lineTo(-12, 14);
      ctx.lineTo(-18, -6);
    } else {
      ctx.moveTo(0, -16);
      ctx.lineTo(14, 12);
      ctx.lineTo(-14, 12);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  projection: IsoProjection,
  actor: BoardActor,
  tick: number,
): void {
  const foot = gridToScreen(actor.tile, projection);
  const y = foot.y + projection.tileHeight / 2;
  const pulse = Math.sin((tick + actor.id.length * 13) / 12) * 2;
  const scale = actor.isBoss ? 1.45 : actor.isMiniBoss ? 1.25 : 1;

  ctx.save();
  ctx.translate(foot.x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  drawGlow(ctx, actor.sprite.glowColor, -28 + pulse, actor.isBoss ? 28 : 18);
  drawActorShape(ctx, actor);

  if (actor.hpRatio !== undefined) {
    drawHealthBar(ctx, actor);
  }

  drawStarBadge(ctx, actor);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 4;
  ctx.fillText(
    actor.name.split(" ")[0] ?? actor.name,
    0,
    actor.team === "enemy" ? -48 : -58,
  );
  ctx.restore();
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  color: string,
  y: number,
  radius: number,
): void {
  const glow = ctx.createRadialGradient(0, y, 2, 0, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawActorShape(
  ctx: CanvasRenderingContext2D,
  actor: BoardActor,
): void {
  ctx.fillStyle = actor.sprite.color;
  ctx.strokeStyle = "#071016";
  ctx.lineWidth = 3;
  switch (actor.sprite.shape) {
    case "archer":
      drawHumanoid(ctx, actor, -46, 13);
      strokeLine(ctx, -22, -36, -28, -8, actor.sprite.accentColor, 4);
      strokeLine(ctx, 10, -32, 30, -42, actor.sprite.projectileColor, 3);
      break;
    case "assassin":
      drawHumanoid(ctx, actor, -44, 12);
      strokeLine(ctx, -20, -24, -34, -9, actor.sprite.accentColor, 4);
      strokeLine(ctx, 18, -24, 34, -12, actor.sprite.accentColor, 4);
      break;
    case "mage":
      drawRobe(ctx, actor);
      drawOrb(ctx, 17, -40, actor.sprite.projectileColor);
      break;
    case "gunner":
      drawHumanoid(ctx, actor, -44, 14);
      strokeLine(ctx, 8, -29, 34, -29, actor.sprite.projectileColor, 6);
      break;
    case "general":
      drawHumanoid(ctx, actor, -50, 17);
      drawCrown(ctx, actor.sprite.accentColor);
      break;
    case "knight":
    case "guard":
      drawHumanoid(ctx, actor, -48, 15);
      drawShield(ctx, -19, -27, actor.sprite.accentColor);
      break;
    case "slime":
      drawSlime(ctx, actor, 17, false);
      break;
    case "slime-king":
      drawSlime(ctx, actor, 28, true);
      break;
    case "runner":
      drawMonster(ctx, actor, 14, 22);
      strokeLine(ctx, -12, -12, -24, 0, actor.sprite.accentColor, 4);
      break;
    case "brute":
      drawMonster(ctx, actor, 23, 30);
      break;
    case "shield":
      drawMonster(ctx, actor, 18, 26);
      drawShield(ctx, 18, -22, actor.sprite.accentColor);
      break;
    case "bat":
      drawBat(ctx, actor);
      break;
    case "bomb":
      drawMonster(ctx, actor, 15, 21);
      drawOrb(ctx, 15, -15, actor.sprite.accentColor);
      break;
    case "dragon":
      drawDragon(ctx, actor);
      break;
    default:
      drawHumanoid(ctx, actor, -44, 13);
      break;
  }
}

function drawHumanoid(
  ctx: CanvasRenderingContext2D,
  actor: BoardActor,
  top: number,
  halfWidth: number,
): void {
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(halfWidth + 7, -28);
  ctx.lineTo(halfWidth, -8);
  ctx.lineTo(-halfWidth, -8);
  ctx.lineTo(-halfWidth - 7, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = actor.sprite.accentColor;
  ctx.beginPath();
  ctx.arc(0, top - 5, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawRobe(ctx: CanvasRenderingContext2D, actor: BoardActor): void {
  ctx.beginPath();
  ctx.moveTo(0, -56);
  ctx.quadraticCurveTo(26, -36, 16, -8);
  ctx.lineTo(-16, -8);
  ctx.quadraticCurveTo(-26, -36, 0, -56);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawOrb(ctx, 0, -52, actor.sprite.accentColor);
}

function drawMonster(
  ctx: CanvasRenderingContext2D,
  actor: BoardActor,
  halfWidth: number,
  height: number,
): void {
  ctx.beginPath();
  ctx.ellipse(0, -height, halfWidth, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawEyes(ctx, actor.sprite.accentColor, -height - 3);
}

function drawSlime(
  ctx: CanvasRenderingContext2D,
  actor: BoardActor,
  size: number,
  crown: boolean,
): void {
  ctx.beginPath();
  ctx.ellipse(0, -size, size, size * 0.85, 0, Math.PI, 0);
  ctx.lineTo(size, -8);
  ctx.quadraticCurveTo(0, 2, -size, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawEyes(ctx, actor.sprite.accentColor, -size);
  if (crown) drawCrown(ctx, actor.sprite.accentColor);
}

function drawBat(ctx: CanvasRenderingContext2D, actor: BoardActor): void {
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(-34, -46);
  ctx.lineTo(-22, -27);
  ctx.lineTo(-38, -20);
  ctx.lineTo(-10, -18);
  ctx.lineTo(0, -8);
  ctx.lineTo(10, -18);
  ctx.lineTo(38, -20);
  ctx.lineTo(22, -27);
  ctx.lineTo(34, -46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawEyes(ctx, actor.sprite.accentColor, -32);
}

function drawDragon(ctx: CanvasRenderingContext2D, actor: BoardActor): void {
  ctx.beginPath();
  ctx.moveTo(-34, -12);
  ctx.lineTo(-20, -48);
  ctx.lineTo(0, -34);
  ctx.lineTo(20, -52);
  ctx.lineTo(36, -12);
  ctx.lineTo(16, -22);
  ctx.lineTo(0, -4);
  ctx.lineTo(-16, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawEyes(ctx, actor.sprite.accentColor, -30);
  strokeLine(ctx, 18, -31, 43, -34, actor.sprite.projectileColor, 5);
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  color: string,
  y: number,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(-7, y, 4, 4);
  ctx.fillRect(4, y, 4, 4);
}

function drawShield(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 13);
  ctx.lineTo(x + 11, y - 6);
  ctx.lineTo(x + 8, y + 12);
  ctx.lineTo(x, y + 18);
  ctx.lineTo(x - 8, y + 12);
  ctx.lineTo(x - 11, y - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawCrown(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-12, -58);
  ctx.lineTo(-5, -70);
  ctx.lineTo(0, -58);
  ctx.lineTo(8, -70);
  ctx.lineTo(14, -58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawHealthBar(ctx: CanvasRenderingContext2D, actor: BoardActor): void {
  const y = actor.team === "enemy" ? -58 : -66;
  ctx.fillStyle = "#071016";
  roundRect(ctx, -22, y, 44, 6, 3);
  ctx.fill();
  ctx.fillStyle = actor.team === "enemy" ? "#ff5f6d" : "#59f59c";
  roundRect(
    ctx,
    -22,
    y,
    44 * Math.max(0, Math.min(1, actor.hpRatio ?? 1)),
    6,
    3,
  );
  ctx.fill();
}

function drawStarBadge(ctx: CanvasRenderingContext2D, actor: BoardActor): void {
  if (!actor.star || actor.team !== "ally") return;
  ctx.fillStyle = "#111820";
  roundRect(ctx, 13, -53, 20, 14, 7);
  ctx.fill();
  ctx.fillStyle = "#ffe66d";
  ctx.font = "bold 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${actor.star}*`, 23, -43);
}

function drawEffect(
  ctx: CanvasRenderingContext2D,
  projection: IsoProjection,
  effect: VisualEvent,
  tick: number,
): void {
  const age = tick - effect.createdTick;
  if (age < 0 || age > effect.durationTicks) return;
  const t = age / effect.durationTicks;
  const center = gridToScreen(effect.tile, projection);
  const x = center.x;
  const y = center.y + projection.tileHeight / 2;
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = effect.color;
  ctx.fillStyle = effect.color;
  ctx.lineCap = "round";
  if (effect.kind === "attack" && effect.fromTile) {
    const from = gridToScreen(effect.fromTile, projection);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x, y - 26);
    ctx.stroke();
    drawSpark(ctx, x, y - 30, 10 + t * 12);
  } else if (effect.kind === "damage") {
    ctx.font = "bold 15px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 5;
    ctx.fillText(`-${effect.amount ?? 0}`, x, y - 52 - t * 28);
    drawSpark(ctx, x, y - 30, 8 + t * 16);
  } else if (effect.kind === "death") {
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * t * 30,
        y - 24 + Math.sin(angle) * t * 18,
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (effect.kind === "skill" || effect.kind === "level-up") {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 26, 10 + t * 34, 0, Math.PI * 2);
    ctx.stroke();
    drawSpark(ctx, x, y - 26, 18 + t * 24);
  }
  ctx.restore();
}

function drawSpark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.stroke();
}

function drawHud(ctx: CanvasRenderingContext2D, state: BoardRenderState): void {
  ctx.fillStyle = "rgba(8, 12, 16, 0.72)";
  roundRect(ctx, 16, 16, 430, 226, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(126, 234, 215, 0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
