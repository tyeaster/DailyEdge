import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { logoutAdmin } from "@/src/auth/actions";
import { ADMIN_SESSION_COOKIE_NAME, isValidAdminSessionToken } from "@/src/auth/session";

/**
 * Defense-in-depth: proxy.ts already gates every /admin/* request before
 * rendering starts, but this checks the same session again at render time
 * so a future matcher change in proxy.ts can't silently remove protection
 * (see Next.js's own guidance on this in the proxy.js file-convention docs).
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!isValidAdminSessionToken(sessionToken)) {
    redirect("/admin/login");
  }

  return (
    <div>
      <div className="flex justify-end border-b border-white/10 bg-[#030812] px-4 py-2">
        <form action={logoutAdmin}>
          <button
            className="text-xs text-slate-400 transition hover:text-white"
            type="submit"
          >
            Log out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
