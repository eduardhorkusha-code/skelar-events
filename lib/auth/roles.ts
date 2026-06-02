/**
 * lib/auth/roles.ts
 * Role checks for skelar-events.
 * Scope is always 'events' (or 'global' for platform admins).
 * No legacy profiles.role fallback.
 */

import { createClient } from "@supabase/supabase-js";

// Inline role hierarchy — kept in sync with packages/supabase/src/roles.ts in skelar-vault.
// Add new roles at decimal positions (e.g. analyst: 1.5) without a DB migration.
const ROLE_RANK: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };

function roleAtLeast(userRole: string, minRole: string): boolean {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 1);
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Returns true if the user has at least minRole in the 'events' scope (or 'global').
 * Only rows with status='active' are considered.
 */
export async function hasRole(
  userId: string,
  minRole: "viewer" | "editor" | "admin" = "viewer"
): Promise<boolean> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", userId)
    .in("scope", ["global", "events"])
    .eq("status", "active");

  if (error) {
    console.error("[hasRole:events] query error:", error.message);
    return false;
  }

  if (!data || data.length === 0) return false;
  return data.some(r => roleAtLeast(r.role, minRole));
}

export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, "admin");
}

export async function canEdit(userId: string): Promise<boolean> {
  return hasRole(userId, "editor");
}
