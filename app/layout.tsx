import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const siteUrl = "https://tool.cv-by-design.com"
/** Bump when changing OG artwork so Meta/WhatsApp refetch (they cache image URL + preview aggressively). */
const OG_IMAGE_CACHE_VERSION = "3"
/** Absolute URL — query is ignored for static files but changes og:image string so crawlers treat it as new. */
const ogImageUrl = `${siteUrl}/og-cv-tool-v2.png?v=${OG_IMAGE_CACHE_VERSION}`

/** HTML `<title>` + default SEO description (browser tab / search snippets). */
const pageTitle = "Your Personalised CV Tool — Create a CV in minutes"
const pageDescription =
  "AI-powered CV builder with personalised guidance and coaching. Create faster, more effective CVs tailored for every role."

/** Open Graph / Twitter card title & description (sharing previews). */
const socialTitle = "Personalised AI CV Tool"
const socialDescription = "Create faster, more effective CVs — tailored for every role"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: pageTitle,
  description: pageDescription,
  generator: "v0.app",
  openGraph: {
    title: socialTitle,
    description: socialDescription,
    url: siteUrl,
    siteName: "CV by Design",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: ogImageUrl,
        secureUrl: ogImageUrl,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Personalised AI CV Tool — minimal CV card layouts",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description: socialDescription,
    images: [ogImageUrl],
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.jpg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.jpg",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.jpg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
