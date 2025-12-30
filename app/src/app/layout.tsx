import type { FC, ReactNode, JSX } from 'react';
import type { Metadata, Viewport } from 'next';
import { Poppins, Montserrat } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.css';

// Font Configuration

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

// Metadata Configuration

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://certificaciones.regionayacucho.gob.pe'),
  title: {
    default: 'Sistema de Certificaciones Digitales | Gobierno Regional de Ayacucho',
    template: '%s | GRA Certificaciones',
  },
  description: 'Plataforma oficial del Gobierno Regional de Ayacucho para la emisión, gestión y verificación de certificados con firma digital. Seguro, rápido y con validez legal.',
  keywords: ['certificados digitales', 'firma digital', 'gobierno regional ayacucho', 'certificaciones', 'documentos oficiales', 'trámites en línea', 'perú'],
  authors: [{ name: 'Gobierno Regional de Ayacucho' }],
  creator: 'Gobierno Regional de Ayacucho',
  publisher: 'Gobierno Regional de Ayacucho',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: '/',
    siteName: 'GRA Certificaciones Digitales',
    title: 'Sistema de Certificaciones Digitales | Gobierno Regional de Ayacucho',
    description: 'Emite, gestiona y verifica certificados con firma digital de manera segura y con validez legal.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sistema de Certificaciones Digitales - Gobierno Regional de Ayacucho',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sistema de Certificaciones Digitales | GRA',
    description: 'Plataforma oficial para la emisión y verificación de certificados digitales.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/img/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/img/icon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/img/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#d20f39' },
    { media: '(prefers-color-scheme: dark)', color: '#252429' },
  ],
};

// Layout Props Type

type RootLayoutProps = {
  children: ReactNode;
};

// Root Layout Component

const RootLayout: FC<RootLayoutProps> = ({ children }): JSX.Element => {
  return (
    <html lang="es-PE" className={`${poppins.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
