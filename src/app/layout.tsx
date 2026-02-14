import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/components/theme/theme-provider';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'Campus2Career — Where Talent Meets Opportunity',
  description:
    'From Campus to Career — a multi-tenant marketplace connecting students with corporations for paid, real-world project work. Real Projects, Real Impact.',
  openGraph: {
    title: 'Campus2Career — Where Talent Meets Opportunity',
    description: 'From Campus to Career — Real Projects, Real Impact. Connect students with corporations for paid project work.',
    siteName: 'Campus2Career',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${playfair.variable}`}>
      <body className={dmSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
