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
import {
  deriveCombatVisualEvents,
  type ActorVisualSnapshot,
  type VisualEvent,
} from "./render/visualEvents";
import {
  CHAPTER_1_LEVEL,
  ENEMY_DEFS,
  UNIT_DEFS,
  ITEM_DEFS,
  ITEM_RECIPES,
  TRAIT_DEFS,
} from "./data/gameData";
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
const characterConceptSheetUrl = new URL(
  "./assets/character-concepts.png",
  import.meta.url,
).href;

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
const content = {
  units: UNIT_DEFS,
  enemies: ENEMY_DEFS,
  items: ITEM_DEFS,
  recipes: ITEM_RECIPES,
};
const enemyDefsById = new Map(ENEMY_DEFS.map((enemy) => [enemy.id, enemy]));
const run = createRunState(SEED, CHAPTER_1_LEVEL, content);
const state = {
  tick: 0,
  selected: null as GridCoord | null,
  selectedUnitId: null as string | null,
  message: "Buy a unit, select it, click a tile, then start combat.",
  sparkleTile: rng.int(GRID_WIDTH * GRID_HEIGHT),
  visualEffects: [] as VisualEvent[],
  lastActorSnapshot: [] as ActorVisualSnapshot[],
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
    state.message = result.ok
      ? "Unit placed."
      : (result.error ?? "Action failed.");
    if (result.ok) {
      addVisualEffect("level-up", state.selected, "#ffe66d", 36);
      state.selectedUnitId = null;
    }
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
    const actors = [
      ...createRunBoardActors(run, UNIT_DEFS),
      ...(combatWorld?.enemies ?? []).map((enemy) => {
        const def = enemyDefsById.get(enemy.defId);
        if (!def) {
          throw new Error(`Missing enemy definition: ${enemy.defId}`);
        }
        return {
          id: enemy.id,
          team: enemy.team,
          unitId: enemy.defId,
          name: enemy.name,
          cost: 1 as const,
          role: "enemy" as const,
          traits: [],
          tile: enemy.tile,
          color: def.sprite.color,
          sprite: def.sprite,
          hpRatio: enemy.hp / enemy.maxHp,
          isMiniBoss: enemy.isMiniBoss,
          isBoss: enemy.isBoss,
        };
      }),
    ];
    const nextSnapshot = toActorSnapshot(actors);
    state.visualEffects.push(
      ...deriveCombatVisualEvents(
        state.lastActorSnapshot,
        nextSnapshot,
        state.tick,
      ),
    );
    state.lastActorSnapshot = nextSnapshot;
    state.visualEffects = state.visualEffects.filter(
      (effect) => state.tick - effect.createdTick <= effect.durationTicks,
    );
    renderBoard(ctx, projection, {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      selected: state.selected,
      markerTile: state.sparkleTile,
      tick: state.tick,
      seed: SEED,
      levelName: CHAPTER_1_LEVEL.name,
      home: CHAPTER_1_LEVEL.homePos,
      gates: CHAPTER_1_LEVEL.gates,
      actors,
      effects: state.visualEffects,
      combat: {
        waveIndex: run.waveIndex,
        aliveEnemies: combatWorld?.enemies.length ?? 0,
        defeatedEnemies: combatWorld?.defeatedEnemyCount ?? 0,
        leakedEnemies: combatWorld?.leakedEnemyCount ?? 0,
        waveEnded: combatWorld?.waveEnded ?? false,
        telegraphColumns:
          combatWorld?.bossTelegraphs.map((telegraph) => telegraph.columnGx) ??
          [],
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

  const activeSynergies = computeActiveSynergies(
    runState.board,
    UNIT_DEFS,
    TRAIT_DEFS,
  );
  const currentWave = runState.level.waves.find(
    (wave) => wave.index === runState.waveIndex,
  );
  const waveEnemyIds = currentWave?.spawns.map((spawn) => spawn.enemyId) ?? [];
  const bossNames = ENEMY_DEFS.filter(
    (enemy) =>
      waveEnemyIds.includes(enemy.id) && (enemy.isBoss || enemy.isMiniBoss),
  ).map((enemy) => `${enemy.isBoss ? "Boss" : "Mini-boss"}: ${enemy.name}`);
  const telegraphText = runState.combatWorld?.bossTelegraphs.length
    ? runState.combatWorld.bossTelegraphs
        .map(
          (telegraph) =>
            `Column ${telegraph.columnGx} in ${Math.ceil(telegraph.remainingMs)}ms`,
        )
        .join(", ")
    : "None";
  const finalText = runState.finalResult
    ? `${runState.finalResult.outcome.toUpperCase()} - ${runState.finalResult.stars} stars (${runState.finalResult.homeHpRemaining}/${runState.finalResult.homeHpMax} HP)`
    : "In progress";

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
      <span>${bossNames.join(" | ") || "Normal wave"}</span>
      <span>Telegraph: ${telegraphText}</span>
      <span>Result: ${finalText}</span>
    </div>
    <div class="control-row synergies">
      <strong>Synergies:</strong> 
      ${activeSynergies
        .map((s) => {
          const active = s.activeTier
            ? `(Active: ${s.activeTier.summary})`
            : "";
          const next = s.nextTier ? `(Next: ${s.nextTier.count})` : "(Max)";
          return `[${s.name} ${s.count} ${active} ${next}]`;
        })
        .join(" ")}
    </div>
    <div class="control-row visual-atlas">
      <img src="${characterConceptSheetUrl}" alt="Generated character concept sheet" />
      <span>Visual atlas: lính/quái có silhouette riêng, Canvas render dùng metadata cùng style.</span>
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
      ${
        runState.bench
          .map((unit) => {
            const def = getUnitDef(UNIT_DEFS, unit.unitId);
            const selected =
              unit.id === state.selectedUnitId ? " selected" : "";
            return `<button class="${selected}" data-select="${unit.id}" ${runState.phase !== "setup" ? "disabled" : ""}>${def.name}<br><small>${unit.star}* bench</small></button>`;
          })
          .join("") || '<span class="muted">Bench empty</span>'
      }
    </div>
    <div class="control-row board-list">
      ${
        runState.board
          .map((unit) => {
            const def = getUnitDef(UNIT_DEFS, unit.unitId);
            const selected =
              unit.id === state.selectedUnitId ? " selected" : "";
            const itemsText =
              unit.items.length > 0 ? ` [${unit.items.join(",")}]` : "";
            return `<button class="${selected}" data-select="${unit.id}" ${runState.phase !== "setup" ? "disabled" : ""}>${def.name}<br><small>${unit.star}* board</small>${itemsText}</button>`;
          })
          .join("") || '<span class="muted">Board empty</span>'
      }
    </div>
    <div class="control-row items">
      <strong>Item Bag:</strong>
      ${
        runState.itemBag.length === 0
          ? "Empty"
          : runState.itemBag
              .map((itemId, idx) => {
                const itemDef = ITEM_DEFS.find((i) => i.id === itemId);
                return `<button data-equip="${itemId}" ${!selectedUnit || runState.phase !== "setup" ? "disabled" : ""} title="Click to equip to selected unit">${itemDef?.name}</button>`;
              })
              .join(" ")
      }
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

  controls
    .querySelectorAll<HTMLButtonElement>("[data-buy]")
    .forEach((button) => {
      button.onclick = () => {
        const result = buyShopUnit(runState, Number(button.dataset.buy));
        state.message = result.ok
          ? "Unit bought to bench."
          : (result.error ?? "Buy failed.");
        if (result.ok) addHudPulse("#7eead7");
        renderControls(runState);
      };
    });
  controls
    .querySelector<HTMLButtonElement>("[data-reroll]")
    ?.addEventListener("click", () => {
      const result = rerollShop(runState, UNIT_DEFS);
      state.message = result.ok
        ? "Shop rerolled."
        : (result.error ?? "Reroll failed.");
      if (result.ok) addHudPulse("#c685ff");
      renderControls(runState);
    });
  controls
    .querySelector<HTMLButtonElement>("[data-exp]")
    ?.addEventListener("click", () => {
      const result = buyExperience(runState);
      state.message = result.ok
        ? "EXP bought."
        : (result.error ?? "EXP failed.");
      if (result.ok) addHudPulse("#ffe66d");
      renderControls(runState);
    });
  controls
    .querySelectorAll<HTMLButtonElement>("[data-select]")
    .forEach((button) => {
      button.onclick = () => {
        state.selectedUnitId = button.dataset.select ?? null;
        state.message = "Click a board tile to place selected unit.";
        renderControls(runState);
      };
    });
  controls
    .querySelector<HTMLButtonElement>("[data-start]")
    ?.addEventListener("click", () => {
      const result = startCombat(runState, content);
      state.message = result.ok
        ? "Combat started."
        : (result.error ?? "Start failed.");
      state.selectedUnitId = null;
      if (result.ok) {
        for (const unit of runState.board) {
          if (unit.tile) addVisualEffect("skill", unit.tile, "#7eead7", 42);
        }
      }
      renderControls(runState);
    });
  controls
    .querySelector<HTMLButtonElement>("[data-bench]")
    ?.addEventListener("click", () => {
      if (!state.selectedUnitId) return;
      const result = benchBoardUnit(runState, state.selectedUnitId);
      state.message = result.ok
        ? "Unit moved to bench."
        : (result.error ?? "Bench failed.");
      if (result.ok) addHudPulse("#8cefff");
      state.selectedUnitId = null;
      renderControls(runState);
    });
  controls
    .querySelector<HTMLButtonElement>("[data-sell]")
    ?.addEventListener("click", () => {
      if (!state.selectedUnitId) return;
      const result = sellUnit(runState, state.selectedUnitId, UNIT_DEFS);
      state.message = result.ok
        ? "Unit sold."
        : (result.error ?? "Sell failed.");
      if (result.ok) addHudPulse("#ff9c66");
      state.selectedUnitId = null;
      renderControls(runState);
    });

  controls
    .querySelector<HTMLButtonElement>("[data-grant-item]")
    ?.addEventListener("click", () => {
      const components = ITEM_DEFS.filter((i) => i.tier === "component");
      const item = components[rng.int(components.length)];
      grantItem(runState, item.id);
      state.message = `Granted ${item.name}.`;
      addHudPulse("#ffd166");
      renderControls(runState);
    });

  controls
    .querySelectorAll<HTMLButtonElement>("[data-craft]")
    .forEach((button) => {
      button.onclick = () => {
        const recipeId = button.dataset.craft!;
        const result = craftItem(runState, recipeId, content);
        state.message = result.ok
          ? `Crafted ${recipeId}.`
          : (result.error ?? "Craft failed.");
        if (result.ok) addHudPulse("#ffbf69");
        renderControls(runState);
      };
    });

  controls
    .querySelectorAll<HTMLButtonElement>("[data-equip]")
    .forEach((button) => {
      button.onclick = () => {
        if (!state.selectedUnitId) return;
        const itemId = button.dataset.equip!;
        const result = equipItem(runState, state.selectedUnitId, itemId);
        state.message = result.ok
          ? `Equipped ${itemId}.`
          : (result.error ?? "Equip failed.");
        if (result.ok) {
          const unit = [...runState.board, ...runState.bench].find(
            (item) => item.id === state.selectedUnitId,
          );
          if (unit?.tile) addVisualEffect("skill", unit.tile, "#ffd166", 32);
        }
        renderControls(runState);
      };
    });
}

function toActorSnapshot(
  actors: readonly {
    id: string;
    team: "ally" | "enemy";
    tile: GridCoord;
    hpRatio?: number;
  }[],
): ActorVisualSnapshot[] {
  return actors.map((actor) => ({
    id: actor.id,
    team: actor.team,
    tile: actor.tile,
    hpRatio: actor.hpRatio,
  }));
}

function addVisualEffect(
  kind: VisualEvent["kind"],
  tile: GridCoord,
  color: string,
  durationTicks: number,
): void {
  state.visualEffects.push({
    id: `${kind}-${state.tick}-${tile.gx}-${tile.gy}-${state.visualEffects.length}`,
    kind,
    tile,
    team: "neutral",
    createdTick: state.tick,
    durationTicks,
    color,
  });
}

function addHudPulse(color: string): void {
  addVisualEffect(
    "level-up",
    state.selected ?? CHAPTER_1_LEVEL.homePos,
    color,
    24,
  );
}
