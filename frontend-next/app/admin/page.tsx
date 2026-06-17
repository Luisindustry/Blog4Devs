import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoleManager, type AdminUser } from "@/components/role-manager";
import { fetchBackend } from "@/lib/backend";
import { getSession, getSessionToken } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
};

async function fetchUsers(token: string): Promise<AdminUser[]> {
  try {
    const res = await fetchBackend("/users/", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const [session, token] = await Promise.all([getSession(), getSessionToken()]);
  // Middleware already gates the cookie; here we enforce the admin role.
  if (!session || session.role !== "admin" || !token) redirect("/");

  const users = await fetchUsers(token);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-28">
      <section className="border-b border-border pb-8 pt-8">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          admin
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Gestión de roles
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {users.length} usuarios · senior y admin pueden moderar
        </p>
      </section>

      <RoleManager users={users} currentUsername={session.username} />
    </main>
  );
}
