"use client";

import { CheckEditor } from "@/components/playbook-editor/CheckEditor";
import {
    DIMENSIONS,
    uniqueManualTopicId,
    uniqueTopicSlug,
} from "@/components/playbook-editor/playbook-data";
import type { RawCheck, RawTopic } from "@/playbook/playbook";
import type { Dimension } from "@/playbook/types";
import { useId, useLayoutEffect, useRef } from "react";

function fieldClass() {
  return "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";
}

function labelClass() {
  return "text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
}

export type TopicPanelProps = {
  topic: RawTopic;
  /** All topics (for unique slug generation from name). */
  allTopics: RawTopic[];
  /** When true, show internal / technical fields (topic id, etc.). */
  displayTechFields: boolean;
  /** Checks in the same order as `topic.checks` */
  resolvedChecks: RawCheck[];
  allChecks: RawCheck[];
  onTopicChange: (next: RawTopic) => void;
  onCheckChange: (checkId: string, next: RawCheck) => void;
  onRemoveCheckFromTopic: (checkId: string) => void;
  onAddNewCheck: () => void;
  /** Increment when the parent adds a topic so the name field can be focused. */
  focusTopicNameFieldSignal?: number;
  /** Bumps with `expandCheckLabelTargetId` so that check expands and focuses its label. */
  expandCheckLabelToken?: number;
  expandCheckLabelTargetId?: string | null;
};

export function TopicPanel({
  topic,
  allTopics,
  displayTechFields,
  resolvedChecks,
  allChecks,
  onTopicChange,
  onCheckChange,
  onRemoveCheckFromTopic,
  onAddNewCheck,
  focusTopicNameFieldSignal = 0,
  expandCheckLabelToken = 0,
  expandCheckLabelTargetId = null,
}: TopicPanelProps) {
  const formUid = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const toggleDimension = (dim: Dimension, checked: boolean) => {
    const next = new Set(topic.dimensions);
    if (checked) next.add(dim);
    else next.delete(dim);
    onTopicChange({
      ...topic,
      dimensions: DIMENSIONS.filter((d) => next.has(d)),
    });
  };

  useLayoutEffect(() => {
    if (!focusTopicNameFieldSignal) return;
    const el = nameInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [focusTopicNameFieldSignal]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {topic.name || "Untitled topic"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Basic info and dimensions for this diligence topic.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <label className={labelClass()} htmlFor={`${formUid}-tname`}>
                Name
              </label>
              <span
                className="font-mono text-[11px] font-normal normal-case tracking-normal text-zinc-500 dark:text-zinc-400"
                title="Topic ID"
              >
                {topic.id}
              </span>
            </div>
            <input
              ref={nameInputRef}
              id={`${formUid}-tname`}
              className={fieldClass()}
              value={topic.name}
              onChange={(e) => {
                const name = e.target.value;
                const id = uniqueTopicSlug(name, allTopics, topic.id);
                onTopicChange({ ...topic, name, id });
              }}
            />
            {displayTechFields ? (
              <div className="mt-2">
                <label className={labelClass()} htmlFor={`${formUid}-tid`}>
                  Topic ID
                </label>
                <input
                  id={`${formUid}-tid`}
                  className={`${fieldClass()} font-mono text-zinc-700 dark:text-zinc-300`}
                  value={topic.id}
                  onChange={(e) => {
                    const id = uniqueManualTopicId(
                      e.target.value,
                      allTopics,
                      topic.id,
                    );
                    onTopicChange({ ...topic, id });
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Kept in sync when you edit the name; you can also edit the id
                  directly (kebab-case, must be unique).
                </p>
              </div>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()} htmlFor={`${formUid}-tdesc`}>
              Description
            </label>
            <textarea
              id={`${formUid}-tdesc`}
              className={`${fieldClass()} min-h-[100px]`}
              value={topic.description}
              onChange={(e) =>
                onTopicChange({ ...topic, description: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <span className={labelClass()}>Dimensions</span>
            <p className="mt-1 text-xs text-zinc-500">
              A topic can appear under multiple dimensions in the sidebar.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {DIMENSIONS.map((dim) => (
                <li key={dim}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600"
                      checked={topic.dimensions.includes(dim)}
                      onChange={(e) => toggleDimension(dim, e.target.checked)}
                    />
                    <span className="font-mono text-xs">{dim}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Checks ({topic.checks.length})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              onClick={onAddNewCheck}
            >
              New check
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Removing a check drops it from this topic and deletes it from the
          playbook.
        </p>
        <div className="mt-4 space-y-3">
          {resolvedChecks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/40">
              No checks on this topic yet. Add a new check.
            </p>
          ) : (
            resolvedChecks.map((check, index) => (
              <CheckEditor
                key={`${topic.id}-${index}`}
                check={check}
                onChange={(next) => onCheckChange(check.id, next)}
                onRemoveCheck={() => onRemoveCheckFromTopic(check.id)}
                allChecks={allChecks}
                displayTechFields={displayTechFields}
                expandAndFocusLabelToken={
                  expandCheckLabelTargetId === check.id
                    ? expandCheckLabelToken
                    : 0
                }
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
