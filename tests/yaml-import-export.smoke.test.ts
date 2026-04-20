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

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function loadFixturePlaybook(): PlaybookData {
  const playbookPath = path.join(rootDir, "../src/playbook/playbook.yaml");
  const raw = readFileSync(playbookPath, "utf8");
  const loaded: unknown = yaml.load(raw);
  assert.ok(
    isPlaybookData(loaded),
    "fixture playbook.yaml must match PlaybookData shape",
  );
  return loaded;
}

describe("YAML import-export smoke", () => {
  it("round-trips src/playbook/playbook.yaml with identical data (comments ignored)", () => {
    const imported = loadFixturePlaybook();
    const exported = stringifyPlaybookData(imported);
    const reparsed: unknown = yaml.load(exported);
    assert.ok(
      isPlaybookData(reparsed),
      "exported YAML must parse to PlaybookData",
    );
    assert.deepEqual(
      reparsed,
      imported,
      "re-parsed export must deep-equal js-yaml import (comment lines do not affect parse)",
    );
  });
});
