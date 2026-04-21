import type {
  RawCheck,
  RawExecutionStep,
  RawPlaybook,
  RawTopic,
} from "@/playbook/playbook";
import type { Dimension } from "@/playbook/types";

export const LOCAL_STORAGE_KEY = "playbook-editor-state";

/** Full undo stack + present + redo stack */
export const LOCAL_STORAGE_HISTORY_KEY = "playbook-editor-history";

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
 * Prefix for check ids from the first jurisdiction code (comma-separated list),
 * lowercased with a trailing dash. Defaults to `"ch-"` when absent or empty
 * (jurisdiction `"CH"`).
 */
export function jurisdictionIdPrefix(jurisdictions: string[] | undefined): string {
  const raw = jurisdictions?.map((j) => j.trim()).find((j) => j.length > 0);
  const first = raw ?? "CH";
  const code = slugifyToSegment(first, "ch");
  return `${code}-`;
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
 * Unique check `id` from display label and jurisdiction-derived prefix.
 * Excludes `currentCheckId` when resolving collisions (same pattern as
 * `uniqueTopicSlug`). Uses the first jurisdiction, or `CH` → `ch-`, when
 * `jurisdictions` is missing or empty.
 */
export function uniqueCheckSlug(
  label: string,
  allChecks: RawCheck[],
  currentCheckId: string | undefined,
  jurisdictions?: string[],
): string {
  const otherIds = new Set(
    allChecks.filter((c) => c.id !== currentCheckId).map((c) => c.id),
  );
  const prefix = jurisdictionIdPrefix(jurisdictions);
  const slugPart = slugifyCheckLabel(label);
  const base = `${prefix}${slugPart}`;
  if (!otherIds.has(base)) return base;
  let n = 2;
  while (otherIds.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function uniqueSlugFromManualInput(
  raw: string,
  reservedIds: Set<string>,
  emptyFallback: string,
): string {
  const base = slugifyToSegment(raw.trim(), emptyFallback);
  if (!reservedIds.has(base)) return base;
  let n = 2;
  while (reservedIds.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Normalize and uniquify a topic id typed by the user (kebab-case). */
export function uniqueManualTopicId(
  raw: string,
  allTopics: RawTopic[],
  currentTopicId: string | undefined,
): string {
  const reserved = new Set(
    allTopics.filter((t) => t.id !== currentTopicId).map((t) => t.id),
  );
  return uniqueSlugFromManualInput(raw, reserved, "topic");
}

/** Normalize and uniquify a check id typed by the user (kebab-case). */
export function uniqueManualCheckId(
  raw: string,
  allChecks: RawCheck[],
  currentCheckId: string | undefined,
): string {
  const reserved = new Set(
    allChecks.filter((c) => c.id !== currentCheckId).map((c) => c.id),
  );
  return uniqueSlugFromManualInput(raw, reserved, "check");
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

function rewritePrereqsWithRemap(
  check: RawCheck,
  remap: Map<string, string>,
): void {
  if (!check.prerequisites?.length) return;
  for (const p of check.prerequisites) {
    let id = p.check_id;
    let next = remap.get(id);
    while (next !== undefined) {
      id = next;
      next = remap.get(id);
    }
    p.check_id = id;
  }
}

/**
 * Ensures each check id is listed by at most one diligence topic. Topics
 * processed earlier keep canonical ids; later topics get deep-cloned checks
 * with fresh ids. Prerequisites are rewritten using this topic's remap for
 * checks cloned here and for checks that belonged to only one topic in the
 * original data (safe in-place updates).
 */
export function ensureUniqueCheckOwnership(data: PlaybookData): PlaybookData {
  const initialRefCount = new Map<string, number>();
  for (const t of data.diligence_topics) {
    for (const id of t.checks) {
      initialRefCount.set(id, (initialRefCount.get(id) ?? 0) + 1);
    }
  }

  const globallyClaimed = new Set<string>();
  const nextChecks = [...data.checks];
  const findCheck = (id: string) => nextChecks.find((c) => c.id === id);

  const diligence_topics = data.diligence_topics.map((topic) => {
    const remap = new Map<string, string>();
    const nextTopicCheckIds: string[] = [];

    for (const checkId of topic.checks) {
      if (!globallyClaimed.has(checkId)) {
        globallyClaimed.add(checkId);
        nextTopicCheckIds.push(checkId);
        continue;
      }
      const orig = findCheck(checkId);
      if (!orig) {
        nextTopicCheckIds.push(checkId);
        continue;
      }
      const clone = structuredClone(orig) as RawCheck;
      clone.id = uniqueCheckSlug(
        clone.label,
        nextChecks,
        undefined,
        clone.jurisdictions,
      );
      nextChecks.push(clone);
      globallyClaimed.add(clone.id);
      remap.set(checkId, clone.id);
      nextTopicCheckIds.push(clone.id);
    }

    const clonedHere = new Set(remap.values());
    for (const cid of nextTopicCheckIds) {
      const ch = findCheck(cid);
      if (!ch) continue;
      const shouldRewrite =
        clonedHere.has(cid) || (initialRefCount.get(cid) ?? 0) === 1;
      if (shouldRewrite) rewritePrereqsWithRemap(ch, remap);
    }

    return { ...topic, checks: nextTopicCheckIds };
  });

  return { ...data, checks: nextChecks, diligence_topics };
}
