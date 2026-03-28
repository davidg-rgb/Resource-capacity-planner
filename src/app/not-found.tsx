import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="bg-surface flex min-h-screen flex-col items-center justify-center">
      <h1 className="font-headline text-on-surface text-6xl font-bold">404</h1>
      <p className="text-on-surface-variant mt-4 text-lg">Page not found</p>
      <Link
        href="/input"
        className="bg-primary text-on-primary hover:bg-primary/90 mt-8 rounded-lg px-6 py-3 font-medium"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
