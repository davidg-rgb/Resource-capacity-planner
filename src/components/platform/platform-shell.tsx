'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { PlatformSidebar } from './platform-sidebar';

interface AdminIdentity {
  adminId: string;
  email: string;
  name: string;
}

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/platform/auth/me');
      if (!res.ok) {
        router.push('/platform/login');
        return;
      }
      const data = await res.json();
      setAdmin(data);
    } catch {
      router.push('/platform/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <PlatformSidebar adminName={admin.name} adminEmail={admin.email} />
      <main className="ml-60 p-6">{children}</main>
    </div>
  );
}
