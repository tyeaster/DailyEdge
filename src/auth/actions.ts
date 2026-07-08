"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
} from "./session";

const DEFAULT_ADMIN_PATH = "/admin/backtesting";

function resolveRedirectTarget(value: FormDataEntryValue | null): string {
  return typeof value === "string" && value.startsWith("/admin") && value !== "/admin/login"
    ? value
    : DEFAULT_ADMIN_PATH;
}

export async function loginAdmin(formData: FormData): Promise<void> {
  const password = formData.get("password");
  const redirectTo = resolveRedirectTarget(formData.get("from"));
  const matches =
    typeof password === "string" &&
    Boolean(process.env.ADMIN_PASSWORD) &&
    password === process.env.ADMIN_PASSWORD;

  if (!matches) {
    redirect(`/admin/login?error=1&from=${encodeURIComponent(redirectTo)}`);
  }

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(redirectTo);
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
