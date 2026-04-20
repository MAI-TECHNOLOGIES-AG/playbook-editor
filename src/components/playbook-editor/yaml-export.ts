import { Scalar, stringify } from "yaml";
import type { PlaybookData } from "@/components/playbook-editor/playbook-data";
import type {
  RawCheck,
  RawEvaluationRule,
  RawExecution,
  RawExecutionStep,
  RawTopic,
} from "@/playbook/playbook";

function plainScalar(value: string): Scalar<string> {
  const s = new Scalar(value);
  s.type = Scalar.PLAIN;
  return s;
}

function doubleQuotedScalar(value: string): Scalar<string> {
  const s = new Scalar(value);
  s.type = Scalar.QUOTE_DOUBLE;
  return s;
}

function blockLiteralScalar(value: string): Scalar<string> {
  const s = new Scalar(value);
  s.type = Scalar.BLOCK_LITERAL;
  return s;
}

function blockFoldedScalar(value: string): Scalar<string> {
  const s = new Scalar(value);
  s.type = Scalar.BLOCK_FOLDED;
  return s;
}

function mapEvaluationRule(rule: RawEvaluationRule): {
  clear_condition: Scalar<string>;
  finding_condition: Scalar<string>;
} {
  return {
    clear_condition: blockFoldedScalar(rule.clear_condition),
    finding_condition: blockFoldedScalar(rule.finding_condition),
  };
}

function mapExecutionStep(
  step: RawExecutionStep,
): Record<string, Scalar<string>> {
  const entries = Object.entries(step);
  const [key, value] = entries[0] ?? ["step_1", ""];
  return { [key]: doubleQuotedScalar(value) };
}

function mapExecution(ex: RawExecution): Record<string, unknown> {
  const out: Record<string, unknown> = {
    scope: plainScalar(ex.scope),
  };
  if (ex.target_list !== undefined && ex.target_list !== "") {
    out.target_list = plainScalar(ex.target_list);
  }
  if (ex.context_exports?.length) {
    out.context_exports = ex.context_exports.map(plainScalar);
  }
  out.steps = ex.steps.map(mapExecutionStep);
  return out;
}

function mapTopic(topic: RawTopic): Record<string, unknown> {
  return {
    id: plainScalar(topic.id),
    name: plainScalar(topic.name),
    description: blockLiteralScalar(topic.description),
    dimensions: topic.dimensions.map(plainScalar),
    checks: topic.checks.map(plainScalar),
  };
}

function mapCheck(check: RawCheck): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: plainScalar(check.id),
    label: plainScalar(check.label),
    description: blockLiteralScalar(check.description),
    severity: plainScalar(check.severity),
    dimension: plainScalar(check.dimension),
    basis: plainScalar(check.basis),
  };
  if (check.jurisdictions?.length) {
    out.jurisdictions = check.jurisdictions.map(plainScalar);
  }
  if (check.prerequisites?.length) {
    out.prerequisites = check.prerequisites.map((p) => ({
      check_id: plainScalar(p.check_id),
      required_state: plainScalar(p.required_state),
    }));
  }
  if (check.recommendation !== undefined) {
    out.recommendation = blockLiteralScalar(check.recommendation);
  }
  if (check.evaluation_rule) {
    out.evaluation_rule = mapEvaluationRule(check.evaluation_rule);
  }
  if (check.execution) {
    out.execution = mapExecution(check.execution);
  }
  return out;
}

/** YAML matching canonical playbook scalar styles (no comment preservation). */
export function stringifyPlaybookData(data: PlaybookData): string {
  const root: Record<string, unknown> = {
    diligence_topics: data.diligence_topics.map(mapTopic),
    checks: data.checks.map(mapCheck),
  };
  if (data.version !== undefined && data.version !== "") {
    const ordered: Record<string, unknown> = {
      version: doubleQuotedScalar(data.version),
    };
    for (const [k, v] of Object.entries(root)) {
      ordered[k] = v;
    }
    return stringify(ordered, {
      indent: 2,
      lineWidth: 0,
    });
  }
  return stringify(root, {
    indent: 2,
    lineWidth: 0,
  });
}
