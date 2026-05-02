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
/** Open Graph image — PNG in /public; publicly accessible without auth. */
const ogImageAbsoluteUrl = `${siteOrigin}/og-cv-tool-v3.png`

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
        url: ogImageAbsoluteUrl,
        secureUrl: ogImageAbsoluteUrl,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Your Personalised CV Tool — CV layouts preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description: socialDescription,
    images: [ogImageAbsoluteUrl],
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
