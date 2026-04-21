---
name: dd-check-authoring
description: >-
  Drafts Due Diligence Check definitions in playbook YAML files anchored in
  Swiss corporate law. Use when asked to "add checks", "author a check",
  "draft DD checks", "complete playbook checks", "fill in checks", or "write
  Check YAML". Applies CO/OR, HRegV, FusG, and VegüV to define severity,
  evaluation rules, and recommendations for corporate DD checks.
---

# DD Check Authoring

## Workflow — follow all four phases in order

### Phase 1 — Identify the target file

Ask the user which playbook YAML file to create or edit. Do not read, create, or modify any file until the user has confirmed the target.

### Phase 2 — Identify checks in scope

Read the target file. Collect every check `id` referenced in `diligence_topics[].checks` that does not yet have a matching entry in the `checks:` array. If the user has provided specific check ids in their prompt, use those instead of the full gap list.

### Phase 3 — Research Swiss law anchors (confirmation gate)

For each check in scope, determine:

| Column | Content |
|--------|---------|
| **Check ID** | The check id |
| **Statute(s)** | Governing CO/OR article(s), HRegV provision, FusG article, VegüV article, or soft-law source |
| **Rule summary** | One sentence: what the statute requires |
| **Scope** | AG only / GmbH only / both |

Present this table to the user, then **stop and ask for confirmation**. Do not write any Check YAML until the user approves, corrects, or supplements the citations.

### Phase 4 — Draft Check entries

Using only the confirmed citations, append each Check to the `checks:` array of the target file. Use the template and conventions below.

---

## Mandatory fields (fill completely)

| Field | Notes |
|-------|-------|
| `id` | Exact id from the `diligence_topics[].checks` reference |
| `label` | Concise user-facing title (title case, ≤ 8 words) |
| `description` | 2–4 sentences: what is evaluated and why it matters in DD |
| `severity` | See severity scale below |
| `dimension` | Single primary dimension from the parent topic |
| `jurisdictions` | Always `[CH]` |
| `recommendation` | Concrete Swiss deal-lawyer mitigation steps |
| `evaluation_rule.clear_condition` | Single testable predicate showing the obligation is met |
| `evaluation_rule.finding_condition` | Negated/deficient pattern; must end with "or no evidence found" / "cannot be established" |

## Stub fields (include with `# TODO`, do not fill)

```yaml
basis: # TODO
prerequisites: [] # TODO
execution: # TODO
```

---

## Field conventions

### severity

- `high` — voidability risk, personal director liability, criminal exposure, or deal-blocking title defect
- `medium` — curable procedural defect or elevated commercial risk
- `low` — housekeeping / hygiene item

### clear_condition

- Present tense, document-grounded predicate
- Reference the specific document type, date, or statutory threshold being verified
- Example: "The articles of association filed in the commercial register are dated after the most recent share capital change."

### finding_condition

- The negated or deficient pattern
- Always end with a catch-all tail: "…or no evidence can be found" / "…or no relevant document exists"
- Example: "The articles pre-date the most recent share capital change, or no articles are available."

### recommendation

- Concrete actions: ratification resolution, W&I warranty, specific indemnity, condition precedent, escrow holdback, remediation filing with commercial register, referral to specialist Swiss counsel
- If a check is soft-law only (VegüV / Swiss Code of Best Practice), note that it applies to listed AGs or where required by articles

---

## Swiss law anchors — topic-level summary

Use these as starting points in Phase 3; refine per-check during research.

| Topic | Primary statutes |
|-------|-----------------|
| Articles of Association | CO Art. 626–628, 647, 706b |
| Board Composition & Governance | CO Art. 707–726; VegüV Art. 2–5; Swiss Code of Best Practice 2023 |
| Corporate Resolutions Validity | CO Art. 703–706b, 714–715a; HRegV |
| Corporate & Group Structure | CO Art. 659a, 674; HRegV; AMLA Art. 2a |
| Signatory & Representation Powers | CO Art. 718–718b; OR Art. 459 (Prokura); HRegV |
| Shareholder / Partnership Agreements | CO Art. 680, 685a–f (contractual-materiality test) |
| Corporate Records & Housekeeping | CO Art. 697a–697m; HRegV Art. 62 ff. |
| Related Party Transactions | CO Art. 678, 717, 725b; OR Art. 107–109 |
| Past M&A & Reorganisations | FusG Art. 3–5, 22, 49, 100; CO Art. 181 |

---

## YAML template

```yaml
- id: <check-id>
  label: <Short User-Facing Title>
  description: |
    <2–4 sentences: what is evaluated and why it matters in DD.>
  severity: <high|medium|low>
  dimension: <CORPORATE_GOVERNANCE|OWNERSHIP|HUMAN_RESOURCES|INTELLECTUAL_PROPERTY|COMMERCIAL_AGREEMENTS|REAL_ESTATE_TANGIBLE_ASSETS|INSURANCE|LITIGATION|FINANCING|REGULATORY_COMPLIANCE>
  basis: # TODO
  jurisdictions:
    - CH
  prerequisites: [] # TODO
  recommendation: |
    <Concrete Swiss deal-lawyer mitigation steps.>
  evaluation_rule:
    clear_condition: >
      <Single testable predicate showing the obligation is met.>
    finding_condition: >
      <Negated/deficient pattern, ending with "or no evidence found".>
  execution: # TODO
```

---

## Soft-law scoping rule

Checks anchored solely in VegüV or the Swiss Code of Best Practice must:
- Qualify `clear_condition` with "…if the target is a listed AG, or if required by the articles of association"
- Use `severity: medium` (never `high`)
- Note the scope limitation in `recommendation`

---

## Quality gates (run before declaring a batch complete)

- Every id in the topic's `checks:` list resolves to a defined Check entry
- No duplicate ids exist anywhere in the `checks:` array
- YAML indentation is consistent (2-space)
- Every `finding_condition` ends with an "or no evidence" / "cannot be established" tail
- No mandatory field is left blank or contains a placeholder like `<…>`

---

## Additional resources

- For full per-field documentation, allowed enums, and `execution.scope` examples, see [check-schema-reference.md](check-schema-reference.md)
