'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface UserResult {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  createdAt: number;
  lastSignInAt: number | null;
  memberships: Array<{ orgName: string; orgSlug: string; role: string }>;
}

export default function UsersPage() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal states
  const [resetTarget, setResetTarget] = useState<UserResult | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [logoutTarget, setLogoutTarget] = useState<UserResult | null>(null);

  // Action feedback
  const [actionLoading, setActionLoading] = useState(false);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUsers([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/users?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setUsers(data);
      setSearched(true);
    } catch {
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchUsers(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchUsers]);

  async function handleResetPassword(generateTemporary = false) {
    if (!resetTarget) return;
    if (!generateTemporary && newPassword.length < 8) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/platform/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateTemporary ? { generateTemporary: true } : { newPassword }),
      });
      if (!res.ok) throw new Error('Reset failed');
      const data = await res.json();
      if (data.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
      } else {
        toast.success(`Password reset for ${resetTarget.email ?? resetTarget.id}`);
        setResetTarget(null);
        setNewPassword('');
      }
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleForceLogout() {
    if (!logoutTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/platform/users/${logoutTarget.id}/force-logout`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Logout failed');
      const data = await res.json();
      toast.success(
        `Revoked ${data.revokedCount} session(s) for ${logoutTarget.email ?? logoutTarget.id}`,
      );
      setLogoutTarget(null);
    } catch {
      toast.error('Failed to force logout');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-headline mb-6 text-2xl font-semibold text-slate-900">Users</h1>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users across all organizations..."
          className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
        />
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      ) : !searched ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Search for users by name or email
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No users found for &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Organization</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Created</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Last Sign-in</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">
                    {user.email ?? 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-800">
                    {user.memberships && user.memberships.length > 0 ? (
                      user.memberships.map((m) => m.orgName).join(', ')
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-800">
                    {user.memberships && user.memberships.length > 0 ? (
                      user.memberships.map((m) => m.role.replace('org:', '')).join(', ')
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setResetTarget(user);
                          setGeneratedPassword('');
                        }}
                        className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        Set Temp Password
                      </button>
                      <button
                        onClick={() => setLogoutTarget(user)}
                        className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Force Logout
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">Set Temporary Password</h3>
            <p className="mb-4 text-sm text-slate-500">For {resetTarget.email ?? resetTarget.id}</p>
            {generatedPassword ? (
              <div>
                <p className="mb-2 text-sm text-slate-700">
                  Temporary password generated. Share this with the user and instruct them to change
                  it on next login:
                </p>
                <div className="mb-4 rounded border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm select-all">
                  {generatedPassword}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setResetTarget(null);
                      setNewPassword('');
                      setGeneratedPassword('');
                    }}
                    className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <button
                    onClick={() => handleResetPassword(true)}
                    disabled={actionLoading}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Generating...' : 'Generate Temporary Password'}
                  </button>
                </div>
                <div className="relative mb-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-slate-400">or set manually</span>
                  </div>
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                  className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setResetTarget(null);
                      setNewPassword('');
                      setGeneratedPassword('');
                    }}
                    className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResetPassword(false)}
                    disabled={actionLoading || newPassword.length < 8}
                    className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    {actionLoading ? 'Setting...' : 'Set Password'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Force Logout Confirm Dialog */}
      {logoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold text-slate-900">Force Logout</h3>
            <p className="mb-4 text-sm text-slate-500">
              Revoke all active sessions for {logoutTarget.email ?? logoutTarget.id}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setLogoutTarget(null)}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleForceLogout}
                disabled={actionLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Revoking...' : 'Confirm Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
