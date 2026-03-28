/**
 * Login page layout - renders WITHOUT the platform shell.
 * Overrides the (platform) group layout so the login page
 * doesn't show the sidebar or require authentication.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">{children}</div>
  );
}
