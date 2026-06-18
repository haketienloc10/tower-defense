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
import { CHAPTER_1_LEVEL, ENEMY_DEFS, UNIT_DEFS, ITEM_DEFS, ITEM_RECIPES, TRAIT_DEFS } from "./data/gameData";
import {
  benchBoardUnit,
  boardUnitCap,
  buyExperience,
  buyShopUnit,
  createRunBoardActors,
  createRunState,
  expToNextLevel,
  getUnitDef,
  placeBenchUnit,
  refundForUnit,
  rerollShop,
  sellUnit,
  startCombat,
  stepRunCombat,
  craftItem,
  grantItem,
  equipItem,
  type RunState,
} from "./sim/run";
import { computeActiveSynergies } from "./sim/synergy";

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
const content = { units: UNIT_DEFS, enemies: ENEMY_DEFS, items: ITEM_DEFS, recipes: ITEM_RECIPES };
const run = createRunState(SEED, CHAPTER_1_LEVEL, content);
const state = {
  tick: 0,
  selected: null as GridCoord | null,
  selectedUnitId: null as string | null,
  message: "Buy a unit, select it, click a tile, then start combat.",
  sparkleTile: rng.int(GRID_WIDTH * GRID_HEIGHT),
};

const controls = document.createElement("section");
controls.className = "hud-controls";
root.append(controls);

ctx.canvas.addEventListener("click", (event) => {
  const rect = ctx.canvas.getBoundingClientRect();
  const point = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  const grid = screenToGrid(point, projection);
  state.selected = isInsideGrid(grid, GRID_WIDTH, GRID_HEIGHT) ? grid : null;
  if (state.selected && state.selectedUnitId) {
    const result = placeBenchUnit(run, state.selectedUnitId, state.selected);
    state.message = result.ok ? "Unit placed." : (result.error ?? "Action failed.");
    if (result.ok) state.selectedUnitId = null;
  } else if (state.selected) {
    const selectedTile = state.selected;
    const unit = run.board.find(
      (item) =>
        item.tile?.gx === selectedTile.gx && item.tile?.gy === selectedTile.gy,
    );
    state.selectedUnitId = unit?.id ?? null;
    state.message = unit ? "Board unit selected." : "Tile selected.";
  }
  renderControls(run);
});

const loop = new FixedStepLoop(
  (_dtMs, tick) => {
    state.tick = tick;
    stepRunCombat(run, _dtMs, content);
    if (tick % 90 === 0) {
      state.sparkleTile = rng.int(GRID_WIDTH * GRID_HEIGHT);
    }
  },
  () => {
    projection.originX = Math.floor(window.innerWidth / 2);
    renderControls(run);
    const combatWorld = run.combatWorld;
    renderBoard(ctx, projection, {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      selected: state.selected,
      markerTile: state.sparkleTile,
      tick: state.tick,
      seed: SEED,
      levelName: CHAPTER_1_LEVEL.name,
      actors: [
        ...createRunBoardActors(run, UNIT_DEFS),
        ...(combatWorld?.enemies ?? []).map((enemy) => ({
          id: enemy.id,
          team: enemy.team,
          unitId: enemy.defId,
          name: enemy.name,
          cost: 1 as const,
          traits: [],
          tile: enemy.tile,
          color: "#ff7d6e",
          hpRatio: enemy.hp / enemy.maxHp,
        })),
      ],
      combat: {
        waveIndex: run.waveIndex,
        aliveEnemies: combatWorld?.enemies.length ?? 0,
        defeatedEnemies: combatWorld?.defeatedEnemyCount ?? 0,
        leakedEnemies: combatWorld?.leakedEnemyCount ?? 0,
        waveEnded: combatWorld?.waveEnded ?? false,
      },
      run: {
        phase: run.phase,
        gold: run.gold,
        playerLevel: run.playerLevel,
        boardCount: run.board.length,
        boardCap: boardUnitCap(run),
      },
    });
  },
);

loop.start();

let lastControlsHtml = "";

function renderControls(runState: RunState): void {
  const selectedUnit = state.selectedUnitId
    ? [...runState.bench, ...runState.board].find(
        (unit) => unit.id === state.selectedUnitId,
      )
    : null;
    
  const activeSynergies = computeActiveSynergies(runState.board, UNIT_DEFS, TRAIT_DEFS);
  
  const html = `
    <div class="control-row stats">
      <span>Phase: ${runState.phase}</span>
      <span>Gold: ${runState.gold}</span>
      <span>HP: ${runState.homeHp}/${runState.homeHpMax}</span>
      <span>EXP: ${runState.exp}/${expToNextLevel(runState)}</span>
      <span>Cap: ${boardUnitCap(runState)}</span>
      <span>Wave: ${runState.waveIndex}/${runState.level.waves.length}</span>
      <span>Board: ${runState.board.length}/${boardUnitCap(runState)}</span>
      <span>Streak: W${runState.winStreak}/L${runState.lossStreak}</span>
      <span>Income: ${runState.lastIncome.total}g</span>
    </div>
    <div class="control-row synergies">
      <strong>Synergies:</strong> 
      ${activeSynergies.map(s => {
        const active = s.activeTier ? `(Active: ${s.activeTier.summary})` : "";
        const next = s.nextTier ? `(Next: ${s.nextTier.count})` : "(Max)";
        return `[${s.name} ${s.count} ${active} ${next}]`;
      }).join(" ")}
    </div>
    <div class="control-row shop">
      ${runState.shop
        .map((slot, index) => {
          if (!slot) return `<button disabled>Empty</button>`;
          const def = getUnitDef(UNIT_DEFS, slot.unitId);
          return `<button data-buy="${index}" ${runState.phase !== "setup" ? "disabled" : ""}>${def.name}<br><small>${slot.cost}g</small></button>`;
        })
        .join("")}
    </div>
    <div class="control-row bench">
      ${runState.bench
        .map((unit) => {
          const def = getUnitDef(UNIT_DEFS, unit.unitId);
          const selected = unit.id === state.selectedUnitId ? " selected" : "";
          return `<button class="${selected}" data-select="${unit.id}" ${runState.phase !== "setup" ? "disabled" : ""}>${def.name}<br><small>${unit.star}* bench</small></button>`;
        })
        .join("") || "<span class=\"muted\">Bench empty</span>"}
    </div>
    <div class="control-row board-list">
      ${runState.board
        .map((unit) => {
          const def = getUnitDef(UNIT_DEFS, unit.unitId);
          const selected = unit.id === state.selectedUnitId ? " selected" : "";
          const itemsText = unit.items.length > 0 ? ` [${unit.items.join(",")}]` : "";
          return `<button class="${selected}" data-select="${unit.id}" ${runState.phase !== "setup" ? "disabled" : ""}>${def.name}<br><small>${unit.star}* board</small>${itemsText}</button>`;
        })
        .join("") || "<span class=\"muted\">Board empty</span>"}
    </div>
    <div class="control-row items">
      <strong>Item Bag:</strong>
      ${runState.itemBag.length === 0 ? "Empty" : runState.itemBag.map((itemId, idx) => {
        const itemDef = ITEM_DEFS.find(i => i.id === itemId);
        return `<button data-equip="${itemId}" ${!selectedUnit || runState.phase !== "setup" ? "disabled" : ""} title="Click to equip to selected unit">${itemDef?.name}</button>`;
      }).join(" ")}
      <br>
      <button data-grant-item ${runState.phase !== "setup" ? "disabled" : ""}>+ Random Component</button>
      <button data-craft="rageblade" ${runState.phase !== "setup" ? "disabled" : ""}>Craft Rageblade</button>
      <button data-craft="thornmail" ${runState.phase !== "setup" ? "disabled" : ""}>Craft Thornmail</button>
      <button data-craft="seraphs" ${runState.phase !== "setup" ? "disabled" : ""}>Craft Seraphs</button>
    </div>
    <div class="control-row actions">
      <button data-start ${runState.phase !== "setup" || runState.board.length === 0 ? "disabled" : ""}>Start Combat</button>
      <button data-reroll ${runState.phase !== "setup" || runState.gold < 2 ? "disabled" : ""}>Reroll<br><small>2g</small></button>
      <button data-exp ${runState.phase !== "setup" || runState.gold < 4 || runState.playerLevel >= 9 ? "disabled" : ""}>Buy EXP<br><small>4g -> +4</small></button>
      <button data-bench ${!selectedUnit || !selectedUnit.tile || runState.phase !== "setup" ? "disabled" : ""}>Bench</button>
      <button data-sell ${!selectedUnit || runState.phase !== "setup" ? "disabled" : ""}>Sell${selectedUnit ? `<br><small>+${refundForUnit(getUnitDef(UNIT_DEFS, selectedUnit.unitId).cost, selectedUnit.star)}g</small>` : ""}</button>
      <span class="message">${state.message}</span>
    </div>
  `;

  if (lastControlsHtml === html) return;
  lastControlsHtml = html;
  controls.innerHTML = html;

  controls.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((button) => {
    button.onclick = () => {
      const result = buyShopUnit(runState, Number(button.dataset.buy));
      state.message = result.ok ? "Unit bought to bench." : (result.error ?? "Buy failed.");
      renderControls(runState);
    };
  });
  controls.querySelector<HTMLButtonElement>("[data-reroll]")?.addEventListener(
    "click",
    () => {
      const result = rerollShop(runState, UNIT_DEFS);
      state.message = result.ok ? "Shop rerolled." : (result.error ?? "Reroll failed.");
      renderControls(runState);
    },
  );
  controls.querySelector<HTMLButtonElement>("[data-exp]")?.addEventListener(
    "click",
    () => {
      const result = buyExperience(runState);
      state.message = result.ok ? "EXP bought." : (result.error ?? "EXP failed.");
      renderControls(runState);
    },
  );
  controls
    .querySelectorAll<HTMLButtonElement>("[data-select]")
    .forEach((button) => {
      button.onclick = () => {
        state.selectedUnitId = button.dataset.select ?? null;
        state.message = "Click a board tile to place selected unit.";
        renderControls(runState);
      };
    });
  controls.querySelector<HTMLButtonElement>("[data-start]")?.addEventListener(
    "click",
    () => {
      const result = startCombat(runState, content);
      state.message = result.ok ? "Combat started." : (result.error ?? "Start failed.");
      state.selectedUnitId = null;
      renderControls(runState);
    },
  );
  controls.querySelector<HTMLButtonElement>("[data-bench]")?.addEventListener(
    "click",
    () => {
      if (!state.selectedUnitId) return;
      const result = benchBoardUnit(runState, state.selectedUnitId);
      state.message = result.ok ? "Unit moved to bench." : (result.error ?? "Bench failed.");
      state.selectedUnitId = null;
      renderControls(runState);
    },
  );
  controls.querySelector<HTMLButtonElement>("[data-sell]")?.addEventListener(
    "click",
    () => {
      if (!state.selectedUnitId) return;
      const result = sellUnit(runState, state.selectedUnitId, UNIT_DEFS);
      state.message = result.ok ? "Unit sold." : (result.error ?? "Sell failed.");
      state.selectedUnitId = null;
      renderControls(runState);
    },
  );
  
  controls.querySelector<HTMLButtonElement>("[data-grant-item]")?.addEventListener("click", () => {
    const components = ITEM_DEFS.filter(i => i.tier === "component");
    const item = components[rng.int(components.length)];
    grantItem(runState, item.id);
    state.message = `Granted ${item.name}.`;
    renderControls(runState);
  });
  
  controls.querySelectorAll<HTMLButtonElement>("[data-craft]").forEach((button) => {
    button.onclick = () => {
      const recipeId = button.dataset.craft!;
      const result = craftItem(runState, recipeId, content);
      state.message = result.ok ? `Crafted ${recipeId}.` : (result.error ?? "Craft failed.");
      renderControls(runState);
    };
  });
  
  controls.querySelectorAll<HTMLButtonElement>("[data-equip]").forEach((button) => {
    button.onclick = () => {
      if (!state.selectedUnitId) return;
      const itemId = button.dataset.equip!;
      const result = equipItem(runState, state.selectedUnitId, itemId);
      state.message = result.ok ? `Equipped ${itemId}.` : (result.error ?? "Equip failed.");
      renderControls(runState);
    };
  });
}
