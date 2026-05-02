import Link from "next/link"

/**
 * Public entry (no client password gate). Crawlers and Facebook’s debugger get stable HTML + root layout metadata.
 * The protected tool lives at /app.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-16 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CV by Design</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl max-w-xl">
        Personalised AI CV Tool
      </h1>
      <p className="mt-4 text-sm text-gray-600 max-w-md leading-relaxed">
        Create faster, more effective CVs — tailored for every role
      </p>
      <Link
        href="/app"
        className="mt-10 inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Open CV tool
      </Link>
      <p className="mt-10 text-xs text-gray-500">
        More information:{" "}
        <a
          href="https://cv-by-design.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          cv-by-design.com
        </a>
      </p>
    </main>
  )
}
