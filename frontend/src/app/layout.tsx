import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Navbar from "@/components/Navbar"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Eliteserien DSS",
  description: "Decision Support System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-bg0 to-bg1 pt-4">
          {children}
        </main>
      </body>
    </html>
  )
}
