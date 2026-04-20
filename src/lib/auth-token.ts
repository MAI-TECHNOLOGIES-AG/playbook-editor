/** Cookie stores a deterministic token derived from AUTH_PASSWORD (not the password itself). */
export const AUTH_COOKIE_NAME = "playbook_editor_auth";

const SESSION_SALT = "playbook-editor.session.v1";

export async function authSessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${SESSION_SALT}|${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function isAuthEnabled(): boolean {
  return Boolean(process.env.AUTH_PASSWORD?.length);
}
