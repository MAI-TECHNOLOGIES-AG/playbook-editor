/**
 * Resolves extra display context for playbook import issues that reference a
 * check id that does not exist in `Root.checks`.
 */

const TOPIC_UNKNOWN_CHECK_RE =
  /^Root\.diligence_topics\[(\d+)\]\.checks\[\d+\]: references unknown check id "([^"]+)" /;

const CHECK_PREREQ_UNKNOWN_CHECK_RE =
  /^Root\.checks\[(\d+)\]\.prerequisites\[\d+\]\.check_id: unknown check id "([^"]+)" /;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readStringField(obj: unknown, key: string): string | undefined {
  if (!isPlainObject(obj)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

export type UnknownCheckRefContext = {
  missingCheckId: string;
  /** Parent diligence topic when the bad reference is in `diligence_topics[i].checks[j]`. */
  diligenceTopic?: {
    id: string;
    name: string;
    description: string;
  };
  /** Owning check when the bad reference is in `checks[i].prerequisites[j].check_id`. */
  referencingCheck?: {
    id: string;
    label: string;
    description: string;
  };
};

/**
 * When `issue` is an unknown check-id reference, returns structured context from
 * `document` (the parsed YAML root). Otherwise returns `null`.
 */
export function getUnknownCheckReferenceContext(
  issue: string,
  document: unknown,
): UnknownCheckRefContext | null {
  const topicMatch = issue.match(TOPIC_UNKNOWN_CHECK_RE);
  if (topicMatch) {
    const topicIndex = Number(topicMatch[1]);
    const missingCheckId = topicMatch[2];
    if (!isPlainObject(document)) {
      return { missingCheckId };
    }
    const topics = document.diligence_topics;
    if (
      !Array.isArray(topics) ||
      topicIndex < 0 ||
      topicIndex >= topics.length
    ) {
      return { missingCheckId };
    }
    const topic = topics[topicIndex];
    const id = readStringField(topic, "id") ?? "—";
    const name = readStringField(topic, "name") ?? "—";
    const description = readStringField(topic, "description") ?? "—";
    return {
      missingCheckId,
      diligenceTopic: { id, name, description },
    };
  }

  const prereqMatch = issue.match(CHECK_PREREQ_UNKNOWN_CHECK_RE);
  if (prereqMatch) {
    const checkIndex = Number(prereqMatch[1]);
    const missingCheckId = prereqMatch[2];
    if (!isPlainObject(document)) {
      return { missingCheckId };
    }
    const checks = document.checks;
    if (
      !Array.isArray(checks) ||
      checkIndex < 0 ||
      checkIndex >= checks.length
    ) {
      return { missingCheckId };
    }
    const check = checks[checkIndex];
    const id = readStringField(check, "id") ?? "—";
    const label = readStringField(check, "label") ?? "—";
    const description = readStringField(check, "description") ?? "—";
    return {
      missingCheckId,
      referencingCheck: { id, label, description },
    };
  }

  return null;
}

export function formatUnknownCheckContextForClipboard(
  ctx: UnknownCheckRefContext,
): string {
  const lines: string[] = [`Missing check id: ${ctx.missingCheckId}`];
  if (ctx.diligenceTopic) {
    lines.push(
      "",
      "Diligence topic (where the reference appears):",
      `  ID: ${ctx.diligenceTopic.id}`,
      `  Label: ${ctx.diligenceTopic.name}`,
      `  Description: ${ctx.diligenceTopic.description}`,
    );
  }
  if (ctx.referencingCheck) {
    lines.push(
      "",
      "Check that lists this prerequisite:",
      `  ID: ${ctx.referencingCheck.id}`,
      `  Label: ${ctx.referencingCheck.label}`,
      `  Description: ${ctx.referencingCheck.description}`,
    );
  }
  return lines.join("\n");
}
