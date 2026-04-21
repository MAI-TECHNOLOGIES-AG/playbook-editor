"use client";

import { ConfirmPopover } from "@/components/ConfirmPopover";
import {
    DIMENSIONS,
    stepsToStrings,
    stringsToSteps,
    uniqueCheckSlug,
    uniqueManualCheckId,
} from "@/components/playbook-editor/playbook-data";
import type { RawCheck } from "@/playbook/playbook";
import type { CheckBasis, Dimension, FindingSeverity } from "@/playbook/types";
import type { ChangeEvent } from "react";
import { useId, useLayoutEffect, useRef, useState } from "react";

const SEVERITIES: FindingSeverity[] = ["low", "medium", "high", "critical"];
const BASES: CheckBasis[] = ["statutory", "commercial"];

/** Place the top of the new check near this fraction of the visible viewport height. */
const NEW_CHECK_SCROLL_ALIGN = 0.5;

type CheckEditorProps = {
  check: RawCheck;
  onChange: (next: RawCheck) => void;
  /** Remove this check from the topic and delete it from the playbook. */
  onRemoveCheck: () => void;
  allChecks: RawCheck[];
  /** When true, show internal fields (check id, etc.). */
  displayTechFields: boolean;
  /** When incremented for this check (via parent), expand the panel and focus the label field. */
  expandAndFocusLabelToken?: number;
};

function fieldClass() {
  return "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";
}

function labelClass() {
  return "text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
}

export function CheckEditor({
  check,
  onChange,
  onRemoveCheck,
  allChecks,
  displayTechFields,
  expandAndFocusLabelToken = 0,
}: CheckEditorProps) {
  const formUid = useId();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const allCheckIds = allChecks.map((c) => c.id);

  const set = (patch: Partial<RawCheck>) => {
    onChange({ ...check, ...patch });
  };

  const jurisdictionsText = (check.jurisdictions ?? []).join(", ");
  const contextExportsText = (check.execution?.context_exports ?? []).join(
    ", ",
  );
  const stepLines = stepsToStrings(check.execution?.steps).join("\n");

  const updateJurisdictions = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.value
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const jurisdictions = list.length ? list : undefined;
    const id = uniqueCheckSlug(
      check.label,
      allChecks,
      check.id,
      jurisdictions,
    );
    set({ jurisdictions, id });
  };

  const updateContextExports = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const list = e.target.value
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const exec = check.execution;
    if (!exec && list.length === 0) return;
    const base = exec ?? { scope: "global" as const, steps: [] };
    set({
      execution: {
        ...base,
        context_exports: list.length ? list : undefined,
        steps: base.steps?.length ? base.steps : stringsToSteps([""]),
      },
    });
  };

  const updateSteps = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split("\n");
    const steps = stringsToSteps(lines);
    const exec = check.execution ?? { scope: "global" as const, steps: [] };
    set({
      execution: {
        ...exec,
        steps: steps.length ? steps : stringsToSteps([""]),
      },
    });
  };

  const ensureExecution = () => {
    if (!check.execution) {
      set({
        execution: { scope: "global", steps: stringsToSteps([""]) },
      });
    }
  };

  const updatePrerequisite = (
    index: number,
    patch: Partial<{ check_id: string; required_state: "finding" | "cleared" }>,
  ) => {
    const list = [...(check.prerequisites ?? [])];
    list[index] = { ...list[index], ...patch };
    set({ prerequisites: list });
  };

  const addPrerequisite = () => {
    const firstOther = allCheckIds.find((id) => id !== check.id) ?? "";
    set({
      prerequisites: [
        ...(check.prerequisites ?? []),
        { check_id: firstOther, required_state: "finding" as const },
      ],
    });
  };

  const removePrerequisite = (index: number) => {
    const list = [...(check.prerequisites ?? [])];
    list.splice(index, 1);
    set({ prerequisites: list.length ? list : undefined });
  };

  useLayoutEffect(() => {
    if (!expandAndFocusLabelToken) return;
    setOpen(true);
  }, [expandAndFocusLabelToken]);

  useLayoutEffect(() => {
    if (!expandAndFocusLabelToken || !open) return;
    const inputEl = labelInputRef.current;
    if (inputEl) {
      inputEl.focus({ preventScroll: true });
      inputEl.select();
    }
    const raf = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const checkRect = root.getBoundingClientRect();
      const targetTop = NEW_CHECK_SCROLL_ALIGN * window.innerHeight;
      const delta = checkRect.top - targetTop;
      if (Math.abs(delta) < 2) return;
      window.scrollBy({ top: delta, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [expandAndFocusLabelToken, open]);

  return (
    <div className="group">
      <div
        ref={rootRef}
        className="rounded-lg border border-zinc-200 bg-zinc-50/80 transition-[border-color] duration-150 ease-out group-focus-within:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/40 dark:group-focus-within:border-zinc-500"
      >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="text-zinc-400" aria-hidden>
            {open ? "▼" : "▶"}
          </span>
          <span className="truncate">{check.label || check.id}</span>
          {displayTechFields ? (
            <span className="shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {check.id}
            </span>
          ) : null}
        </button>
        <ConfirmPopover
          title="Remove check?"
          description="Drops from topic; deletes if unused. Clears prerequisites."
          confirmText="Remove"
          cancelText="Cancel"
          onConfirm={() => {
            onRemoveCheck();
          }}
        >
          <button
            type="button"
            className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Remove check
          </button>
        </ConfirmPopover>
      </div>
      {open ? (
        <div
          id={panelId}
          className="space-y-4 border-t border-zinc-200 px-3 py-4 dark:border-zinc-700"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <label className={labelClass()} htmlFor={`${formUid}-label`}>
                  Label
                </label>
                <span
                  className="font-mono text-[11px] font-normal normal-case tracking-normal text-zinc-500 dark:text-zinc-400"
                  title="Check ID"
                >
                  {check.id}
                </span>
              </div>
              <input
                ref={labelInputRef}
                id={`${formUid}-label`}
                className={fieldClass()}
                value={check.label}
                onChange={(e) => {
                  const label = e.target.value;
                  const id = uniqueCheckSlug(
                    label,
                    allChecks,
                    check.id,
                    check.jurisdictions,
                  );
                  onChange({ ...check, label, id });
                }}
              />
              {displayTechFields ? (
                <div className="mt-2">
                  <label className={labelClass()} htmlFor={`${formUid}-id`}>
                    Check ID
                  </label>
                  <input
                    id={`${formUid}-id`}
                    className={`${fieldClass()} font-mono text-zinc-700 dark:text-zinc-300`}
                    value={check.id}
                    onChange={(e) => {
                      const id = uniqueManualCheckId(
                        e.target.value,
                        allChecks,
                        check.id,
                      );
                      onChange({ ...check, id });
                    }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Updated from the label (with a jurisdiction prefix) unless you
                    set it here; must be unique in the playbook. References update
                    automatically.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass()} htmlFor={`${formUid}-desc`}>
                Description
              </label>
              <textarea
                id={`${formUid}-desc`}
                className={`${fieldClass()} min-h-[88px] font-sans`}
                value={check.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass()} htmlFor={`${formUid}-basis`}>
                Basis
              </label>
              <select
                id={`${formUid}-basis`}
                className={fieldClass()}
                value={check.basis}
                onChange={(e) => set({ basis: e.target.value as CheckBasis })}
              >
                {BASES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass()} htmlFor={`${formUid}-sev`}>
                Severity
              </label>
              <select
                id={`${formUid}-sev`}
                className={fieldClass()}
                value={check.severity}
                onChange={(e) =>
                  set({ severity: e.target.value as FindingSeverity })
                }
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass()} htmlFor={`${formUid}-dim`}>
                Dimension
              </label>
              <select
                id={`${formUid}-dim`}
                className={fieldClass()}
                value={check.dimension}
                onChange={(e) =>
                  set({ dimension: e.target.value as Dimension })
                }
              >
                {DIMENSIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass()} htmlFor={`${formUid}-jur`}>
                Jurisdictions
              </label>
              <input
                id={`${formUid}-jur`}
                readOnly
                tabIndex={-1}
                type="text"
                className={`${fieldClass()} cursor-default bg-zinc-50 font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`}
                value={jurisdictionsText}
                onChange={updateJurisdictions}
                placeholder="CH, DE (comma-separated ISO)"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Prerequisites
              </h4>
              <button
                type="button"
                className="rounded-md bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                onClick={addPrerequisite}
              >
                Add prerequisite
              </button>
            </div>
            {(check.prerequisites?.length ?? 0) === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No prerequisites.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {check.prerequisites?.map((pr, i) => (
                  <li
                    key={`${pr.check_id}-${i}`}
                    className="flex flex-wrap items-end gap-2 rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    <div className="min-w-[140px] flex-1">
                      <label
                        className={labelClass()}
                        htmlFor={`${formUid}-pr-${i}-id`}
                      >
                        Parent check
                      </label>
                      <select
                        id={`${formUid}-pr-${i}-id`}
                        className={fieldClass()}
                        value={pr.check_id}
                        onChange={(e) =>
                          updatePrerequisite(i, { check_id: e.target.value })
                        }
                      >
                        {allCheckIds.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-36">
                      <label
                        className={labelClass()}
                        htmlFor={`${formUid}-pr-${i}-st`}
                      >
                        Required state
                      </label>
                      <select
                        id={`${formUid}-pr-${i}-st`}
                        className={fieldClass()}
                        value={pr.required_state}
                        onChange={(e) =>
                          updatePrerequisite(i, {
                            required_state: e.target.value as
                              | "finding"
                              | "cleared",
                          })
                        }
                      >
                        <option value="finding">finding</option>
                        <option value="cleared">cleared</option>
                      </select>
                    </div>
                    <ConfirmPopover
                      title="Remove prerequisite?"
                      description="Removes this parent-check link only."
                      confirmText="Remove"
                      cancelText="Cancel"
                      onConfirm={() => {
                        removePrerequisite(i);
                      }}
                    >
                      <button
                        type="button"
                        className="mb-1 rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
                      >
                        Remove
                      </button>
                    </ConfirmPopover>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Evaluation rule
            </h4>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <fieldset className="sm:col-span-2 rounded-md border border-zinc-200 p-3 transition-colors focus-within:border-zinc-500 dark:border-zinc-600 dark:focus-within:border-zinc-400">
                <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Clear outcome
                </legend>
                <div>
                  <label className={labelClass()} htmlFor={`${formUid}-clear`}>
                    Clear condition
                  </label>
                  <textarea
                    id={`${formUid}-clear`}
                    className={`${fieldClass()} min-h-[72px]`}
                    value={check.evaluation_rule?.clear_condition ?? ""}
                    onChange={(e) =>
                      set({
                        evaluation_rule: {
                          clear_condition: e.target.value,
                          finding_condition:
                            check.evaluation_rule?.finding_condition ?? "",
                        },
                      })
                    }
                  />
                </div>
              </fieldset>
              <fieldset className="sm:col-span-2 rounded-md border border-zinc-200 p-3 transition-colors focus-within:border-zinc-500 dark:border-zinc-600 dark:focus-within:border-zinc-400">
                <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Finding outcome
                </legend>
                <div>
                  <label
                    className={labelClass()}
                    htmlFor={`${formUid}-finding`}
                  >
                    Finding condition
                  </label>
                  <textarea
                    id={`${formUid}-finding`}
                    className={`${fieldClass()} min-h-[72px]`}
                    value={check.evaluation_rule?.finding_condition ?? ""}
                    onChange={(e) =>
                      set({
                        evaluation_rule: {
                          clear_condition:
                            check.evaluation_rule?.clear_condition ?? "",
                          finding_condition: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                  <label className={labelClass()} htmlFor={`${formUid}-rec`}>
                    Recommendation
                  </label>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Used when the finding condition is met.
                  </p>
                  <textarea
                    id={`${formUid}-rec`}
                    className={`${fieldClass()} mt-1 min-h-[72px]`}
                    value={check.recommendation ?? ""}
                    onChange={(e) =>
                      set({
                        recommendation: e.target.value.trim()
                          ? e.target.value
                          : undefined,
                      })
                    }
                  />
                </div>
              </fieldset>
            </div>
            <ConfirmPopover
              title="Clear evaluation?"
              description="Clears conditions. Keeps recommendation."
              confirmText="Clear"
              cancelText="Cancel"
              onConfirm={() => {
                set({ evaluation_rule: undefined });
              }}
            >
              <button
                type="button"
                className="mt-2 text-xs text-zinc-500 underline hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-zinc-300"
                disabled={!check.evaluation_rule}
              >
                Clear evaluation rule
              </button>
            </ConfirmPopover>
          </div>

          {displayTechFields ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Execution
                </h4>
                <button
                  type="button"
                  className="rounded-md bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                  onClick={ensureExecution}
                >
                  {check.execution ? "Edit execution" : "Add execution"}
                </button>
              </div>
              {check.execution ? (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      className={labelClass()}
                      htmlFor={`${formUid}-scope`}
                    >
                      Scope
                    </label>
                    <select
                      id={`${formUid}-scope`}
                      className={fieldClass()}
                      value={check.execution.scope}
                      onChange={(e) => {
                        const ex = check.execution;
                        if (!ex) return;
                        set({
                          execution: {
                            ...ex,
                            scope: e.target.value as "global" | "per_item",
                          },
                        });
                      }}
                    >
                      <option value="global">global</option>
                      <option value="per_item">per_item</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className={labelClass()}
                      htmlFor={`${formUid}-target`}
                    >
                      Target list (per_item)
                    </label>
                    <input
                      id={`${formUid}-target`}
                      className={fieldClass()}
                      value={check.execution.target_list ?? ""}
                      onChange={(e) => {
                        const ex = check.execution;
                        if (!ex) return;
                        set({
                          execution: {
                            ...ex,
                            target_list: e.target.value.trim() || undefined,
                          },
                        });
                      }}
                      placeholder="e.g. agm_document_ids"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass()} htmlFor={`${formUid}-ctx`}>
                      Context exports (comma or newline)
                    </label>
                    <textarea
                      id={`${formUid}-ctx`}
                      className={`${fieldClass()} min-h-[56px]`}
                      value={contextExportsText}
                      onChange={updateContextExports}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass()} htmlFor={`${formUid}-steps`}>
                      Steps (one per line → YAML step_1, step_2, …)
                    </label>
                    <textarea
                      id={`${formUid}-steps`}
                      className={`${fieldClass()} min-h-[120px] font-mono text-xs`}
                      value={stepLines}
                      onChange={updateSteps}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <ConfirmPopover
                      title="Remove execution?"
                      description="Removes scope, steps, exports. Re-add anytime."
                      confirmText="Remove"
                      cancelText="Cancel"
                      onConfirm={() => {
                        set({ execution: undefined });
                      }}
                    >
                      <button
                        type="button"
                        className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
                      >
                        Remove execution block
                      </button>
                    </ConfirmPopover>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">
                  No execution block.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
    </div>
  );
}
