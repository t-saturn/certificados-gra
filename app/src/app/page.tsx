import type { FC, ReactNode, JSX } from 'react';
import type { NavigationItem, FeatureItem, StatItem, ProcessStep, FooterSection, ContactInfo } from '@/types/landing.types';
import { Header, HeroSection, FeaturesSection, StatsSection, ProcessSection, CtaSection, Footer } from './_components';

// Icons Components

const ShieldCheckIcon: FC = (): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const DocumentCheckIcon: FC = (): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-12M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12"
    />
  </svg>
);

const ClockIcon: FC = (): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const GlobeIcon: FC = (): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
    />
  </svg>
);

const LockClosedIcon: FC = (): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const CloudArrowDownIcon: FC = (): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

const UserIcon: FC = (): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const ClipboardDocumentCheckIcon: FC = (): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
    />
  </svg>
);

const PencilSquareIcon: FC = (): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

// Static Data Configuration

const navigationItems: NavigationItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Características', href: '#caracteristicas' },
  { label: 'Proceso', href: '#proceso' },
  { label: 'Verificar Certificado', href: '/verify' },
  { label: 'Contacto', href: '#contacto' },
];

const features: FeatureItem[] = [
  {
    id: 'firma-digital',
    icon: <ShieldCheckIcon />,
    title: 'Firma Digital Certificada',
    description: 'Certificados con firma digital PKI que garantizan autenticidad, integridad y no repudio conforme a la legislación peruana.',
  },
  {
    id: 'validez-legal',
    icon: <DocumentCheckIcon />,
    title: 'Validez Legal Plena',
    description: 'Documentos con el mismo valor legal que los físicos, reconocidos por todas las entidades públicas y privadas del país.',
  },
  {
    id: 'disponibilidad',
    icon: <ClockIcon />,
    title: 'Disponible 24/7',
    description: 'Accede a tus certificados en cualquier momento desde cualquier dispositivo, sin necesidad de filas ni horarios de atención.',
  },
  {
    id: 'acceso-global',
    icon: <GlobeIcon />,
    title: 'Acceso Global',
    description: 'Verifica y descarga certificados desde cualquier parte del mundo con conexión a internet.',
  },
  {
    id: 'seguridad',
    icon: <LockClosedIcon />,
    title: 'Máxima Seguridad',
    description: 'Infraestructura de seguridad de nivel bancario con cifrado de extremo a extremo y protección contra falsificaciones.',
  },
  {
    id: 'descarga-inmediata',
    icon: <CloudArrowDownIcon />,
    title: 'Descarga Inmediata',
    description: 'Obtén tu certificado en formato PDF firmado digitalmente de forma instantánea tras la aprobación.',
  },
];

const stats: StatItem[] = [
  { id: 'certificados', value: '45000', label: 'Certificados Emitidos', suffix: '+' },
  { id: 'usuarios', value: '12500', label: 'Usuarios Registrados', suffix: '+' },
  { id: 'tramites', value: '98', label: 'Satisfacción', suffix: '%' },
  { id: 'disponibilidad', value: '24', label: 'Horas Disponible', suffix: '/7' },
];

const processSteps: ProcessStep[] = [
  {
    id: 'registro',
    stepNumber: 1,
    title: 'Regístrate',
    description: 'Crea tu cuenta con tu DNI y correo electrónico. Verifica tu identidad de forma segura.',
    icon: <UserIcon />,
  },
  {
    id: 'solicitud',
    stepNumber: 2,
    title: 'Solicita',
    description: 'Selecciona el tipo de certificado que necesitas y completa el formulario de solicitud.',
    icon: <ClipboardDocumentCheckIcon />,
  },
  {
    id: 'firma',
    stepNumber: 3,
    title: 'Firma Digital',
    description: 'Tu solicitud es procesada y el certificado es firmado digitalmente por la autoridad competente.',
    icon: <PencilSquareIcon />,
  },
  {
    id: 'descarga',
    stepNumber: 4,
    title: 'Descarga',
    description: 'Recibe una notificación y descarga tu certificado firmado en formato PDF.',
    icon: <CloudArrowDownIcon />,
  },
];

const footerSections: FooterSection[] = [
  {
    title: 'Servicios',
    links: [
      { label: 'Emisión de Certificados', href: '/servicios/emision' },
      { label: 'Verificación', href: '/verify' },
      { label: 'Firma Digital', href: '/servicios/firma-digital' },
      { label: 'Consultas', href: '/consultas' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Guía de Usuario', href: '/recursos/guia' },
      { label: 'Preguntas Frecuentes', href: '/recursos/faq' },
      { label: 'Manual de Verificación', href: '/recursos/verificacion' },
      { label: 'Normativa', href: '/recursos/normativa' },
    ],
  },
];

const contactInfo: ContactInfo = {
  address: 'Av. Independencia 756, Ayacucho, Perú',
  phone: '(066) 312-456',
  email: 'certificaciones@regionayacucho.gob.pe',
};

// Page Component

const HomePage: FC = (): JSX.Element => {
  return (
    <>
      <Header logoSrc="/img/logo.webp" logoAlt="Gobierno Regional de Ayacucho" navigationItems={navigationItems} />

      <main>
        <HeroSection
          title="Sistema de Certificados Digitales"
          subtitle="Plataforma Oficial"
          description="Emite, gestiona y verifica certificados con firma digital de manera segura, rápida y con validez legal en todo el territorio nacional."
          primaryButtonText="Solicitar Certificado"
          primaryButtonHref="/solicitar"
          secondaryButtonText="Conocer más"
          secondaryButtonHref="#caracteristicas"
        />

        <FeaturesSection title="¿Por qué elegir nuestra plataforma?" subtitle="Características" features={features} />

        <StatsSection stats={stats} />

        <ProcessSection title="¿Cómo obtener tu certificado?" subtitle="Proceso Simple" steps={processSteps} />

        <CtaSection
          title="Comienza Ahora"
          description="Únete a miles de ciudadanos que ya disfrutan de la agilidad y seguridad de los certificados digitales del Gobierno Regional de Ayacucho."
          buttonText="Crear mi Cuenta"
          buttonHref="/registro"
        />
      </main>

      <Footer
        logoSrc="/img/logo.webp"
        logoAlt="Gobierno Regional de Ayacucho"
        description="Sistema oficial de emisión y verificación de certificados digitales del Gobierno Regional de Ayacucho."
        sections={footerSections}
        contactInfo={contactInfo}
        copyrightText={`© ${new Date().getFullYear()} Gobierno Regional de Ayacucho. Todos los derechos reservados.`}
      />
    </>
  );
};

export default HomePage;
