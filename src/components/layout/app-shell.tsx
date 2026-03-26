import { TopNav } from './top-nav';
import { SideNav } from './side-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <TopNav />
      <SideNav />
      <main className="ml-64 p-8">
        <div className="mx-auto max-w-[1440px]">
          {children}
        </div>
      </main>
    </div>
  );
}
