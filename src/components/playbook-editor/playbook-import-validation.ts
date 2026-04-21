import { DIMENSIONS } from "@/components/playbook-editor/playbook-data";
import type { Dimension, FindingSeverity } from "@/playbook/types";

const DIMENSION_SET = new Set<string>(DIMENSIONS);

const SEVERITIES: readonly FindingSeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
];

/** `contractual` appears in historical YAML fixtures; runtime treats like `commercial`. */
const VALID_BASIS = new Set<string>(["statutory", "commercial", "contractual"]);

const PREREQ_STATES = new Set(["finding", "cleared"]);

const EXEC_SCOPES = new Set(["global", "per_item"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function rootMustBeObjectGot(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Strict validation for YAML file import. Collects every issue with stable
 * path prefixes (e.g. `checks[0].severity`). Does not short-circuit on first error.
 *
 * For loose in-memory guards (localStorage), use `isPlaybookData` instead.
 */
export function validatePlaybookForImport(value: unknown): string[] {
  const issues: string[] = [];

  if (!isPlainObject(value)) {
    issues.push(
      `Root: must be a plain object (YAML mapping at document root); got ${rootMustBeObjectGot(value)}.`,
    );
    return issues;
  }

  const root = value;

  if (!("diligence_topics" in root)) {
    issues.push(
      "Root.diligence_topics: required key is missing (expected top-level `diligence_topics:` array).",
    );
  } else if (!Array.isArray(root.diligence_topics)) {
    issues.push(
      "Root.diligence_topics: must be an array (got wrong type at document root).",
    );
  }

  if (!("checks" in root)) {
    issues.push(
      "Root.checks: required key is missing (expected top-level `checks:` array).",
    );
  } else if (!Array.isArray(root.checks)) {
    issues.push(
      "Root.checks: must be an array (got wrong type at document root).",
    );
  }

  if ("version" in root && root.version !== undefined) {
    const ver = root.version;
    if (typeof ver !== "string" && typeof ver !== "number") {
      issues.push(
        "Root.version: must be a string or number when set (wrong type at document root).",
      );
    }
  }

  const topicsOk =
    Array.isArray(root.diligence_topics) && Array.isArray(root.checks);
  if (!topicsOk) {
    return issues;
  }

  const diligence_topics = root.diligence_topics as unknown[];
  const checks = root.checks as unknown[];

  const checkIds: string[] = [];

  for (let i = 0; i < checks.length; i++) {
    const path = `Root.checks[${i}]`;
    const item = checks[i];
    if (!isPlainObject(item)) {
      issues.push(`${path}: must be an object.`);
      continue;
    }

    if (!("id" in item) || !isNonEmptyString(item.id)) {
      issues.push(`${path}.id: must be a non-empty string.`);
    } else {
      checkIds.push(item.id);
    }

    for (const key of ["label", "description"] as const) {
      if (!(key in item)) {
        issues.push(`${path}.${key}: required field missing.`);
      } else if (!isString(item[key])) {
        issues.push(`${path}.${key}: must be a string.`);
      }
    }

    if (!("severity" in item)) {
      issues.push(`${path}.severity: required field missing.`);
    } else if (
      !isString(item.severity) ||
      !(SEVERITIES as readonly string[]).includes(item.severity)
    ) {
      issues.push(
        `${path}.severity: must be one of: ${SEVERITIES.join(", ")}.`,
      );
    }

    if (!("dimension" in item)) {
      issues.push(`${path}.dimension: required field missing.`);
    } else if (!isString(item.dimension)) {
      issues.push(`${path}.dimension: must be a string.`);
    } else if (!DIMENSION_SET.has(item.dimension as Dimension)) {
      issues.push(
        `${path}.dimension: unknown dimension "${item.dimension}". Expected one of: ${DIMENSIONS.join(", ")}.`,
      );
    }

    if (!("basis" in item)) {
      issues.push(`${path}.basis: required field missing.`);
    } else if (!isString(item.basis) || !VALID_BASIS.has(item.basis)) {
      issues.push(
        `${path}.basis: must be one of: statutory, commercial (contractual accepted for legacy YAML).`,
      );
    }

    if ("jurisdictions" in item && item.jurisdictions !== undefined) {
      if (!Array.isArray(item.jurisdictions)) {
        issues.push(`${path}.jurisdictions: must be an array of strings.`);
      } else {
        item.jurisdictions.forEach((j, ji) => {
          if (!isString(j)) {
            issues.push(`${path}.jurisdictions[${ji}]: must be a string.`);
          }
        });
      }
    }

    if ("prerequisites" in item && item.prerequisites !== undefined) {
      if (!Array.isArray(item.prerequisites)) {
        issues.push(`${path}.prerequisites: must be an array.`);
      } else {
        item.prerequisites.forEach((p, pi) => {
          const pp = `${path}.prerequisites[${pi}]`;
          if (!isPlainObject(p)) {
            issues.push(`${pp}: must be an object.`);
            return;
          }
          if (!("check_id" in p) || !isNonEmptyString(p.check_id)) {
            issues.push(`${pp}.check_id: must be a non-empty string.`);
          }
          if (!("required_state" in p)) {
            issues.push(`${pp}.required_state: required field missing.`);
          } else if (
            !isNonEmptyString(p.required_state) ||
            !PREREQ_STATES.has(p.required_state)
          ) {
            issues.push(
              `${pp}.required_state: must be "finding" or "cleared".`,
            );
          }
        });
      }
    }

    if ("recommendation" in item && item.recommendation !== undefined) {
      if (!isString(item.recommendation)) {
        issues.push(`${path}.recommendation: must be a string.`);
      }
    }

    if ("evaluation_rule" in item && item.evaluation_rule !== undefined) {
      const er = item.evaluation_rule;
      if (!isPlainObject(er)) {
        issues.push(`${path}.evaluation_rule: must be an object.`);
      } else {
        if (!("clear_condition" in er) || !isString(er.clear_condition)) {
          issues.push(
            `${path}.evaluation_rule.clear_condition: must be a string.`,
          );
        }
        if (!("finding_condition" in er) || !isString(er.finding_condition)) {
          issues.push(
            `${path}.evaluation_rule.finding_condition: must be a string.`,
          );
        }
      }
    }

    if ("execution" in item && item.execution !== undefined) {
      const ex = item.execution;
      const exPath = `${path}.execution`;
      if (!isPlainObject(ex)) {
        issues.push(`${exPath}: must be an object.`);
      } else {
        if (!("scope" in ex)) {
          issues.push(`${exPath}.scope: required field missing.`);
        } else if (!isNonEmptyString(ex.scope) || !EXEC_SCOPES.has(ex.scope)) {
          issues.push(`${exPath}.scope: must be "global" or "per_item".`);
        }
        if ("target_list" in ex && ex.target_list !== undefined) {
          if (!isNonEmptyString(ex.target_list)) {
            issues.push(`${exPath}.target_list: must be a string.`);
          }
        }
        if ("context_exports" in ex && ex.context_exports !== undefined) {
          if (!Array.isArray(ex.context_exports)) {
            issues.push(
              `${exPath}.context_exports: must be an array of strings.`,
            );
          } else {
            ex.context_exports.forEach((c, ci) => {
              if (!isNonEmptyString(c)) {
                issues.push(
                  `${exPath}.context_exports[${ci}]: must be a string.`,
                );
              }
            });
          }
        }
        if (!("steps" in ex)) {
          issues.push(`${exPath}.steps: required field missing.`);
        } else if (!Array.isArray(ex.steps)) {
          issues.push(`${exPath}.steps: must be an array.`);
        } else {
          ex.steps.forEach((step, si) => {
            const sp = `${exPath}.steps[${si}]`;
            if (!isPlainObject(step)) {
              issues.push(`${sp}: must be an object with string step values.`);
            } else {
              const entries = Object.entries(step);
              if (entries.length === 0) {
                issues.push(`${sp}: must have at least one step key.`);
              }
              for (const [k, v] of entries) {
                if (!isString(v)) {
                  issues.push(`${sp}.${k}: step value must be a string.`);
                }
              }
            }
          });
        }
      }
    }

    const allowedCheckKeys = new Set([
      "id",
      "label",
      "description",
      "severity",
      "dimension",
      "basis",
      "jurisdictions",
      "prerequisites",
      "recommendation",
      "evaluation_rule",
      "execution",
    ]);
    for (const key of Object.keys(item)) {
      if (!allowedCheckKeys.has(key)) {
        issues.push(`${path}: unknown key \`${key}\`.`);
      }
    }
  }

  const idToIndices = new Map<string, number[]>();
  for (let i = 0; i < checkIds.length; i++) {
    const id = checkIds[i];
    if (!id) continue;
    const list = idToIndices.get(id) ?? [];
    list.push(i);
    idToIndices.set(id, list);
  }
  for (const [id, indices] of idToIndices) {
    if (indices.length > 1) {
      issues.push(
        `Root.checks: duplicate id "${id}" at ${indices.map((i) => `Root.checks[${i}]`).join(", ")}.`,
      );
    }
  }

  const checkIdSet = new Set(checkIds);

  for (let i = 0; i < diligence_topics.length; i++) {
    const path = `Root.diligence_topics[${i}]`;
    const topic = diligence_topics[i];
    if (!isPlainObject(topic)) {
      issues.push(`${path}: must be an object.`);
      continue;
    }

    if (!("id" in topic)) {
      issues.push(`${path}.id: required field missing.`);
    } else if (!isNonEmptyString(topic.id)) {
      issues.push(`${path}.id: must be a non-empty string.`);
    }
    for (const key of ["name", "description"] as const) {
      if (!(key in topic)) {
        issues.push(`${path}.${key}: required field missing.`);
      } else if (!isString(topic[key])) {
        issues.push(`${path}.${key}: must be a string.`);
      }
    }

    if (!("dimensions" in topic)) {
      issues.push(`${path}.dimensions: required field missing.`);
    } else if (!Array.isArray(topic.dimensions)) {
      issues.push(`${path}.dimensions: must be an array.`);
    } else {
      topic.dimensions.forEach((d, di) => {
        if (!isString(d)) {
          issues.push(`${path}.dimensions[${di}]: must be a string.`);
        } else if (!DIMENSION_SET.has(d as Dimension)) {
          issues.push(
            `${path}.dimensions[${di}]: unknown dimension "${d}". Expected one of: ${DIMENSIONS.join(", ")}.`,
          );
        }
      });
    }

    if (!("checks" in topic)) {
      issues.push(`${path}.checks: required field missing.`);
    } else if (!Array.isArray(topic.checks)) {
      issues.push(`${path}.checks: must be an array of check id strings.`);
    } else {
      topic.checks.forEach((ref, ri) => {
        const rp = `${path}.checks[${ri}]`;
        if (!isNonEmptyString(ref)) {
          issues.push(`${rp}: must be a string (check id).`);
        } else if (!checkIdSet.has(ref)) {
          issues.push(
            `${rp}: references unknown check id "${ref}" (no matching Root.checks[].id).`,
          );
        }
      });
    }

    const allowedTopicKeys = new Set([
      "id",
      "name",
      "description",
      "dimensions",
      "checks",
    ]);
    for (const key of Object.keys(topic)) {
      if (!allowedTopicKeys.has(key)) {
        issues.push(`${path}: unknown key \`${key}\`.`);
      }
    }
  }

  const allowedRootKeys = new Set(["version", "diligence_topics", "checks"]);
  for (const key of Object.keys(root)) {
    if (!allowedRootKeys.has(key)) {
      issues.push(
        `Root.${key}: unknown key (allowed at document root: version, diligence_topics, checks).`,
      );
    }
  }

  for (let i = 0; i < checks.length; i++) {
    const item = checks[i];
    if (!isPlainObject(item) || !isNonEmptyString(item.id)) continue;
    const path = `Root.checks[${i}]`;
    const prereqs = item.prerequisites;
    if (!Array.isArray(prereqs)) continue;
    prereqs.forEach((p, pi) => {
      if (!isPlainObject(p) || !isNonEmptyString(p.check_id)) return;
      if (!checkIdSet.has(p.check_id)) {
        issues.push(
          `${path}.prerequisites[${pi}].check_id: unknown check id "${p.check_id}" (no matching Root.checks[].id).`,
        );
      }
    });
  }

  return issues;
}
