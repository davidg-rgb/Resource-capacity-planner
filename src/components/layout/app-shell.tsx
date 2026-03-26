export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
