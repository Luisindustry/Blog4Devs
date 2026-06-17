"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setUserRole } from "@/app/actions";
import type { UserRole } from "@/types/api";

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
};

const ROLES: UserRole[] = ["junior", "senior", "admin"];

export function RoleManager({
  users,
  currentUsername,
}: {
  users: AdminUser[];
  currentUsername: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [roles, setRoles] = useState<Record<string, UserRole>>(() =>
    Object.fromEntries(users.map((u) => [u.username, u.role])),
  );

  function handleChange(username: string, role: UserRole) {
    const previous = roles[username];
    setRoles((r) => ({ ...r, [username]: role }));

    startTransition(async () => {
      try {
        await setUserRole(username, role);
        toast.success(`@${username} ahora es ${role}`);
      } catch (err) {
        setRoles((r) => ({ ...r, [username]: previous }));
        toast.error(err instanceof Error ? err.message : "Error al cambiar el rol");
      }
    });
  }

  return (
    <ul className="mt-6">
      {users.map((u) => (
        <li
          key={u.id}
          className="flex items-center justify-between gap-4 border-b border-border px-1 py-3"
        >
          <div className="min-w-0">
            <span className="font-mono text-sm text-foreground">@{u.username}</span>
            {u.username === currentUsername && (
              <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                (tú)
              </span>
            )}
            <span className="block truncate font-mono text-[11px] text-muted-foreground/60">
              {u.email}
            </span>
          </div>
          <select
            value={roles[u.username]}
            disabled={isPending || u.username === currentUsername}
            onChange={(e) => handleChange(u.username, e.target.value as UserRole)}
            className="rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground disabled:opacity-40"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}
