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

import playbook from "./playbook.generated.json";
import type {
  Check,
  CheckBasis,
  CheckExecution,
  CheckPrerequisite,
  DiligenceTopic,
  EvaluationRule,
  FindingSeverity,
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

// ============================================================================
// Mappers (snake_case → camelCase, normalize block-scalar whitespace)
// ============================================================================

function trimMultiline(s: string): string {
  // Yaml block scalars (`|`) preserve newlines. For our display strings we
  // want a single clean line — collapse internal whitespace.
  return s.replace(/\s+/g, " ").trim();
}

function mapPrerequisite(raw: RawCheckPrerequisite): CheckPrerequisite {
  return {
    checkId: raw.check_id,
    requiredState: raw.required_state,
  };
}

function mapEvaluationRule(raw: RawEvaluationRule): EvaluationRule {
  return {
    clearCondition: trimMultiline(raw.clear_condition),
    findingCondition: trimMultiline(raw.finding_condition),
  };
}

/**
 * Flatten YAML step objects `[{ step_1: "Do X" }, { step_2: "Do Y" }]`
 * into a plain string array `["Do X", "Do Y"]` for token-efficient
 * prompt rendering.
 */
function flattenSteps(raw: RawExecutionStep[]): string[] {
  return raw.map((obj) => Object.values(obj)[0]);
}

function mapExecution(raw: RawExecution): CheckExecution {
  return {
    scope: raw.scope,
    targetList: raw.target_list,
    contextExports: raw.context_exports,
    steps: flattenSteps(raw.steps),
  };
}

function mapCheck(raw: RawCheck): Check {
  return {
    id: raw.id,
    label: raw.label,
    description: trimMultiline(raw.description),
    severity: raw.severity,
    dimension: raw.dimension as Check["dimension"],
    basis: raw.basis,
    jurisdictions: raw.jurisdictions,
    prerequisites: raw.prerequisites?.map(mapPrerequisite),
    recommendation: raw.recommendation
      ? trimMultiline(raw.recommendation)
      : undefined,
    evaluationRule: raw.evaluation_rule
      ? mapEvaluationRule(raw.evaluation_rule)
      : undefined,
    execution: raw.execution ? mapExecution(raw.execution) : undefined,
  };
}

function mapTopic(raw: RawTopic): DiligenceTopic {
  return {
    id: raw.id,
    name: raw.name,
    description: trimMultiline(raw.description),
    dimensions: raw.dimensions as DiligenceTopic["dimensions"],
    checkIds: raw.checks,
  };
}

// ============================================================================
// Exports
// ============================================================================

const data = playbook as unknown as RawPlaybook;

export const CHECKS: Check[] = data.checks.map(mapCheck);
export const DILIGENCE_TOPICS: DiligenceTopic[] =
  data.diligence_topics.map(mapTopic);
