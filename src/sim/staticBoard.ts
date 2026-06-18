import type { GridCoord } from "../math/iso";
import type { UnitDef, UnitCost, TraitId } from "../data/types";

export interface BoardActor {
  id: string;
  unitId: string;
  name: string;
  cost: UnitCost;
  traits: readonly TraitId[];
  tile: GridCoord;
  color: string;
}

const PREVIEW_SLOTS: readonly { unitId: string; tile: GridCoord }[] = [
  { unitId: "iron-guard", tile: { gx: 3, gy: 3 } },
  { unitId: "trainee-archer", tile: { gx: 5, gy: 4 } },
  { unitId: "fire-mage", tile: { gx: 4, gy: 5 } },
];

export function createStaticBoardActors(
  unitDefs: readonly UnitDef[],
): BoardActor[] {
  return PREVIEW_SLOTS.map(({ unitId, tile }) => {
    const def = unitDefs.find((unit) => unit.id === unitId);
    if (!def) {
      throw new Error(`Missing unit definition: ${unitId}`);
    }

    return {
      id: `preview-${def.id}`,
      unitId: def.id,
      name: def.name,
      cost: def.cost,
      traits: def.traits,
      tile,
      color: def.sprite.color,
    };
  });
}
