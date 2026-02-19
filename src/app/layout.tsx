import type { Metadata } from 'next';
import { DM_Sans, Playfair_Display, Bebas_Neue } from 'next/font/google';
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

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
});

export const metadata: Metadata = {
  title: 'Proveground — Where Talent Is Proven',
  description:
    'Proveground connects high-performing students with alumni and corporate partners through real internships and project work.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://proveground.com'),
  openGraph: {
    title: 'Proveground — Where Talent Is Proven',
    description: 'Where talent is proven, not presumed. Real internships, real projects, real reputation.',
    siteName: 'Proveground',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Proveground — Where Talent Is Proven',
    description: 'Where talent is proven, not presumed.',
  },
  other: {
    'theme-color': '#1a1a2e',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${playfair.variable} ${bebasNeue.variable}`}>
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
