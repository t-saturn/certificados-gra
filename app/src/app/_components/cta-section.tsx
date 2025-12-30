import type { FC } from 'react';
import Link from 'next/link';
import type { CtaSectionProps } from '@/types/landing.types';

export const CtaSection: FC<CtaSectionProps> = ({ title, description, buttonText, buttonHref }) => {
  return (
    <section className="relative py-24 bg-muted/50 overflow-hidden">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl bg-primary p-12 sm:p-16 text-center overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>

            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: 'var(--font-montserrat)' }}>
              {title}
            </h2>

            <p className="mx-auto mb-8 max-w-xl text-lg text-white/80 leading-relaxed">{description}</p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href={buttonHref}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-primary transition-all duration-200 hover:bg-white/90 hover:shadow-xl active:scale-95"
                prefetch={false}
              >
                {buttonText}
                <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href="/verify"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-white/10 hover:border-white/50 active:scale-95"
                prefetch={false}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Verificar Certificado
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
