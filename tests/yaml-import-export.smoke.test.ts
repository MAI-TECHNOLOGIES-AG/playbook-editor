import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { describe, it } from "vitest";
import {
  isPlaybookData,
  type PlaybookData,
} from "@/components/playbook-editor/playbook-data";
import { stringifyPlaybookData } from "@/components/playbook-editor/yaml-export";
import type { RawCheck } from "@/playbook/playbook";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function loadYaml(filePath: string): unknown {
  const raw = readFileSync(filePath, "utf8");
  return yaml.load(raw);
}

function fixturePlaybook(name: string): PlaybookData {
  const p = path.join(rootDir, "fixtures", name);
  const loaded = loadYaml(p);
  assert.ok(isPlaybookData(loaded), `${name} must match PlaybookData shape`);
  return loaded;
}

/**
 * Full import → export → re-parse cycle.
 * Returns both the original parsed object and the re-parsed exported object
 * so callers can make additional assertions on top of the deep-equal.
 */
function roundTrip(data: PlaybookData): { original: PlaybookData; reparsed: PlaybookData; exportedYaml: string } {
  const exportedYaml = stringifyPlaybookData(data);
  const raw: unknown = yaml.load(exportedYaml);
  assert.ok(isPlaybookData(raw), "exported YAML must parse back to PlaybookData");
  return { original: data, reparsed: raw, exportedYaml };
}

// ---------------------------------------------------------------------------
// Group 1 — Parameterized round-trips
// ---------------------------------------------------------------------------

describe("YAML import-export — round-trips", () => {
  const cases: Array<{ label: string; path: string }> = [
    { label: "playbook.yaml", path: path.join(rootDir, "fixtures/playbook.yaml") },
    { label: "minimal.yaml", path: path.join(rootDir, "fixtures/minimal.yaml") },
    { label: "no-version.yaml", path: path.join(rootDir, "fixtures/no-version.yaml") },
    { label: "multi-dimension.yaml", path: path.join(rootDir, "fixtures/multi-dimension.yaml") },
    { label: "all-optional-fields.yaml", path: path.join(rootDir, "fixtures/all-optional-fields.yaml") },
    { label: "execution-variants.yaml", path: path.join(rootDir, "fixtures/execution-variants.yaml") },
    { label: "prerequisite-chain.yaml", path: path.join(rootDir, "fixtures/prerequisite-chain.yaml") },
  ];

  for (const { label, path: filePath } of cases) {
    it(`round-trips ${label} with identical data`, () => {
      const loaded = loadYaml(filePath);
      assert.ok(isPlaybookData(loaded), `${label} must be valid PlaybookData`);
      const exported = stringifyPlaybookData(loaded);
      const reparsed: unknown = yaml.load(exported);
      assert.ok(isPlaybookData(reparsed), `re-export of ${label} must be valid PlaybookData`);
      assert.deepEqual(reparsed, loaded, `re-parsed export of ${label} must deep-equal original`);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 2 — isPlaybookData validation
// ---------------------------------------------------------------------------

describe("isPlaybookData — validation", () => {
  it("rejects null", () => {
    assert.equal(isPlaybookData(null), false);
  });

  it("rejects a bare string", () => {
    assert.equal(isPlaybookData("playbook"), false);
  });

  it("rejects a number", () => {
    assert.equal(isPlaybookData(42), false);
  });

  it("rejects an object missing checks", () => {
    assert.equal(isPlaybookData({ diligence_topics: [] }), false);
  });

  it("rejects an object missing diligence_topics", () => {
    assert.equal(isPlaybookData({ checks: [] }), false);
  });

  it("rejects an object where checks is not an array", () => {
    assert.equal(isPlaybookData({ diligence_topics: [], checks: "oops" }), false);
  });

  it("rejects an object where diligence_topics is not an array", () => {
    assert.equal(isPlaybookData({ diligence_topics: {}, checks: [] }), false);
  });

  it("accepts an object with both required arrays present (even if empty)", () => {
    assert.equal(isPlaybookData({ diligence_topics: [], checks: [] }), true);
  });
});

// ---------------------------------------------------------------------------
// Group 3 — Checks[] list integrity
// ---------------------------------------------------------------------------

describe("checks[] list integrity", () => {
  it("all check ids survive the round-trip with no drops (multi-dimension.yaml)", () => {
    const data = fixturePlaybook("multi-dimension.yaml");
    const { reparsed } = roundTrip(data);
    const originalIds = data.checks.map((c) => c.id).sort();
    const reparsedIds = reparsed.checks.map((c) => c.id).sort();
    assert.deepEqual(reparsedIds, originalIds);
  });

  it("no duplicate check ids after round-trip (multi-dimension.yaml)", () => {
    const data = fixturePlaybook("multi-dimension.yaml");
    const { reparsed } = roundTrip(data);
    const ids = reparsed.checks.map((c) => c.id);
    assert.equal(ids.length, new Set(ids).size, "check ids must be unique");
  });

  it("severity values round-trip correctly across all levels (multi-dimension.yaml)", () => {
    const data = fixturePlaybook("multi-dimension.yaml");
    const { reparsed } = roundTrip(data);
    const bySeverity = (checks: RawCheck[]) =>
      Object.fromEntries(checks.map((c) => [c.id, c.severity]));
    assert.deepEqual(bySeverity(reparsed.checks), bySeverity(data.checks));
  });

  it("dimension values round-trip correctly (multi-dimension.yaml)", () => {
    const data = fixturePlaybook("multi-dimension.yaml");
    const { reparsed } = roundTrip(data);
    const byDimension = (checks: RawCheck[]) =>
      Object.fromEntries(checks.map((c) => [c.id, c.dimension]));
    assert.deepEqual(byDimension(reparsed.checks), byDimension(data.checks));
  });

  it("basis values (statutory / contractual) round-trip correctly (multi-dimension.yaml)", () => {
    const data = fixturePlaybook("multi-dimension.yaml");
    const { reparsed } = roundTrip(data);
    const byBasis = (checks: RawCheck[]) =>
      Object.fromEntries(checks.map((c) => [c.id, c.basis]));
    assert.deepEqual(byBasis(reparsed.checks), byBasis(data.checks));
  });

  it("multi-value jurisdictions array round-trips in order (multi-dimension.yaml)", () => {
    const data = fixturePlaybook("multi-dimension.yaml");
    const { reparsed } = roundTrip(data);
    // key-person-clauses-check has ["CH", "AT", "DE"]
    const original = data.checks.find((c) => c.id === "key-person-clauses-check");
    const reparsedCheck = reparsed.checks.find((c) => c.id === "key-person-clauses-check");
    assert.ok(original && reparsedCheck);
    assert.deepEqual(reparsedCheck.jurisdictions, original.jurisdictions);
  });

  it("a bare-minimum check emits no recommendation key in YAML output (no-version.yaml)", () => {
    const data = fixturePlaybook("no-version.yaml");
    const { exportedYaml } = roundTrip(data);
    assert.ok(
      !exportedYaml.includes("recommendation:"),
      "bare-minimum check must not emit recommendation:",
    );
  });

  it("a bare-minimum check emits no evaluation_rule key in YAML output (no-version.yaml)", () => {
    const data = fixturePlaybook("no-version.yaml");
    const { exportedYaml } = roundTrip(data);
    assert.ok(
      !exportedYaml.includes("evaluation_rule:"),
      "bare-minimum check must not emit evaluation_rule:",
    );
  });

  it("a bare-minimum check emits no execution key in YAML output (no-version.yaml)", () => {
    const data = fixturePlaybook("no-version.yaml");
    const { exportedYaml } = roundTrip(data);
    assert.ok(
      !exportedYaml.includes("execution:"),
      "bare-minimum check must not emit execution:",
    );
  });

  it("check ids referenced in topic checks lists all exist in checks[] (multi-dimension.yaml)", () => {
    const data = fixturePlaybook("multi-dimension.yaml");
    const { reparsed } = roundTrip(data);
    const checkIdSet = new Set(reparsed.checks.map((c) => c.id));
    for (const topic of reparsed.diligence_topics) {
      for (const checkId of topic.checks) {
        assert.ok(
          checkIdSet.has(checkId),
          `topic ${topic.id} references check ${checkId} which is missing from checks[]`,
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Group 4 — Execution criteria
// ---------------------------------------------------------------------------

describe("execution criteria", () => {
  it("global-scoped check does not emit target_list (execution-variants.yaml)", () => {
    const data = fixturePlaybook("execution-variants.yaml");
    const { reparsed } = roundTrip(data);
    const check = reparsed.checks.find((c) => c.id === "global-scope-check");
    assert.ok(check?.execution);
    assert.equal(check.execution.scope, "global");
    assert.equal(
      check.execution.target_list,
      undefined,
      "global-scoped check must not have target_list",
    );
  });

  it("per-item-scoped check preserves target_list value (execution-variants.yaml)", () => {
    const data = fixturePlaybook("execution-variants.yaml");
    const { reparsed } = roundTrip(data);
    const check = reparsed.checks.find((c) => c.id === "per-item-scope-check");
    assert.ok(check?.execution);
    assert.equal(check.execution.scope, "per_item");
    assert.equal(check.execution.target_list, "collected_doc_ids");
  });

  it("per-item-scoped check does not emit context_exports (execution-variants.yaml)", () => {
    const data = fixturePlaybook("execution-variants.yaml");
    const { reparsed } = roundTrip(data);
    const check = reparsed.checks.find((c) => c.id === "per-item-scope-check");
    assert.ok(check?.execution);
    assert.equal(
      check.execution.context_exports,
      undefined,
      "per-item check without context_exports must not emit that field",
    );
  });

  it("context_exports array values are preserved in order (execution-variants.yaml)", () => {
    const data = fixturePlaybook("execution-variants.yaml");
    const { reparsed } = roundTrip(data);
    const check = reparsed.checks.find((c) => c.id === "global-scope-check");
    assert.ok(check?.execution?.context_exports);
    assert.deepEqual(check.execution.context_exports, ["collected_doc_ids", "summary_flags"]);
  });

  it("step key names are preserved exactly and not renumbered (all-optional-fields.yaml)", () => {
    const data = fixturePlaybook("all-optional-fields.yaml");
    const { reparsed } = roundTrip(data);
    const check = reparsed.checks.find((c) => c.id === "full-check");
    assert.ok(check?.execution?.steps);
    const keys = check.execution.steps.map((s) => Object.keys(s)[0]);
    assert.deepEqual(keys, ["step_1", "step_2", "step_3", "step_4", "step_5", "step_6"]);
  });

  it("step text values survive the round-trip without truncation (all-optional-fields.yaml)", () => {
    const data = fixturePlaybook("all-optional-fields.yaml");
    const { reparsed } = roundTrip(data);
    const originalCheck = data.checks.find((c) => c.id === "full-check");
    const reparsedCheck = reparsed.checks.find((c) => c.id === "full-check");
    assert.ok(originalCheck?.execution?.steps && reparsedCheck?.execution?.steps);
    assert.deepEqual(reparsedCheck.execution.steps, originalCheck.execution.steps);
  });

  it("a check with no execution block does not emit execution: key in output (no-version.yaml)", () => {
    const data = fixturePlaybook("no-version.yaml");
    const { exportedYaml } = roundTrip(data);
    assert.ok(!exportedYaml.includes("execution:"), "no execution: key must appear");
  });

  it("prerequisite check_id and required_state values survive round-trip (prerequisite-chain.yaml)", () => {
    const data = fixturePlaybook("prerequisite-chain.yaml");
    const { reparsed } = roundTrip(data);
    const checkB = reparsed.checks.find((c) => c.id === "chain-check-b");
    const checkC = reparsed.checks.find((c) => c.id === "chain-check-c");
    assert.ok(checkB?.prerequisites?.length === 1);
    assert.equal(checkB.prerequisites[0].check_id, "chain-check-a");
    assert.equal(checkB.prerequisites[0].required_state, "finding");
    assert.ok(checkC?.prerequisites?.length === 1);
    assert.equal(checkC.prerequisites[0].check_id, "chain-check-b");
    assert.equal(checkC.prerequisites[0].required_state, "cleared");
  });

  it("multiple context_exports survive round-trip correctly (all-optional-fields.yaml)", () => {
    const data = fixturePlaybook("all-optional-fields.yaml");
    const { reparsed } = roundTrip(data);
    const check = reparsed.checks.find((c) => c.id === "full-check");
    assert.ok(check?.execution?.context_exports);
    assert.deepEqual(check.execution.context_exports, [
      "full_check_findings",
      "full_check_cleared_ids",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Group 5 — Version / metadata
// ---------------------------------------------------------------------------

describe("version field handling", () => {
  it("version: appears before diligence_topics: when version is present", () => {
    const data = fixturePlaybook("minimal.yaml");
    const { exportedYaml } = roundTrip(data);
    const versionPos = exportedYaml.indexOf("version:");
    const topicsPos = exportedYaml.indexOf("diligence_topics:");
    assert.ok(versionPos !== -1, "version: must be present");
    assert.ok(versionPos < topicsPos, "version: must come before diligence_topics:");
  });

  it("version: is absent from output when source has no version field (no-version.yaml)", () => {
    const data = fixturePlaybook("no-version.yaml");
    const { exportedYaml } = roundTrip(data);
    assert.ok(!exportedYaml.includes("version:"), "version: must not appear");
  });
});
