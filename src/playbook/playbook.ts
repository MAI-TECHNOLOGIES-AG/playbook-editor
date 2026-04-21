/**
 * Playbook content — derived from playbook.yaml.
 *
 * The yaml file is the single source of truth. A small build script
 * (scripts/build-playbook.mjs) parses the yaml and writes
 * `playbook.generated.json`, which this module imports natively.
 *
 * The build script runs automatically via the `predev` and `prebuild`
 * hooks in package.json. To regenerate manually after editing the yaml
 * during a running dev server, run `pnpm --filter web build:playbook`
 * (the JSON edit then triggers HMR).
 *
 * Why a generated JSON file rather than importing yaml directly:
 *   - Turbopack (Next 16's default bundler) doesn't natively load yaml.
 *   - Loader workarounds (raw-loader, yaml-loader) hit pnpm symlink
 *     resolution issues with Turbopack-on-Node.
 *   - JSON imports work in both Turbopack and webpack with zero config.
 *
 * Consumers should use the helpers in ./queries.ts rather than importing
 * these constants directly.
 */

import type {
    CheckBasis,
    FindingSeverity
} from "./types";

// ============================================================================
// Raw shape (snake_case, mirrors the yaml authoring conventions)
// ============================================================================

export type RawCheckPrerequisite = {
  check_id: string;
  required_state: "finding" | "cleared";
};

export type RawEvaluationRule = {
  clear_condition: string;
  finding_condition: string;
};

export type RawExecutionStep = Record<string, string>; // { step_1: "..." }

export type RawExecution = {
  scope: "global" | "per_item";
  target_list?: string;
  context_exports?: string[];
  steps: RawExecutionStep[];
};

export type RawCheck = {
  id: string;
  label: string;
  description: string;
  severity: FindingSeverity;
  dimension: string;
  basis: CheckBasis;
  jurisdictions?: string[];
  prerequisites?: RawCheckPrerequisite[];
  recommendation?: string;
  evaluation_rule?: RawEvaluationRule;
  execution?: RawExecution;
};

export type RawTopic = {
  id: string;
  name: string;
  description: string;
  dimensions: string[];
  checks: string[];
};

export type RawPlaybook = {
  version?: string;
  diligence_topics: RawTopic[];
  checks: RawCheck[];
};
