import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// to use session in client mode
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/src/auth'

import { Toaster } from "@/src/components/ui/sonner"


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Radhe Beutic',
  description: 'Unlock your destiny with ACD Referrals',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();
  return (
    <SessionProvider session={session}>

      <html lang="en">
        <body className={inter.className}>
          <Toaster />
          {children}
        </body>
      </html>
    </SessionProvider>
  )
}
