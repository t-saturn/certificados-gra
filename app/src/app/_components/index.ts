// -- Landing Page Components - Barrel Export

export { Header } from './header';
export { HeroSection } from './hero-section';
export { FeaturesSection } from './features-section';
export { StatsSection } from './stats-section';
export { ProcessSection } from './process-section';
export { CtaSection } from './cta-section';
export { Footer } from './footer';

import type { ReactNode } from 'react';

// -- Header Types

export type NavigationItem = {
  label: string;
  href: string;
  isExternal?: boolean;
};

export type HeaderProps = {
  logoSrc: string;
  logoAlt: string;
  navigationItems: NavigationItem[];
};

// -- Hero Section Types

export type HeroSectionProps = {
  title: string;
  subtitle: string;
  description: string;
  primaryButtonText: string;
  primaryButtonHref: string;
  secondaryButtonText: string;
  secondaryButtonHref: string;
};

// -- Features Section Types

export type FeatureItem = {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
};

export type FeaturesSectionProps = {
  title: string;
  subtitle: string;
  features: FeatureItem[];
};

// -- Stats Section Types

export type StatItem = {
  id: string;
  value: string;
  label: string;
  suffix?: string;
};

export type StatsSectionProps = {
  stats: StatItem[];
};

// -- Process Section Types

export type ProcessStep = {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  icon: ReactNode;
};

export type ProcessSectionProps = {
  title: string;
  subtitle: string;
  steps: ProcessStep[];
};

// -- CTA Section Types

export type CtaSectionProps = {
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
};

// -- Footer Types

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterSection = {
  title: string;
  links: FooterLink[];
};

export type ContactInfo = {
  address: string;
  phone: string;
  email: string;
};

export type FooterProps = {
  logoSrc: string;
  logoAlt: string;
  description: string;
  sections: FooterSection[];
  contactInfo: ContactInfo;
  copyrightText: string;
};

// -- Shared/Common Types

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  isExternal?: boolean;
};

export type SectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export type ContainerProps = {
  children: ReactNode;
  className?: string;
};
