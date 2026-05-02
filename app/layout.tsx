import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const siteOrigin = "https://tool.cv-by-design.com"
/** Canonical URL for sharing (trailing slash matches og:url). */
const canonicalSiteUrl = `${siteOrigin}/`
/**
 * Share image for Facebook/WhatsApp — JPEG (~90KB) so Meta’s crawler reliably fetches it.
 * Large PNGs often fail silently → platforms fall back to the favicon. PNG stays in /public for other uses.
 */
const OG_SHARE_IMAGE = "https://tool.cv-by-design.com/og-cv-tool-v3.jpg?v=1"

/** HTML `<title>` + primary SEO description. */
const pageTitle = "Your Personalised CV Tool — Create a CV in minutes"
const pageDescription =
  "Create faster, more effective CVs with personalised AI guidance and coaching."

/** Open Graph / Twitter card — preview title matches task (same as page title). */
const socialTitle = "Your Personalised CV Tool — Create a CV in minutes"
const socialDescription = "Create faster, more effective CVs — tailored for every role"

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: pageTitle,
  description: pageDescription,
  generator: "v0.app",
  openGraph: {
    title: socialTitle,
    description: socialDescription,
    url: canonicalSiteUrl,
    siteName: "CV by Design",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: OG_SHARE_IMAGE,
        secureUrl: OG_SHARE_IMAGE,
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Your Personalised CV Tool — CV layouts preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description: socialDescription,
    images: [
      {
        url: OG_SHARE_IMAGE,
        width: 1200,
        height: 630,
        alt: "Your Personalised CV Tool — CV layouts preview",
      },
    ],
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
