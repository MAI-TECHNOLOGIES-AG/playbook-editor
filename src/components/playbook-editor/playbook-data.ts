import type {
  RawCheck,
  RawExecutionStep,
  RawPlaybook,
  RawTopic,
} from "@/playbook/playbook";
import type { Dimension } from "@/playbook/types";

export const LOCAL_STORAGE_KEY = "playbook-editor-state";

export const DIMENSIONS: Dimension[] = [
  "CORPORATE_GOVERNANCE",
  "OWNERSHIP",
  "HR",
  "INTELLECTUAL_PROPERTY",
  "COMMERCIAL_AGREEMENTS",
  "REAL_ESTATE_EQUIPMENT",
  "INSURANCE",
  "LITIGATION",
  "DEBT_FINANCE",
  "REGULATORY_COMPLIANCE",
];

export type PlaybookData = RawPlaybook;

/** Blank playbook — no bundled content; user imports YAML or builds from scratch. */
export function emptyPlaybook(): PlaybookData {
  return {
    diligence_topics: [],
    checks: [],
  };
}

export function isPlaybookData(value: unknown): value is PlaybookData {
  if (!value || typeof value !== "object") return false;
  const v = value as PlaybookData;
  return Array.isArray(v.diligence_topics) && Array.isArray(v.checks);
}

export function clonePlaybook(data: PlaybookData): PlaybookData {
  return structuredClone(data);
}

export function stepsToStrings(
  steps: RawExecutionStep[] | undefined,
): string[] {
  if (!steps?.length) return [""];
  return steps.map((obj) => {
    const vals = Object.values(obj);
    return vals[0] ?? "";
  });
}

export function stringsToSteps(lines: string[]): RawExecutionStep[] {
  return lines
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text, i) => ({ [`step_${i + 1}`]: text }));
}

export function emptyCheck(
  partial: Partial<RawCheck> & { id: string },
): RawCheck {
  return {
    id: partial.id,
    label: partial.label ?? "New check",
    description: partial.description ?? "",
    severity: partial.severity ?? "medium",
    dimension: partial.dimension ?? "CORPORATE_GOVERNANCE",
    basis: partial.basis ?? "statutory",
    jurisdictions: partial.jurisdictions ?? ["CH"],
    prerequisites: partial.prerequisites,
    recommendation: partial.recommendation,
    evaluation_rule: partial.evaluation_rule,
    execution: partial.execution,
  };
}

export function emptyTopic(
  partial: Partial<RawTopic> & { id: string; dimensions: string[] },
): RawTopic {
  return {
    id: partial.id,
    name: partial.name ?? "New diligence topic",
    description: partial.description ?? "",
    dimensions: partial.dimensions,
    checks: partial.checks ?? [],
  };
}

function slugifyToSegment(input: string, emptyFallback: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return s || emptyFallback;
}

/** Kebab-case id segment suitable for YAML topic `id`. */
export function slugifyTopicName(name: string): string {
  return slugifyToSegment(name, "topic");
}

/** Kebab-case id segment suitable for YAML check `id`. */
export function slugifyCheckLabel(label: string): string {
  return slugifyToSegment(label, "check");
}

/**
 * Unique topic id from display name. Reserves `currentTopicId` when resolving
 * collisions so renaming keeps a stable slot until the new slug is taken.
 */
export function uniqueTopicSlug(
  name: string,
  allTopics: RawTopic[],
  currentTopicId: string | undefined,
): string {
  const otherIds = new Set(
    allTopics.filter((t) => t.id !== currentTopicId).map((t) => t.id),
  );
  const base = slugifyTopicName(name);
  if (!otherIds.has(base)) return base;
  let n = 2;
  while (otherIds.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Unique check `id` from display label. Excludes `currentCheckId` when
 * resolving collisions (same pattern as `uniqueTopicSlug`).
 */
export function uniqueCheckSlug(
  label: string,
  allChecks: RawCheck[],
  currentCheckId: string | undefined,
): string {
  const otherIds = new Set(
    allChecks.filter((c) => c.id !== currentCheckId).map((c) => c.id),
  );
  const base = slugifyCheckLabel(label);
  if (!otherIds.has(base)) return base;
  let n = 2;
  while (otherIds.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function resolveTopicChecks(
  topic: RawTopic,
  checks: RawCheck[],
): RawCheck[] {
  const byId = new Map(checks.map((c) => [c.id, c]));
  return topic.checks
    .map((id) => byId.get(id))
    .filter((c): c is RawCheck => c !== undefined);
}
