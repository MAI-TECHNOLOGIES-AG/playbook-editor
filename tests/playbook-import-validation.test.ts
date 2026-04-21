import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { describe, it } from "vitest";
import { validatePlaybookForImport } from "@/components/playbook-editor/playbook-import-validation";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(rootDir, "fixtures");

function loadFixture(name: string): unknown {
  const p = path.join(fixturesDir, name);
  return yaml.load(readFileSync(p, "utf8"));
}

describe("validatePlaybookForImport", () => {
  it("returns multiple distinct root issues when both arrays are wrong", () => {
    const issues = validatePlaybookForImport({
      diligence_topics: "nope",
      checks: 1,
    });
    assert.ok(issues.some((m) => m.includes("Root.diligence_topics")));
    assert.ok(issues.some((m) => m.includes("Root.checks")));
  });

  it("rejects non-object root", () => {
    const issues = validatePlaybookForImport(null);
    assert.equal(issues.length, 1);
    assert.ok(issues[0]?.includes("Root:") && issues[0]?.includes("got null"));
  });

  it("uses Root.checks path when top-level checks is missing", () => {
    const issues = validatePlaybookForImport({ diligence_topics: [] });
    assert.ok(
      issues.some(
        (m) =>
          m.startsWith("Root.checks:") && m.includes("required key is missing"),
      ),
    );
  });

  it("rejects invalid severity", () => {
    const issues = validatePlaybookForImport({
      diligence_topics: [],
      checks: [
        {
          id: "x",
          label: "L",
          description: "d",
          severity: "mega",
          dimension: "CORPORATE_GOVERNANCE",
          basis: "statutory",
        },
      ],
    });
    assert.ok(issues.some((m) => m.includes("Root.checks[0].severity")));
  });

  it("rejects unknown check id referenced from topic", () => {
    const issues = validatePlaybookForImport({
      diligence_topics: [
        {
          id: "t1",
          name: "T",
          description: "",
          dimensions: ["CORPORATE_GOVERNANCE"],
          checks: ["missing-id"],
        },
      ],
      checks: [],
    });
    assert.ok(
      issues.some(
        (m) =>
          m.includes("Root.diligence_topics[0].checks[0]") &&
          m.includes('unknown check id "missing-id"'),
      ),
    );
  });

  it("rejects duplicate check ids", () => {
    const issues = validatePlaybookForImport({
      diligence_topics: [],
      checks: [
        {
          id: "dup",
          label: "A",
          description: "",
          severity: "low",
          dimension: "CORPORATE_GOVERNANCE",
          basis: "statutory",
        },
        {
          id: "dup",
          label: "B",
          description: "",
          severity: "low",
          dimension: "CORPORATE_GOVERNANCE",
          basis: "statutory",
        },
      ],
    });
    assert.ok(issues.some((m) => m.includes("Root.checks: duplicate id")));
  });

  it("rejects prerequisite referencing unknown check", () => {
    const issues = validatePlaybookForImport({
      diligence_topics: [],
      checks: [
        {
          id: "a",
          label: "A",
          description: "",
          severity: "low",
          dimension: "CORPORATE_GOVERNANCE",
          basis: "statutory",
          prerequisites: [{ check_id: "nope", required_state: "finding" }],
        },
      ],
    });
    assert.ok(
      issues.some(
        (m) =>
          m.includes("Root.checks[0].prerequisites[0].check_id") &&
          m.includes("nope"),
      ),
    );
  });

  for (const file of [
    "playbook.yaml",
    "minimal.yaml",
    "no-version.yaml",
    "multi-dimension.yaml",
    "all-optional-fields.yaml",
    "execution-variants.yaml",
    "prerequisite-chain.yaml",
  ]) {
    it(`accepts fixture ${file}`, () => {
      const loaded = loadFixture(file);
      const issues = validatePlaybookForImport(loaded);
      assert.deepEqual(issues, [], file);
    });
  }
});
