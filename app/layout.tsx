import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const siteUrl = "https://tool.cv-by-design.com"
/** Bump when replacing og-image.* so Meta/WhatsApp treat it as a new URL and refetch (preview cache is very sticky). */
const OG_IMAGE_CACHE_VERSION = "20260202"
/** Absolute URL — some crawlers ignore metadataBase-resolved paths and fall back to favicon. */
const ogImageUrl = `${siteUrl}/og-image.jpg?v=${OG_IMAGE_CACHE_VERSION}`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CV by Design — Build a CV that gets interviews",
  description:
    "Create a professional, tailored CV with AI. Designed to help you stand out and get interviews.",
  generator: "v0.app",
  openGraph: {
    title: "CV by Design — Build a CV that gets interviews",
    description:
      "Create a professional, tailored CV with AI. Designed to help you stand out and get interviews.",
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
        type: "image/jpeg",
        alt: "CV by Design — stacked CV pages in a fan layout",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CV by Design — Build a CV that gets interviews",
    description: "Create a professional, tailored CV with AI.",
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
