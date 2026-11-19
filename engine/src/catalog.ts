import type { CatalogEntry, VariantId } from "./types.js";

export const POLICY_VERSION = "experimental-v1";
export const CATALOG_VERSION = "v1";

function entry(id: VariantId, movement: string, floor: number, ceiling: number,
  options: Partial<CatalogEntry> = {}): CatalogEntry {
  return { id, movement, floor, ceiling, loadingMode: "bodyweight", convention: "total",
    perSide: false, priority: false, equipment: ["floor"], coarsePercent: 25,
    coarseLb: 5, rollingPercent: 30, rollingLb: 10, alternatives: [], harder: [], ...options };
}
const db = { loadingMode: "external" as const, convention: "per_hand" as const,
  equipment: ["dumbbells", "bench"], starterLb: 10, firstCeilingLb: 20, firstStepLb: 5 };
const small = { convention: "per_hand" as const, starterLb: 2.5, firstCeilingLb: 10,
  firstStepLb: 2.5, coarseLb: 2.5, rollingLb: 5, equipment: ["dumbbells", "floor"] };

export const CATALOG: Readonly<Record<VariantId, CatalogEntry>> = {
  db_flat_press: entry("db_flat_press", "horizontal_push", 8, 12, { ...db, alternatives: ["knee_pushup"] }),
  db_incline_press: entry("db_incline_press", "horizontal_push", 8, 12, { ...db, alternatives: ["db_flat_press"] }),
  db_supported_row: entry("db_supported_row", "horizontal_pull", 8, 12, db),
  db_rdl: entry("db_rdl", "hinge", 6, 10, { ...db, equipment: ["dumbbells", "floor"], firstCeilingLb: 30, priority: true, alternatives: ["glute_bridge"] }),
  goblet_squat: entry("goblet_squat", "squat", 6, 8, { ...db, convention: "total", equipment: ["dumbbells", "floor"], firstCeilingLb: 30, priority: true, alternatives: ["air_squat"], harder: ["back_squat"] }),
  back_squat: entry("back_squat", "squat", 6, 8, { loadingMode: "external", priority: true, equipment: ["barbell", "rack", "safeties"], starterLb: 20, firstCeilingLb: 40, firstStepLb: 5, coarsePercent: 15, coarseLb: 10, rollingPercent: 25, rollingLb: 20, alternatives: ["goblet_squat", "air_squat"] }),
  lat_pulldown: entry("lat_pulldown", "vertical_pull", 8, 12, { loadingMode: "external", convention: "machine", equipment: ["pulldown"], starterLb: 20, firstCeilingLb: 40, firstStepLb: 10, coarseLb: 10, rollingLb: 20, alternatives: ["db_supported_row"] }),
  db_lateral_raise: entry("db_lateral_raise", "shoulder", 10, 15, { ...small, loadingMode: "external" }),
  loaded_calf_raise: entry("loaded_calf_raise", "calf", 10, 15, { ...small, loadingMode: "added", alternatives: ["calf_raise"] }),
  loaded_split_squat: entry("loaded_split_squat", "squat", 6, 10, { ...small, loadingMode: "added", perSide: true, alternatives: ["split_squat"] }),
  air_squat: entry("air_squat", "squat", 8, 15, { harder: ["split_squat", "goblet_squat"] }),
  calf_raise: entry("calf_raise", "calf", 10, 15, { harder: ["single_leg_calf", "loaded_calf_raise"] }),
  split_squat: entry("split_squat", "squat", 6, 10, { perSide: true, alternatives: ["air_squat"], harder: ["loaded_split_squat"] }),
  glute_bridge: entry("glute_bridge", "hinge", 8, 15, { harder: ["single_leg_bridge"] }),
  dead_bug: entry("dead_bug", "trunk", 6, 10, { perSide: true }),
  wall_pushup: entry("wall_pushup", "horizontal_push", 6, 12, { equipment: ["wall"], harder: ["incline_pushup"] }),
  incline_pushup: entry("incline_pushup", "horizontal_push", 6, 12, { equipment: ["stable_surface"], alternatives: ["wall_pushup"], harder: ["floor_pushup"] }),
  knee_pushup: entry("knee_pushup", "horizontal_push", 6, 12, { alternatives: ["wall_pushup"], harder: ["floor_pushup"] }),
  floor_pushup: entry("floor_pushup", "horizontal_push", 6, 12, { alternatives: ["knee_pushup", "incline_pushup"] }),
  single_leg_bridge: entry("single_leg_bridge", "hinge", 8, 15, { perSide: true, alternatives: ["glute_bridge"] }),
  single_leg_calf: entry("single_leg_calf", "calf", 10, 15, { perSide: true, alternatives: ["calf_raise"], harder: ["loaded_calf_raise"] }),
};

for (const item of Object.values(CATALOG)) {
  Object.freeze(item.equipment); Object.freeze(item.alternatives); Object.freeze(item.harder); Object.freeze(item);
}
Object.freeze(CATALOG);
