import type { FC, ReactNode, JSX } from 'react';
import type { Metadata, Viewport } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';

// Font Configuration

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Metadata Configuration

export const metadata: Metadata = {
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
  },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: 'https://certificaciones.regionayacucho.gob.pe',
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
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#8B1538' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

// Layout Props Type

type RootLayoutProps = {
  children: ReactNode;
};

// Root Layout Component

const RootLayout: FC<RootLayoutProps> = ({ children }): JSX.Element => {
  return (
    <html lang="es-PE" className={`${dmSans.variable} ${playfairDisplay.variable}`} suppressHydrationWarning>
      <body
        className="          min-h-screen          bg-background          font-sans          text-text-primary          antialiased        "
        style={{
          fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
