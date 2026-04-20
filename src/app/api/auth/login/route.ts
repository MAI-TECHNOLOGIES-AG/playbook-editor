import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authSessionToken,
  isAuthEnabled,
} from "@/lib/auth-token";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const password = process.env.AUTH_PASSWORD;
  if (!isAuthEnabled() || !password) {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { password?: unknown }).password !== "string"
  ) {
    return NextResponse.json({ error: "Missing password." }, { status: 400 });
  }

  const submitted = (body as { password: string }).password;
  if (submitted !== password) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await authSessionToken(password);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
