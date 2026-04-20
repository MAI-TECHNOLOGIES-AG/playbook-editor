import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-foreground/15 bg-background/80 p-8 shadow-sm backdrop-blur-sm">
        <h1 className="mb-6 text-center text-lg font-semibold tracking-tight">
          Login to the Playbook Editor
        </h1>
        <Suspense
          fallback={<p className="text-center text-sm opacity-70">Loading…</p>}
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
