'use client';

import type { FC, JSX } from 'react';
import type { FeaturesSectionProps, FeatureItem } from '.';

const FeatureCard: FC<{ feature: FeatureItem; index: number }> = ({ feature, index }): JSX.Element => {
  return (
    <article
      className="
        group relative
        rounded-(--radius-xl) 
        bg-(--color-surface)
        p-8
        border border-(--color-border-light)
        transition-all duration-(--transition-slow)
        hover:border-(--color-primary)/30
        hover:shadow-(--shadow-xl)
        hover:-translate-y-1
      "
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Icon Container */}
      <div
        className="
          mb-6 flex h-14 w-14 items-center justify-center
          rounded-(--radius-lg)
          bg-linear-to-br from-(--color-primary)/10 to-(--color-secondary)/10
          text-(--color-primary)
          transition-all duration-(--transition-base)
          group-hover:scale-110
          group-hover:bg-linear-to-br 
          group-hover:from-(--color-primary) 
          group-hover:to-(--color-primary-dark)
          group-hover:text-(--color-text-inverse)
        "
      >
        <div className="h-7 w-7">{feature.icon}</div>
      </div>

      {/* Content */}
      <h3
        className="
          mb-3 text-xl font-bold
          text-(--color-text-primary)
          transition-colors duration-(--transition-base)
          group-hover:text-(--color-primary)
        "
      >
        {feature.title}
      </h3>
      <p className="text-(--color-text-secondary) leading-relaxed">{feature.description}</p>

      {/* Decorative Corner */}
      <div
        className="
          absolute top-0 right-0 h-20 w-20
          opacity-0 transition-opacity duration-(--transition-base)
          group-hover:opacity-100
        "
      >
        <div
          className="
            absolute top-4 right-4 h-8 w-8
            rounded-(--radius-md)
            bg-(--color-secondary)/20
            rotate-45
          "
        />
      </div>
    </article>
  );
};

export const FeaturesSection: FC<FeaturesSectionProps> = ({ title, subtitle, features }): JSX.Element => {
  return (
    <section
      id="caracteristicas"
      className="
        relative py-24 
        bg-(--color-surface-elevated)
      "
    >
      {/* Background Decoration */}
      <div
        className="
          absolute top-0 left-0 right-0 h-px
          bg-linear-to-r from-transparent via-(--color-border) to-transparent
        "
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span
            className="
              mb-4 inline-block text-sm font-semibold uppercase tracking-wider
              text-(--color-primary)
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
          <div
            className="
              mx-auto h-1 w-20 
              rounded-full 
              bg-linear-to-r from-(--color-primary) to-(--color-secondary)
            "
          />
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(
            (feature: FeatureItem, index: number): JSX.Element => (
              <FeatureCard key={feature.id} feature={feature} index={index} />
            ),
          )}
        </div>
      </div>
    </section>
  );
};
