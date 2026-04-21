import { describe, expect, it } from "vitest";
import {
  formatUnknownCheckContextForClipboard,
  getUnknownCheckReferenceContext,
} from "@/components/playbook-editor/playbook-import-issue-context";

describe("getUnknownCheckReferenceContext", () => {
  it("resolves diligence topic when topic references unknown check id", () => {
    const document = {
      diligence_topics: [
        {
          id: "topic-a",
          name: "Topic A",
          description: "Desc A",
          dimensions: ["legal"],
          checks: ["missing-one"],
        },
      ],
      checks: [],
    };
    const issue =
      'Root.diligence_topics[0].checks[0]: references unknown check id "missing-one" (no matching Root.checks[].id).';
    const ctx = getUnknownCheckReferenceContext(issue, document);
    expect(ctx).toEqual({
      missingCheckId: "missing-one",
      diligenceTopic: {
        id: "topic-a",
        name: "Topic A",
        description: "Desc A",
      },
    });
  });

  it("resolves referencing check for unknown prerequisite check id", () => {
    const document = {
      diligence_topics: [],
      checks: [
        {
          id: "c1",
          label: "Check one",
          description: "D1",
          prerequisites: [{ check_id: "ghost", required_state: "finding" }],
        },
      ],
    };
    const issue =
      'Root.checks[0].prerequisites[0].check_id: unknown check id "ghost" (no matching Root.checks[].id).';
    const ctx = getUnknownCheckReferenceContext(issue, document);
    expect(ctx).toEqual({
      missingCheckId: "ghost",
      referencingCheck: {
        id: "c1",
        label: "Check one",
        description: "D1",
      },
    });
  });

  it("returns null for unrelated issues", () => {
    expect(
      getUnknownCheckReferenceContext(
        "Root.checks[0].label: required field missing.",
        { checks: [{}] },
      ),
    ).toBeNull();
  });
});

describe("formatUnknownCheckContextForClipboard", () => {
  it("includes topic and missing id", () => {
    const text = formatUnknownCheckContextForClipboard({
      missingCheckId: "x",
      diligenceTopic: {
        id: "t",
        name: "N",
        description: "D",
      },
    });
    expect(text).toContain("Missing check id: x");
    expect(text).toContain("Diligence topic");
    expect(text).toContain("ID: t");
    expect(text).toContain("Label: N");
    expect(text).toContain("Description: D");
  });
});
