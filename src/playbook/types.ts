/**
 * Playbook types — blueprints for diligence work.
 *
 * Hierarchy:  DiligenceTopic  >  Check (blueprint)  >  Result (runtime)
 *
 * A Playbook defines DiligenceTopics: cohesive groupings of Checks that
 * a lawyer applies to a deal. A Check is the playbook blueprint — the
 * instruction for what to look for. When executed against a document,
 * a Check produces a Result (see models/Result/types.ts).
 */

export type Dimension =
  | "CORPORATE_GOVERNANCE"
  | "OWNERSHIP"
  | "HR"
  | "INTELLECTUAL_PROPERTY"
  | "COMMERCIAL_AGREEMENTS"
  | "REAL_ESTATE_EQUIPMENT"
  | "INSURANCE"
  | "LITIGATION"
  | "DEBT_FINANCE"
  | "REGULATORY_COMPLIANCE";

export type FindingSeverity = "low" | "medium" | "high" | "critical";

export type CheckBasis = "statutory" | "commercial";

/**
 * Execution DAG constraint — a Check may only run if a parent Check
 * has produced a specific outcome state.
 */
export type CheckPrerequisite = {
  checkId: string;
  /** The parent check must have produced this outcome for this check to run. */
  requiredState: "finding" | "cleared";
};

/**
 * EvaluationRule — the semantic truth for deciding finding vs. cleared.
 *
 * The agent MUST use this as the sole decision criterion, never inventing
 * its own legal reasoning.
 */
export type EvaluationRule = {
  clearCondition: string;
  findingCondition: string;
};

/**
 * CheckExecution — the deterministic state-machine instructions for a check.
 *
 * `scope: 'global'` — execute steps once, call register_result once.
 * `scope: 'per_item'` — loop over `targetList`, call register_result per item.
 */
export type CheckExecution = {
  scope: "global" | "per_item";
  /** State variable name containing the array of IDs to iterate (per_item only). */
  targetList?: string;
  /** State variable names the agent must persist for downstream checks. */
  contextExports?: string[];
  /** Flattened step instructions (human-readable strings, NOT raw objects). */
  steps: string[];
};

/**
 * Check — playbook blueprint describing a single diligence evaluation.
 *
 * Checks are static catalog entries. They don't carry runtime state;
 * running a Check against documents produces Result records.
 */
export type Check = {
  id: string;
  label: string;
  description: string;
  severity: FindingSeverity;
  dimension: Dimension;
  basis: CheckBasis;
  /** ISO country codes; required when basis === 'statutory'. */
  jurisdictions?: string[];
  /** Execution DAG — this check only runs when all prerequisites are met. */
  prerequisites?: CheckPrerequisite[];
  /** Default recommendation text applied to findings produced by this check. */
  recommendation?: string;
  /** The semantic truth for finding vs. cleared decisions. */
  evaluationRule?: EvaluationRule;
  /** Deterministic execution instructions (scope, steps, context exports). */
  execution?: CheckExecution;
};

/**
 * DiligenceTopic — a coherent investigation area that groups Checks.
 *
 * A topic can span multiple dimensions (e.g. a "Change of Control" topic
 * might pull in HR, CORPORATE_GOVERNANCE, and COMMERCIAL_AGREEMENTS checks).
 * Checks may be referenced by multiple topics (many-to-many).
 */
export type DiligenceTopic = {
  id: string;
  name: string;
  description: string;
  dimensions: Dimension[];
  /** Ids of Checks owned by this topic. */
  checkIds: string[];
};
