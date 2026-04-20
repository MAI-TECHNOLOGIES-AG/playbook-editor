"use client";

import {
    DIMENSIONS,
    emptyCheck,
    emptyPlaybook,
    emptyTopic,
    ensureUniqueCheckOwnership,
    isPlaybookData,
    LOCAL_STORAGE_KEY,
    type PlaybookData,
    resolveTopicChecks,
    uniqueCheckSlug,
    uniqueTopicSlug,
} from "@/components/playbook-editor/playbook-data";
import { TopicPanel } from "@/components/playbook-editor/TopicPanel";
import { stringifyPlaybookData } from "@/components/playbook-editor/yaml-export";
import type { RawCheck, RawTopic } from "@/playbook/playbook";
import type { Dimension } from "@/playbook/types";
import yaml from "js-yaml";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

function applyCheckUpdate(
  data: PlaybookData,
  oldId: string,
  next: RawCheck,
): PlaybookData {
  const idChanged = oldId !== next.id;
  const checks = data.checks.map((c) => (c.id === oldId ? next : c));
  const withPrereqFix = idChanged
    ? checks.map((c) => ({
        ...c,
        prerequisites: c.prerequisites?.map((p) =>
          p.check_id === oldId ? { ...p, check_id: next.id } : p,
        ),
      }))
    : checks;
  const diligence_topics = idChanged
    ? data.diligence_topics.map((t) => ({
        ...t,
        checks: t.checks.map((id) => (id === oldId ? next.id : id)),
      }))
    : data.diligence_topics;
  return { ...data, checks: withPrereqFix, diligence_topics };
}

function deleteCheckEverywhere(
  data: PlaybookData,
  checkId: string,
): PlaybookData {
  return {
    ...data,
    checks: data.checks
      .filter((c) => c.id !== checkId)
      .map((c) => ({
        ...c,
        prerequisites: c.prerequisites?.filter((p) => p.check_id !== checkId),
      })),
    diligence_topics: data.diligence_topics.map((t) => ({
      ...t,
      checks: t.checks.filter((id) => id !== checkId),
    })),
  };
}

/** Drop check definitions that no topic references (e.g. after deleting a topic). */
function pruneUnreferencedChecks(data: PlaybookData): PlaybookData {
  const referenced = new Set<string>();
  for (const t of data.diligence_topics) {
    for (const id of t.checks) referenced.add(id);
  }
  const danglingIds = data.checks
    .filter((c) => !referenced.has(c.id))
    .map((c) => c.id);
  let next = data;
  for (const id of danglingIds) {
    next = deleteCheckEverywhere(next, id);
  }
  return next;
}

function groupTopicsByDimension(
  topics: RawTopic[],
): Record<Dimension, RawTopic[]> {
  const groups = {} as Record<Dimension, RawTopic[]>;
  for (const d of DIMENSIONS) groups[d] = [];
  for (const topic of topics) {
    for (const dim of topic.dimensions) {
      if (dim in groups) {
        const list = groups[dim as Dimension];
        if (!list.some((t) => t.id === topic.id)) list.push(topic);
      }
    }
  }
  return groups;
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <title>Log out</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
      />
    </svg>
  );
}

export function PlaybookEditor() {
  const router = useRouter();
  const [data, setData] = useState<PlaybookData | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [focusTopicNameFieldSignal, setFocusTopicNameFieldSignal] = useState(0);
  const [expandCheckLabelToken, setExpandCheckLabelToken] = useState(0);
  const [expandCheckLabelTargetId, setExpandCheckLabelTargetId] = useState<
    string | null
  >(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [displayTechFields, setDisplayTechFields] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let initial: PlaybookData = emptyPlaybook();
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isPlaybookData(parsed))
          initial = ensureUniqueCheckOwnership(parsed);
      }
    } catch {
      /* keep empty */
    }
    setData(initial);
    setSelectedTopicId(initial.diligence_topics[0]?.id ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !data) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota */
    }
  }, [data, hydrated]);

  const dimensionGroups = useMemo(
    () => (data ? groupTopicsByDimension(data.diligence_topics) : null),
    [data],
  );

  const unassignedTopics = useMemo(() => {
    if (!data) return [];
    return data.diligence_topics.filter((t) => t.dimensions.length === 0);
  }, [data]);

  const selectedTopic = useMemo(() => {
    if (!data || !selectedTopicId) return null;
    return data.diligence_topics.find((t) => t.id === selectedTopicId) ?? null;
  }, [data, selectedTopicId]);

  const resolvedChecks = useMemo(() => {
    if (!data || !selectedTopic) return [];
    return resolveTopicChecks(selectedTopic, data.checks);
  }, [data, selectedTopic]);

  const orphanedCheckIds = useMemo(() => {
    if (!data || !selectedTopic) return [];
    const ids = new Set(data.checks.map((c) => c.id));
    return selectedTopic.checks.filter((id) => !ids.has(id));
  }, [data, selectedTopic]);

  const handleTopicChange = useCallback(
    (next: RawTopic) => {
      const sid = selectedTopicId;
      if (!sid) return;
      setData((d) => {
        if (!d) return d;
        return {
          ...d,
          diligence_topics: d.diligence_topics.map((t) =>
            t.id === sid ? next : t,
          ),
        };
      });
      if (next.id !== sid) setSelectedTopicId(next.id);
    },
    [selectedTopicId],
  );

  const handleCheckChange = useCallback((checkId: string, next: RawCheck) => {
    setData((d) => {
      if (!d) return d;
      return applyCheckUpdate(d, checkId, next);
    });
    if (next.id !== checkId) {
      /* selection keys use check.id in lists — no selection state for checks */
    }
  }, []);

  const handleRemoveCheckFromTopic = useCallback(
    (checkId: string) => {
      const sid = selectedTopicId;
      if (!sid) return;
      setData((d) => {
        if (!d) return d;
        const diligence_topics = d.diligence_topics.map((t) =>
          t.id === sid
            ? { ...t, checks: t.checks.filter((id) => id !== checkId) }
            : t,
        );
        const stillReferenced = diligence_topics.some((t) =>
          t.checks.includes(checkId),
        );
        let next: PlaybookData = { ...d, diligence_topics };
        if (!stillReferenced) {
          next = deleteCheckEverywhere(next, checkId);
        }
        return next;
      });
    },
    [selectedTopicId],
  );

  const handleAddNewCheck = useCallback(() => {
    const sid = selectedTopicId;
    if (!sid) return;
    let newCheckId: string | null = null;
    flushSync(() => {
      setData((d) => {
        if (!d) return d;
        const topic = d.diligence_topics.find((t) => t.id === sid);
        const dim =
          topic?.dimensions[0] ?? ("CORPORATE_GOVERNANCE" satisfies Dimension);
        const defaultLabel = "New check";
        const id = uniqueCheckSlug(defaultLabel, d.checks, undefined);
        newCheckId = id;
        const newCheck = emptyCheck({
          id,
          label: defaultLabel,
          dimension: dim,
        });
        return {
          ...d,
          checks: [...d.checks, newCheck],
          diligence_topics: d.diligence_topics.map((t) =>
            t.id === sid ? { ...t, checks: [...t.checks, id] } : t,
          ),
        };
      });
    });
    if (newCheckId) {
      setExpandCheckLabelTargetId(newCheckId);
      setExpandCheckLabelToken((t) => t + 1);
    }
  }, [selectedTopicId]);

  const addTopicUnderDimension = useCallback((dimension: Dimension) => {
    let newTopicId: string | null = null;
    flushSync(() => {
      setData((d) => {
        if (!d) return d;
        const defaultName = "New diligence topic";
        const id = uniqueTopicSlug(defaultName, d.diligence_topics, undefined);
        newTopicId = id;
        return {
          ...d,
          diligence_topics: [
            ...d.diligence_topics,
            emptyTopic({
              id,
              name: defaultName,
              dimensions: [dimension],
            }),
          ],
        };
      });
    });
    if (newTopicId) {
      setSelectedTopicId(newTopicId);
      setFocusTopicNameFieldSignal((n) => n + 1);
    }
  }, []);

  const importFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const loaded = yaml.load(text);
        if (!isPlaybookData(loaded)) {
          setImportError(
            "File is not a valid playbook (missing topics or checks).",
          );
          return;
        }
        const normalized = ensureUniqueCheckOwnership(loaded);
        setData(normalized);
        setSelectedTopicId(normalized.diligence_topics[0]?.id ?? null);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : "Could not parse YAML.",
        );
      }
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const exportYaml = useCallback(() => {
    if (!data) return;
    const out = stringifyPlaybookData(data);
    const blob = new Blob([out], {
      type: "text/yaml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playbook.yaml";
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const clearPlaybook = useCallback(() => {
    const fresh = emptyPlaybook();
    setData(fresh);
    setSelectedTopicId(null);
    setImportError(null);
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }, [router]);

  if (!data || !dimensionGroups) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <header className="fixed top-0 left-0 right-0 z-10 border-b border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Playbook editor
            </h1>
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              Version
              <input
                type="text"
                className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={data.version ?? ""}
                onChange={(e) =>
                  setData((d) =>
                    d ? { ...d, version: e.target.value || undefined } : d,
                  )
                }
                placeholder="0.2"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600"
                checked={displayTechFields}
                onChange={(e) => setDisplayTechFields(e.target.checked)}
              />
              Display tech fields
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,text/yaml"
              className="hidden"
              onChange={importFile}
            />
            {importError ? (
              <span className="max-w-xs text-xs text-red-600 dark:text-red-400">
                {importError}
              </span>
            ) : null}
            <button
              type="button"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              onClick={() => fileInputRef.current?.click()}
            >
              Import YAML
            </button>
            <button
              type="button"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              onClick={exportYaml}
            >
              Export YAML
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={clearPlaybook}
            >
              Clear playbook
            </button>
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
            >
              <LogoutIcon className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 gap-0">
        <aside className="flex fixed left-0 top-15 bottom-0 w-full shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:w-72">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {DIMENSIONS.map((dim) => (
              <div key={dim} className="mb-4">
                <div className="flex items-center justify-between gap-1 px-1">
                  <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {dim.replace(/_/g, " ")}
                  </h2>
                  <button
                    type="button"
                    className="text-[10px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    onClick={() => addTopicUnderDimension(dim)}
                  >
                    + Topic
                  </button>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {dimensionGroups[dim].map((t) => (
                    <li key={`${dim}-${t.id}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedTopicId(t.id)}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                          selectedTopicId === t.id
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span className="line-clamp-2">{t.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {unassignedTopics.length > 0 ? (
              <div className="mb-4">
                <h2 className="px-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Unassigned
                </h2>
                <p className="px-1 text-[10px] text-zinc-500">
                  Add at least one dimension to place these in the tree.
                </p>
                <ul className="mt-1 space-y-0.5">
                  {unassignedTopics.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTopicId(t.id)}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                          selectedTopicId === t.id
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="min-h-[calc(100vh-3.5rem)] mt-15 flex-1 overflow-y-auto p-4 sm:p-6 ml-72">
          {selectedTopic ? (
            <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-zinc-500">
                  Edit fields below. Changes save automatically in this browser.
                </p>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
                  onClick={() => {
                    const sid = selectedTopicId;
                    if (!sid) return;
                    setData((d) => {
                      if (!d) return d;
                      const nextTopics = d.diligence_topics.filter(
                        (t) => t.id !== sid,
                      );
                      setSelectedTopicId(nextTopics[0]?.id ?? null);
                      return pruneUnreferencedChecks({
                        ...d,
                        diligence_topics: nextTopics,
                      });
                    });
                  }}
                >
                  Delete topic
                </button>
              </div>
              {orphanedCheckIds.length > 0 ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  Unknown check IDs on this topic (not in playbook checks):{" "}
                  <span className="font-mono">
                    {orphanedCheckIds.join(", ")}
                  </span>
                </div>
              ) : null}
              <TopicPanel
                topic={selectedTopic}
                allTopics={data.diligence_topics}
                displayTechFields={displayTechFields}
                resolvedChecks={resolvedChecks}
                allChecks={data.checks}
                onTopicChange={handleTopicChange}
                onCheckChange={handleCheckChange}
                onRemoveCheckFromTopic={handleRemoveCheckFromTopic}
                onAddNewCheck={handleAddNewCheck}
                focusTopicNameFieldSignal={focusTopicNameFieldSignal}
                expandCheckLabelToken={expandCheckLabelToken}
                expandCheckLabelTargetId={expandCheckLabelTargetId}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white/50 px-8 py-24 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="max-w-md text-zinc-600 dark:text-zinc-400">
                Import a YAML playbook, or add a topic under a dimension in the
                sidebar. There is no built-in default catalog.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
