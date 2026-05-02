import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"

/**
 * Public landing — no auth. Crawlers get HTTP 200 + Open Graph from root layout.
 * Password-protected tool: `/app` (see app/app/page.tsx).
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12 md:py-16">
      <Card className="w-full max-w-2xl border border-border/80 bg-card shadow-xl">
        <CardHeader className="space-y-2 pb-2 text-center sm:space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            CV by Design
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your Personalised CV Tool
          </h1>
          <CardDescription className="text-base text-foreground/85 sm:text-lg">
            Create faster, more effective CVs — tailored for every role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-2">
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            AI-powered CV builder with personalised guidance and coaching.
          </p>

          <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm">
            {/* Plain /public URL — same file as og:image; avoids Image optimizer edge cases on deploy */}
            <img
              src="/og-cv-tool-v3.png"
              alt=""
              width={1200}
              height={630}
              decoding="async"
              fetchPriority="high"
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button asChild size="lg" className="min-h-11 min-w-[min(100%,280px)] px-8 text-base">
              <Link href="/app">Start building your CV</Link>
            </Button>
            <p className="text-xs text-muted-foreground">Password required</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center border-t border-border/60 pt-6 pb-6">
          <p className="text-center text-sm text-muted-foreground">
            Contact and more information:{" "}
            <a
              href="https://cv-by-design.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
            >
              cv-by-design.com
            </a>
          </p>
        </CardFooter>
      </Card>
    </main>
  )
}
