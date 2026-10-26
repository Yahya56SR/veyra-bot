import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card card-pad w-full max-w-lg text-center">
        <p className="label text-violet-300">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">That page does not exist</h1>
        <p className="muted mt-3">
          The control room only has a handful of rooms. Head back to the overview.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Return to overview
        </Link>
      </div>
    </main>
  );
}
