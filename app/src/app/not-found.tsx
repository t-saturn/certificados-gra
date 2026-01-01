import type { FC, JSX } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  description: 'La página que buscas no existe o ha sido movida.',
};

const NotFoundPage: FC = (): JSX.Element => {
  return (
    <main className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center">
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-chart-2/10 blur-3xl" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-150 w-150 rounded-full bg-primary/3 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-6">
          <span className="text-[10rem] sm:text-[14rem] lg:text-[18rem] font-bold text-primary select-none leading-none block" style={{ fontFamily: 'var(--font-montserrat)' }}>
            404
          </span>
        </div>

        <h1 className="mb-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground" style={{ fontFamily: 'var(--font-montserrat)' }}>
          Página no encontrada
        </h1>

        <p className="mb-8 text-lg text-muted-foreground max-w-md mx-auto">Lo sentimos, la página que buscas no existe, ha sido movida o no tienes permisos para acceder a ella.</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-xl active:scale-95"
            prefetch={false}
          >
            <svg className="h-5 w-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>

          <Link
            href="/verify"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-border bg-transparent px-8 py-4 text-base font-semibold text-foreground transition-all duration-200 hover:border-primary hover:text-primary hover:bg-primary/5 active:scale-95"
            prefetch={false}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Verificar certificado
          </Link>
        </div>

        <div className="p-2" />
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">¿Necesitas ayuda? Contáctanos:</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="mailto:certificaciones@regionayacucho.gob.pe" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              certificaciones@regionayacucho.gob.pe
            </a>
            <a href="tel:+5166312456" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                />
              </svg>
              (066) 312-456
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NotFoundPage;
