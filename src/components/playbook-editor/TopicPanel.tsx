"use client";

import type { ChangeEvent } from "react";
import { useId } from "react";
import { CheckEditor } from "@/components/playbook-editor/CheckEditor";
import { DIMENSIONS } from "@/components/playbook-editor/playbook-data";
import type { RawCheck, RawTopic } from "@/playbook/playbook";
import type { Dimension } from "@/playbook/types";

function fieldClass() {
  return "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400";
}

function labelClass() {
  return "text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
}

export type TopicPanelProps = {
  topic: RawTopic;
  /** Checks in the same order as `topic.checks` */
  resolvedChecks: RawCheck[];
  allChecks: RawCheck[];
  onTopicChange: (next: RawTopic) => void;
  onCheckChange: (checkId: string, next: RawCheck) => void;
  onRemoveCheckFromTopic: (checkId: string) => void;
  onDeleteCheckFromPlaybook: (checkId: string) => void;
  onAddNewCheck: () => void;
  onLinkExistingCheck: (checkId: string) => void;
};

export function TopicPanel({
  topic,
  resolvedChecks,
  allChecks,
  onTopicChange,
  onCheckChange,
  onRemoveCheckFromTopic,
  onDeleteCheckFromPlaybook,
  onAddNewCheck,
  onLinkExistingCheck,
}: TopicPanelProps) {
  const linkSelectId = useId();
  const topicSet = new Set(topic.checks);
  const linkable = allChecks.filter((c) => !topicSet.has(c.id));
  const allCheckIds = allChecks.map((c) => c.id);

  const toggleDimension = (dim: Dimension, checked: boolean) => {
    const next = new Set(topic.dimensions);
    if (checked) next.add(dim);
    else next.delete(dim);
    onTopicChange({
      ...topic,
      dimensions: DIMENSIONS.filter((d) => next.has(d)),
    });
  };

  const onImportSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) onLinkExistingCheck(id);
    e.target.selectedIndex = 0;
  };

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
            <label className={labelClass()} htmlFor={`${topic.id}-tid`}>
              Topic ID
            </label>
            <input
              id={`${topic.id}-tid`}
              className={fieldClass()}
              value={topic.id}
              onChange={(e) => onTopicChange({ ...topic, id: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()} htmlFor={`${topic.id}-tname`}>
              Name
            </label>
            <input
              id={`${topic.id}-tname`}
              className={fieldClass()}
              value={topic.name}
              onChange={(e) =>
                onTopicChange({ ...topic, name: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()} htmlFor={`${topic.id}-tdesc`}>
              Description
            </label>
            <textarea
              id={`${topic.id}-tdesc`}
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
            {linkable.length > 0 ? (
              <select
                id={linkSelectId}
                className={fieldClass()}
                defaultValue=""
                onChange={onImportSelectChange}
              >
                <option value="" disabled>
                  Link existing check…
                </option>
                {linkable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.id})
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {resolvedChecks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/40">
              No checks on this topic yet. Add a new check or link an existing
              one.
            </p>
          ) : (
            resolvedChecks.map((check) => (
              <CheckEditor
                key={check.id}
                check={check}
                onChange={(next) => onCheckChange(check.id, next)}
                onRemoveFromTopic={() => onRemoveCheckFromTopic(check.id)}
                onDeleteFromPlaybook={() => onDeleteCheckFromPlaybook(check.id)}
                allCheckIds={allCheckIds}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
