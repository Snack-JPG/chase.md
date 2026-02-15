export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <div className="text-center space-y-6 max-w-2xl px-6">
        <h1 className="text-5xl font-bold tracking-tight">
          chase<span className="text-blue-400">.md</span>
        </h1>
        <p className="text-xl text-gray-400">
          AI-powered document chasing for accountancy practices.
          Get your clients to send their stuff — automatically.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <a
            href="/sign-up"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition"
          >
            Start Free Trial
          </a>
          <a
            href="#demo"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition"
          >
            See Demo
          </a>
        </div>
        <p className="text-sm text-gray-600 pt-8">
          MTD ITSA is 49 days away. Your chasing burden is about to 4x.
        </p>
      </div>
    </main>
  );
}
