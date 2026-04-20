"use client";

import dynamic from "next/dynamic";

const Agentation = dynamic(
  () => import("agentation").then((m) => m.Agentation),
  { ssr: false },
);

/** Dev-only overlay; root layout renders this only when `NODE_ENV === "development"`. */
export function AgentationDev() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Agentation
      endpoint="http://localhost:4747"
      onSessionCreated={(sessionId) => {
        console.debug("[agentation] session:", sessionId);
      }}
    />
  );
}
