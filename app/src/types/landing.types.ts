import type { ReactNode } from 'react';

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

export type HeroSectionProps = {
  title: string;
  subtitle: string;
  description: string;
  primaryButtonText: string;
  primaryButtonHref: string;
  secondaryButtonText: string;
  secondaryButtonHref: string;
};

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

export type StatItem = {
  id: string;
  value: string;
  label: string;
  suffix?: string;
};

export type StatsSectionProps = {
  stats: StatItem[];
};

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

export type CtaSectionProps = {
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
};

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
