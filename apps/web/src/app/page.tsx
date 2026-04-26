import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-6xl font-bold tracking-tight mb-4">Fitte</h1>
      <p className="text-gray-400 text-xl mb-10 text-center max-w-md">
        Your AI personal stylist. Maximize your wardrobe, build better outfits.
      </p>
      <div className="flex gap-4">
        <Link
          href="/sign-in"
          className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="border border-gray-700 text-white font-semibold px-6 py-3 rounded-xl hover:border-gray-500 transition"
        >
          Create Account
        </Link>
      </div>
    </main>
  );
}
