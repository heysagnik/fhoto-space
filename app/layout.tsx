import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "FotoSpace",
  description: "Photographer client delivery platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased light`}>
      <body className="min-h-full flex flex-col bg-[#FDFDFD] text-zinc-900">
        {children}
        <Toaster richColors position="bottom-right" theme="light" />
      </body>
    </html>
  )
}
