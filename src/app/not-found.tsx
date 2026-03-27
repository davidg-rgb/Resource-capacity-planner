import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface">
      <h1 className="font-headline text-6xl font-bold text-on-surface">404</h1>
      <p className="mt-4 text-lg text-on-surface-variant">Page not found</p>
      <Link
        href="/input"
        className="mt-8 rounded-lg bg-primary px-6 py-3 text-on-primary font-medium hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
