import type { FC, JSX } from 'react';
import type { ProcessSectionProps, ProcessStep } from '.';

const ProcessStepCard: FC<{ step: ProcessStep; isLast: boolean }> = ({ step, isLast }): JSX.Element => {
  return (
    <div className="relative flex flex-col items-center">
      {/* Connector Line */}
      {!isLast && (
        <div
          className="
            absolute left-1/2 top-16 
            hidden h-full w-0.5 
            -translate-x-1/2
            bg-linear-to-b from-(--color-primary) to-(--color-border)
            lg:block
          "
          style={{ height: 'calc(100% + 2rem)' }}
        />
      )}

      {/* Step Number Badge */}
      <div
        className="
          relative z-10 mb-6
          flex h-16 w-16 items-center justify-center
          rounded-full
          bg-linear-to-br from-(--color-primary) to-(--color-primary-dark)
          text-2xl font-bold text-(--color-text-inverse)
          shadow-lg shadow-(--color-primary)/30
          ring-4 ring-(--color-surface)
        "
      >
        {step.stepNumber}
      </div>

      {/* Card */}
      <div
        className="
          w-full max-w-xs
          rounded-(--radius-xl)
          bg-(--color-surface)
          p-6
          border border-(--color-border-light)
          shadow-(--shadow-md)
          transition-all duration-(--transition-base)
          hover:shadow-(--shadow-lg)
          hover:border-(--color-primary)/30
        "
      >
        {/* Icon */}
        <div
          className="
            mb-4 flex h-12 w-12 items-center justify-center
            rounded-(--radius-lg)
            bg-(--color-surface-elevated)
            text-(--color-primary)
          "
        >
          <div className="h-6 w-6">{step.icon}</div>
        </div>

        {/* Content */}
        <h3
          className="
            mb-2 text-lg font-bold
            text-(--color-text-primary)
          "
        >
          {step.title}
        </h3>
        <p className="text-sm text-(--color-text-secondary) leading-relaxed">{step.description}</p>
      </div>
    </div>
  );
};

export const ProcessSection: FC<ProcessSectionProps> = ({ title, subtitle, steps }): JSX.Element => {
  return (
    <section
      id="proceso"
      className="
        relative py-24
        bg-(--color-background)
        overflow-hidden
      "
    >
      {/* Background Decorations */}
      <div
        className="
          absolute top-20 left-10 h-64 w-64
          rounded-full
          bg-(--color-primary)/5
          blur-3xl
        "
      />
      <div
        className="
          absolute bottom-20 right-10 h-64 w-64
          rounded-full
          bg-(--color-secondary)/5
          blur-3xl
        "
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span
            className="
              mb-4 inline-block text-sm font-semibold uppercase tracking-wider
              text-(--color-secondary-dark)
            "
          >
            {subtitle}
          </span>
          <h2
            className="
              mb-6 text-3xl font-bold 
              tracking-tight sm:text-4xl lg:text-5xl
              text-(--color-text-primary)
            "
          >
            {title}
          </h2>
          <p className="text-lg text-(--color-text-secondary)">Obtén tu certificado digital en simples pasos, de manera segura y eficiente.</p>
        </div>

        {/* Process Steps - Desktop */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Horizontal Connector */}
            <div
              className="
                absolute top-8 left-[10%] right-[10%]
                h-0.5
                bg-linear-to-r from-transparent via-(--color-border) to-transparent
              "
            />

            {/* Steps Grid */}
            <div className="grid grid-cols-4 gap-8">
              {steps.map(
                (step: ProcessStep, index: number): JSX.Element => (
                  <ProcessStepCard key={step.id} step={step} isLast={index === steps.length - 1} />
                ),
              )}
            </div>
          </div>
        </div>

        {/* Process Steps - Mobile */}
        <div className="lg:hidden">
          <div className="relative space-y-8">
            {/* Vertical Connector */}
            <div
              className="
                absolute left-8 top-0 bottom-0
                w-0.5
                bg-linear-to-b from-(--color-primary) via-(--color-border) to-transparent
              "
            />

            {steps.map(
              (step: ProcessStep): JSX.Element => (
                <div key={step.id} className="relative flex gap-6 pl-4">
                  {/* Step Number */}
                  <div
                    className="
                      relative z-10 shrink-0
                      flex h-10 w-10 items-center justify-center
                      rounded-full
                      bg-(--color-primary)
                      text-sm font-bold text-(--color-text-inverse)
                      shadow-md
                    "
                  >
                    {step.stepNumber}
                  </div>

                  {/* Content */}
                  <div
                    className="
                      flex-1 pb-8
                      rounded-(--radius-lg)
                      bg-(--color-surface)
                      p-4
                      border border-(--color-border-light)
                    "
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="h-5 w-5 text-primary">{step.icon}</div>
                      <h3 className="font-bold text-text-primary">{step.title}</h3>
                    </div>
                    <p className="text-sm text-(--color-text-secondary)">{step.description}</p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
