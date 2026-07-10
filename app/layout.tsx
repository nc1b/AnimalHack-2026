import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PawFinder — Bring Every Lost Pet Home",
  description:
    "PawFinder turns scattered sightings into one live map. Report a lost or found animal in a minute and let our matcher reunite them faster. Built for AnimalHack 2026.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%90%BE%3C/text%3E%3C/svg%3E",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
