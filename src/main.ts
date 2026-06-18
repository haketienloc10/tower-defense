import "./style.css";
import { FixedStepLoop } from "./core/loop";
import { Rng } from "./core/rng";
import {
  screenToGrid,
  isInsideGrid,
  type GridCoord,
  type IsoProjection,
} from "./math/iso";
import { createCanvasApp } from "./platform/canvas";
import { renderBoard } from "./render/boardRenderer";
import { CHAPTER_1_LEVEL, UNIT_DEFS } from "./data/gameData";
import { createStaticBoardActors } from "./sim/staticBoard";

const SEED = 17321;
const GRID_WIDTH = CHAPTER_1_LEVEL.gridSize.w;
const GRID_HEIGHT = CHAPTER_1_LEVEL.gridSize.h;

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("Missing #app root");
}

const ctx = createCanvasApp(root);
const projection: IsoProjection = {
  tileWidth: 64,
  tileHeight: 32,
  originX: Math.floor(window.innerWidth / 2),
  originY: 120,
};

const rng = new Rng(SEED);
const state = {
  tick: 0,
  selected: null as GridCoord | null,
  sparkleTile: rng.int(GRID_WIDTH * GRID_HEIGHT),
  actors: createStaticBoardActors(UNIT_DEFS),
};

ctx.canvas.addEventListener("click", (event) => {
  const rect = ctx.canvas.getBoundingClientRect();
  const point = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  const grid = screenToGrid(point, projection);
  state.selected = isInsideGrid(grid, GRID_WIDTH, GRID_HEIGHT) ? grid : null;
});

const loop = new FixedStepLoop(
  (_dtMs, tick) => {
    state.tick = tick;
    if (tick % 90 === 0) {
      state.sparkleTile = rng.int(GRID_WIDTH * GRID_HEIGHT);
    }
  },
  () => {
    projection.originX = Math.floor(window.innerWidth / 2);
    renderBoard(ctx, projection, {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      selected: state.selected,
      markerTile: state.sparkleTile,
      tick: state.tick,
      seed: SEED,
      levelName: CHAPTER_1_LEVEL.name,
      actors: state.actors,
    });
  },
);

loop.start();
