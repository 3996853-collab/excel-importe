import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Universal Excel Importer",
  description: "Advanced Excel import system with real-time validation and template memory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-8">
                  <Link href="/" className="flex items-center space-x-2">
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      Excel Importer
                    </span>
                  </Link>
                  <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <Link href="/" className="transition-colors hover:text-primary">数据导入</Link>
                    <Link href="/history" className="transition-colors hover:text-primary">已导入运单</Link>
                  </nav>
                </div>
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
