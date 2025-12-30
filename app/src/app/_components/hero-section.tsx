import type { FC, JSX, ReactNode, CSSProperties } from 'react';
import Link from 'next/link';
import type { HeroSectionProps } from '.';

const ShieldIcon: FC = (): JSX.Element => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const DocumentCheckIcon: FC = (): JSX.Element => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-12M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"
    />
  </svg>
);

type FloatingBadgeProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const FloatingBadge: FC<FloatingBadgeProps> = ({ children, className = '', style }): JSX.Element => (
  <div
    className={`
      absolute flex items-center gap-2 
      rounded-(--radius-lg) bg-(--color-surface) 
      px-4 py-2.5 shadow-(--shadow-lg)
      border border-(--color-border-light)
      animate-float
      ${className}
    `}
    style={style}
  >
    {children}
  </div>
);

export const HeroSection: FC<HeroSectionProps> = ({ title, subtitle, description, primaryButtonText, primaryButtonHref, secondaryButtonText, secondaryButtonHref }): JSX.Element => {
  return (
    <section
      className="
        relative min-h-screen pt-20
        bg-linear-to-br from-(--color-background) via-(--color-surface) to-(--color-background)
        overflow-hidden
      "
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-pattern pointer-events-none" />

      {/* Decorative Gradient Orbs */}
      <div
        className="
          absolute -top-40 -right-40 h-96 w-96 
          rounded-full bg-(--color-primary)/10 
          blur-3xl
        "
      />
      <div
        className="
          absolute -bottom-40 -left-40 h-96 w-96 
          rounded-full bg-(--color-secondary)/10 
          blur-3xl
        "
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center py-20 lg:flex-row lg:gap-16">
          {/* Content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div
              className="
                mb-6 inline-flex items-center gap-2 
                rounded-(--radius-full) 
                bg-(--color-primary)/10 
                px-4 py-1.5
                animate-fade-in-up
              "
            >
              <span className="h-2 w-2 rounded-full bg-(--color-primary) animate-pulse" />
              <span className="text-sm font-medium text-(--color-primary)">{subtitle}</span>
            </div>

            {/* Title */}
            <h1
              className="
                mb-6 text-4xl font-bold leading-tight 
                tracking-tight sm:text-5xl lg:text-6xl
                animate-fade-in-up delay-100
              "
              style={{ opacity: 0, animationFillMode: 'forwards' }}
            >
              {title.split(' ').map(
                (word: string, index: number): JSX.Element =>
                  word === 'Certificados' || word === 'Digitales' ? (
                    <span key={index} className="text-gradient">
                      {word}{' '}
                    </span>
                  ) : (
                    <span key={index}>{word} </span>
                  ),
              )}
            </h1>

            {/* Description */}
            <p
              className="
                mb-8 max-w-xl text-lg leading-relaxed 
                text-(--color-text-secondary)
                mx-auto lg:mx-0
                animate-fade-in-up delay-200
              "
              style={{ opacity: 0, animationFillMode: 'forwards' }}
            >
              {description}
            </p>

            {/* Buttons */}
            <div
              className="
                flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start
                animate-fade-in-up delay-300
              "
              style={{ opacity: 0, animationFillMode: 'forwards' }}
            >
              <Link
                href={primaryButtonHref}
                className="
                  group relative inline-flex items-center justify-center gap-2
                  rounded-(--radius-full) 
                  bg-(--color-primary) 
                  px-8 py-4 
                  text-base font-semibold text-(--color-text-inverse)
                  transition-all duration-(--transition-base)
                  hover:bg-(--color-primary-dark)
                  hover:shadow-xl hover:shadow-(--color-primary)/30
                  active:scale-95
                  overflow-hidden
                "
              >
                <span className="relative z-10">{primaryButtonText}</span>
                <svg className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href={secondaryButtonHref}
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-(--radius-full) 
                  border-2 border-(--color-border)
                  bg-transparent
                  px-8 py-4 
                  text-base font-semibold text-(--color-text-primary)
                  transition-all duration-(--transition-base)
                  hover:border-(--color-primary)
                  hover:text-(--color-primary)
                  hover:bg-(--color-primary)/5
                  active:scale-95
                "
              >
                {secondaryButtonText}
              </Link>
            </div>
          </div>

          {/* Illustration */}
          <div
            className="
              relative mt-16 flex-1 lg:mt-0
              animate-fade-in-up delay-400
            "
            style={{ opacity: 0, animationFillMode: 'forwards' }}
          >
            {/* Main Card */}
            <div
              className="
                relative mx-auto w-full max-w-md
                rounded-(--radius-xl) 
                bg-(--color-surface)
                p-8
                shadow-(--shadow-xl)
                border border-(--color-border-light)
              "
            >
              {/* Certificate Preview */}
              <div className="flex flex-col items-center text-center">
                <div
                  className="
                    mb-6 flex h-20 w-20 items-center justify-center
                    rounded-full bg-linear-to-br 
                    from-(--color-primary) to-(--color-primary-dark)
                    text-(--color-text-inverse)
                  "
                >
                  <div className="h-10 w-10">
                    <DocumentCheckIcon />
                  </div>
                </div>
                <div className="mb-2 h-3 w-32 rounded-full bg-(--color-surface-elevated)" />
                <div className="mb-4 h-2 w-48 rounded-full bg-(--color-surface-elevated)" />
                <div className="grid w-full grid-cols-2 gap-3">
                  <div className="h-8 rounded-(--radius-md) bg-(--color-surface-elevated)" />
                  <div className="h-8 rounded-(--radius-md) bg-(--color-surface-elevated)" />
                </div>
                <div className="mt-6 flex w-full items-center justify-between border-t border-(--color-border-light) pt-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-600">Verificado</span>
                  </div>
                  <div className="text-xs text-(--color-text-muted)">Firma Digital Válida</div>
                </div>
              </div>
            </div>

            {/* Floating Badges */}
            <FloatingBadge className="-left-8 top-1/4 hidden lg:flex">
              <div className="h-8 w-8 text-(--color-primary)">
                <ShieldIcon />
              </div>
              <div>
                <p className="text-xs font-semibold text-(--color-text-primary)">Firma Digital</p>
                <p className="text-xs text-(--color-text-muted)">PKI Certificado</p>
              </div>
            </FloatingBadge>

            <FloatingBadge className="-right-4 bottom-1/4 hidden lg:flex" style={{ animationDelay: '1s' }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-(--color-text-primary)">100% Legal</p>
                <p className="text-xs text-(--color-text-muted)">Validez Jurídica</p>
              </div>
            </FloatingBadge>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div
          className="
            flex h-10 w-6 items-start justify-center 
            rounded-full border-2 border-(--color-border) 
            p-1.5
          "
        >
          <div
            className="
              h-2 w-1 rounded-full bg-(--color-primary)
              animate-bounce
            "
          />
        </div>
      </div>
    </section>
  );
};
