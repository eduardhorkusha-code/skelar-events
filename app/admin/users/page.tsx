"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  role: string;
  created_at: string;
};

const STATUS_TABS = ["pending", "approved", "blocked"] as const;

export default function AdminUsersPage() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>("pending");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  async function fetchUsers(status: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/users?status=${status}`);
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => { fetchUsers(tab); }, [tab]);

  async function handleAction(userId: string, action: "approve" | "block" | "pending") {
    setActionId(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const data = await res.json();
    setActionId(null);
    if (data.ok) {
      setToast({ msg: `User ${action}d successfully`, ok: true });
      fetchUsers(tab);
    } else {
      setToast({ msg: data.error || "Failed", ok: false });
    }
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${toast.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === s
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-gray-400 text-sm">No {tab} users.</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 gap-4">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{u.full_name || "—"}</div>
                <div className="text-gray-500 text-xs truncate">{u.email}</div>
                <div className="text-gray-400 text-xs mt-0.5">
                  {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {tab === "pending" && (
                  <>
                    <button
                      onClick={() => handleAction(u.id, "approve")}
                      disabled={actionId === u.id}
                      className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(u.id, "block")}
                      disabled={actionId === u.id}
                      className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      Block
                    </button>
                  </>
                )}
                {tab === "approved" && (
                  <button
                    onClick={() => handleAction(u.id, "block")}
                    disabled={actionId === u.id}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Block
                  </button>
                )}
                {tab === "blocked" && (
                  <button
                    onClick={() => handleAction(u.id, "approve")}
                    disabled={actionId === u.id}
                    className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Unblock
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
