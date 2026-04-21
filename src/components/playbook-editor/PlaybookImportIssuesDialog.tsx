"use client";

import {
    formatUnknownCheckContextForClipboard,
    getUnknownCheckReferenceContext,
    type UnknownCheckRefContext,
} from "@/components/playbook-editor/playbook-import-issue-context";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

type PlaybookImportIssuesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: string[];
  /** Parsed YAML root from the failed import; used to enrich unknown check-id issues. */
  document?: unknown;
};

/** Most validation lines are `location: explanation` — split for clearer reading. */
function splitIssue(
  issue: string,
): { location: string; detail: string } | null {
  const sep = ": ";
  const i = issue.indexOf(sep);
  if (i <= 0) return null;
  return { location: issue.slice(0, i), detail: issue.slice(i + sep.length) };
}

function formatIssueForClipboard(
  issue: string,
  index: number,
  total: number,
  document: unknown | undefined,
): string {
  const lines = [
    `Issue ${index + 1} of ${total} — playbook YAML import validation:`,
    issue,
  ];
  const ctx = document
    ? getUnknownCheckReferenceContext(issue, document)
    : null;
  if (ctx) {
    lines.push("", formatUnknownCheckContextForClipboard(ctx));
  }
  return lines.join("\n");
}

function UnknownCheckContextPanel({ ctx }: { ctx: UnknownCheckRefContext }) {
  const hasParent =
    ctx.diligenceTopic !== undefined || ctx.referencingCheck !== undefined;
  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm dark:bg-muted/20">
      {ctx.diligenceTopic ? (
        <>
          <p className="font-medium text-foreground">Diligence topic</p>
          <dl className="mt-2 space-y-2 text-[13px] leading-snug">
            <div>
              <dt className="text-muted-foreground">ID</dt>
              <dd className="mt-0.5 font-mono text-foreground break-words">
                {ctx.diligenceTopic.id}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Label</dt>
              <dd className="mt-0.5 text-foreground">
                {ctx.diligenceTopic.name}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-0.5 text-foreground whitespace-pre-wrap break-words">
                {ctx.diligenceTopic.description}
              </dd>
            </div>
          </dl>
        </>
      ) : null}
      {ctx.referencingCheck ? (
        <>
          <p className="font-medium text-foreground">
            Check that lists this prerequisite
          </p>
          <dl className="mt-2 space-y-2 text-[13px] leading-snug">
            <div>
              <dt className="text-muted-foreground">ID</dt>
              <dd className="mt-0.5 font-mono text-foreground break-words">
                {ctx.referencingCheck.id}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Label</dt>
              <dd className="mt-0.5 text-foreground">
                {ctx.referencingCheck.label}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-0.5 text-foreground whitespace-pre-wrap break-words">
                {ctx.referencingCheck.description}
              </dd>
            </div>
          </dl>
        </>
      ) : null}
      <p
        className={cn(
          "text-[13px] text-muted-foreground",
          hasParent && "mt-3 border-t border-border pt-3",
        )}
      >
        Missing check id:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
          {ctx.missingCheckId}
        </code>
      </p>
    </div>
  );
}

export function PlaybookImportIssuesDialog({
  open,
  onOpenChange,
  issues,
  document,
}: PlaybookImportIssuesDialogProps) {
  const count = issues.length;
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function copyIssue(issue: string, index: number) {
    const text = formatIssueForClipboard(issue, index, count, document);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => {
        setCopiedIndex((current) => (current === index ? null : current));
      }, 2000);
    } catch {
      // Clipboard can fail without permission or in non-secure contexts
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        showCloseButton
        className={cn(
          "fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 shadow-none ring-0 sm:max-w-none",
          "data-open:zoom-in-95 data-closed:zoom-out-95",
        )}
      >
        <DialogHeader className="shrink-0 space-y-3 border-b border-border bg-muted/30 px-6 pb-5 pt-6 pr-14 sm:pr-14">
          <div className="flex flex-wrap items-baseline justify-between gap-3 gap-y-2">
            <DialogTitle className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              Playbook import failed
            </DialogTitle>
            <span
              className="inline-flex shrink-0 items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground"
              aria-live="polite"
            >
              {count === 1 ? "1 issue" : `${count} issues`}
            </span>
          </div>
          <DialogDescription className="text-base leading-relaxed text-muted-foreground">
            The file could not be imported. Review each item below, correct your
            YAML, then try importing again. Issues are listed in document order.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-6">
          <ol
            className="mx-auto flex max-w-3xl list-none flex-col gap-3"
            aria-label="Validation issues"
          >
            {issues.map((issue, i) => {
              const parts = splitIssue(issue);
              const n = i + 1;
              const unknownCheckCtx = document
                ? getUnknownCheckReferenceContext(issue, document)
                : null;
              return (
                <li key={`${i}-${issue.slice(0, 48)}`}>
                  <article
                    className={cn(
                      "relative flex gap-4 rounded-xl border border-border bg-card pr-12 pt-4 pb-4 pl-4 shadow-sm",
                      "transition-colors hover:bg-accent/5",
                    )}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                      aria-label={
                        copiedIndex === i
                          ? "Copied issue details"
                          : "Copy issue details for AI assistant"
                      }
                      title="Copy issue details"
                      onClick={() => copyIssue(issue, i)}
                    >
                      {copiedIndex === i ? (
                        <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )}
                      <span className="sr-only">
                        {copiedIndex === i ? "Copied" : "Copy issue details"}
                      </span>
                    </Button>
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold tabular-nums text-muted-foreground"
                      aria-hidden
                    >
                      {n}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {parts ? (
                        <>
                          <p className="font-mono text-[13px] leading-snug text-muted-foreground break-words">
                            {parts.location}
                          </p>
                          <p className="text-[15px] leading-relaxed text-foreground">
                            {parts.detail}
                          </p>
                        </>
                      ) : (
                        <p className="text-[15px] leading-relaxed text-foreground break-words">
                          {issue}
                        </p>
                      )}
                      {unknownCheckCtx ? (
                        <UnknownCheckContextPanel ctx={unknownCheckCtx} />
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t bg-muted/30 px-6 py-4 sm:justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            size="default"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
