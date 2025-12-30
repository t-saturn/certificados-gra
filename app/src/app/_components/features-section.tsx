'use client';

import type { FC, JSX } from 'react';
import type { FeaturesSectionProps, FeatureItem } from '@/types/landing.types';

const FeatureCard: FC<{ feature: FeatureItem; index: number }> = ({ feature, index }): JSX.Element => {
  return (
    <article
      className="group relative rounded-xl bg-card p-8 border border-border transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Icon Container */}
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
        <div className="h-7 w-7">{feature.icon}</div>
      </div>

      {/* Content */}
      <h3 className="mb-3 text-xl font-bold text-foreground transition-colors duration-200 group-hover:text-primary" style={{ fontFamily: 'var(--font-montserrat)' }}>
        {feature.title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>

      {/* Decorative Corner */}
      <div className="absolute top-0 right-0 h-20 w-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="absolute top-4 right-4 h-8 w-8 rounded-md bg-chart-2/20 rotate-45" />
      </div>
    </article>
  );
};

export const FeaturesSection: FC<FeaturesSectionProps> = ({ title, subtitle, features }): JSX.Element => {
  return (
    <section id="caracteristicas" className="relative py-24 bg-muted/50">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-primary">{subtitle}</span>
          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-foreground" style={{ fontFamily: 'var(--font-montserrat)' }}>
            {title}
          </h2>
          <div className="mx-auto h-1 w-20 rounded-full bg-primary" />
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
