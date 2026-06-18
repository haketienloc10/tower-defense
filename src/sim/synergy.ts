/**
 * src/sim/synergy.ts
 *
 * Synergy computation: count distinct unit defIds per trait on the board,
 * find the highest active breakpoint, and expose the resolved BuffEffect.
 *
 * Pure function — no side effects, fully testable without game state.
 */

import type { BuffEffect, TraitDef, UnitDef } from "../data/types";
import type { UnitInstance } from "./run";

export interface ActiveSynergy {
  traitId: string;
  name: string;
  /** Number of distinct unit defIds on board carrying this trait */
  count: number;
  /** Highest breakpoint tier currently active (null if below min breakpoint) */
  activeTier: { count: number; summary: string; effect: BuffEffect } | null;
  /** Next breakpoint to reach (null if already at max) */
  nextTier: { count: number; summary: string } | null;
}

/**
 * Compute all active synergies for a given board state.
 *
 * Counting rule (spec §4): counts distinct `defId` (unit definition id) per trait,
 * NOT total unit count. Three Dagger instances on board still count as 1 Assassin.
 *
 * @param board - UnitInstance[] currently on the board (tile !== null)
 * @param unitDefs - full unit definition catalogue
 * @param traitDefs - full trait definition catalogue
 */
export function computeActiveSynergies(
  board: readonly UnitInstance[],
  unitDefs: readonly UnitDef[],
  traitDefs: readonly TraitDef[],
): ActiveSynergy[] {
  // Build a map: traitId → Set<defId>
  const traitDistinct = new Map<string, Set<string>>();
  for (const unit of board) {
    const def = unitDefs.find((d) => d.id === unit.unitId);
    if (!def) continue;
    for (const traitId of def.traits) {
      if (!traitDistinct.has(traitId)) traitDistinct.set(traitId, new Set());
      traitDistinct.get(traitId)!.add(unit.unitId);
    }
  }

  return traitDefs.map((trait): ActiveSynergy => {
    const distinctCount = traitDistinct.get(trait.id)?.size ?? 0;

    // Find highest active breakpoint
    const activeBreakpoints = trait.breakpoints.filter(
      (bp) => distinctCount >= bp.count,
    );
    const activeTier =
      activeBreakpoints.length > 0
        ? activeBreakpoints[activeBreakpoints.length - 1]
        : null;

    // Find next breakpoint
    const nextBreakpoints = trait.breakpoints.filter(
      (bp) => distinctCount < bp.count,
    );
    const nextTier = nextBreakpoints.length > 0 ? nextBreakpoints[0] : null;

    return {
      traitId: trait.id,
      name: trait.name,
      count: distinctCount,
      activeTier: activeTier as ActiveSynergy["activeTier"],
      nextTier,
    };
  });
}

/**
 * Merge all active synergy effects into a single aggregate BuffEffect
 * that can be applied to all-ally stats during combat setup.
 *
 * Note: Tech synergy (homeHeal, homeLaser) is a global home-base effect,
 * not per-unit — callers extract those fields separately.
 */
export function mergeAllyBuffs(synergies: ActiveSynergy[]): BuffEffect {
  const merged: BuffEffect = {};
  for (const syn of synergies) {
    if (!syn.activeTier) continue;
    const e = syn.activeTier.effect;
    if (e.hpPct !== undefined) merged.hpPct = (merged.hpPct ?? 0) + e.hpPct;
    if (e.armorFlat !== undefined) merged.armorFlat = (merged.armorFlat ?? 0) + e.armorFlat;
    if (e.dmgReductionPct !== undefined) merged.dmgReductionPct = (merged.dmgReductionPct ?? 0) + e.dmgReductionPct;
    if (e.homeHealRatePct !== undefined) merged.homeHealRatePct = e.homeHealRatePct; // last wins (highest tier replaces lower)
    if (e.homeLaserIntervalS !== undefined) merged.homeLaserIntervalS = e.homeLaserIntervalS;
    if (e.homeLaserDmg !== undefined) merged.homeLaserDmg = e.homeLaserDmg;
    if (e.homeLaserTargets !== undefined) merged.homeLaserTargets = e.homeLaserTargets;
  }
  return merged;
}

/**
 * Compute assassin-specific crit bonus (only applies to Assassin-role units).
 */
export function assassinCritBonus(synergies: ActiveSynergy[]): {
  critChancePct: number;
  critDmgBonusPct: number;
} {
  const syn = synergies.find((s) => s.traitId === "assassin");
  if (!syn?.activeTier) return { critChancePct: 0, critDmgBonusPct: 0 };
  return {
    critChancePct: syn.activeTier.effect.critChancePct ?? 0,
    critDmgBonusPct: syn.activeTier.effect.critDmgBonusPct ?? 0,
  };
}

/**
 * Compute frost on-hit freeze params (applies to all allies).
 */
export function frostFreezeParams(synergies: ActiveSynergy[]): {
  freezeChancePct: number;
  freezeDurationS: number;
  frozenDmgBonusPct: number;
} {
  const syn = synergies.find((s) => s.traitId === "frost");
  if (!syn?.activeTier) return { freezeChancePct: 0, freezeDurationS: 0, frozenDmgBonusPct: 0 };
  return {
    freezeChancePct: syn.activeTier.effect.freezeChancePct ?? 0,
    freezeDurationS: syn.activeTier.effect.freezeDurationS ?? 0,
    frozenDmgBonusPct: syn.activeTier.effect.frozenDmgBonusPct ?? 0,
  };
}
