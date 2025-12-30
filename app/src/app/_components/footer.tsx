import type { FC, JSX } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { FooterProps, FooterSection, FooterLink } from '.';

const FooterColumn: FC<{ section: FooterSection }> = ({ section }): JSX.Element => {
  return (
    <div>
      <h3
        className="
          mb-4 text-sm font-semibold uppercase tracking-wider
          text-(--color-text-primary)
        "
      >
        {section.title}
      </h3>
      <ul className="space-y-3">
        {section.links.map(
          (link: FooterLink): JSX.Element => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="
                  text-sm text-(--color-text-secondary)
                  transition-colors duration-(--transition-base)
                  hover:text-(--color-primary)
                "
              >
                {link.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
};

const SocialLinks: FC = (): JSX.Element => {
  const socialIcons: Array<{ name: string; href: string; icon: JSX.Element }> = [
    {
      name: 'Facebook',
      href: 'https://facebook.com/gaboregionalayacucho',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/gaboregionalay',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      href: 'https://youtube.com/@gobiernoregionalayacucho',
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex gap-4">
      {socialIcons.map(
        (social): JSX.Element => (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className="
              flex h-10 w-10 items-center justify-center
              rounded-full
              bg-(--color-surface-elevated)
              text-(--color-text-secondary)
              transition-all duration-(--transition-base)
              hover:bg-(--color-primary)
              hover:text-(--color-text-inverse)
            "
            aria-label={social.name}
          >
            {social.icon}
          </a>
        ),
      )}
    </div>
  );
};

export const Footer: FC<FooterProps> = ({ logoSrc, logoAlt, description, sections, contactInfo, copyrightText }): JSX.Element => {
  return (
    <footer
      className="
        relative
        bg-(--color-surface)
        border-t border-(--color-border)
      "
    >
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src={logoSrc} alt={logoAlt} width={48} height={48} className="h-12 w-auto" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-(--color-primary)">Gobierno Regional</span>
                <span className="text-sm font-bold text-(--color-text-primary)">Ayacucho</span>
              </div>
            </Link>
            <p className="mt-4 text-sm text-(--color-text-secondary) leading-relaxed">{description}</p>
            <div className="mt-6">
              <SocialLinks />
            </div>
          </div>

          {/* Links Columns */}
          {sections.map(
            (section: FooterSection): JSX.Element => (
              <FooterColumn key={section.title} section={section} />
            ),
          )}

          {/* Contact Column */}
          <div>
            <h3
              className="
                mb-4 text-sm font-semibold uppercase tracking-wider
                text-(--color-text-primary)
              "
            >
              Contacto
            </h3>
            <address className="not-italic space-y-3">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-(--color-primary)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="text-sm text-(--color-text-secondary)">{contactInfo.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 shrink-0 text-(--color-primary)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
                <a href={`tel:${contactInfo.phone}`} className="text-sm text-(--color-text-secondary) hover:text-(--color-primary)">
                  {contactInfo.phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 shrink-0 text-(--color-primary)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                <a href={`mailto:${contactInfo.email}`} className="text-sm text-(--color-text-secondary) hover:text-(--color-primary)">
                  {contactInfo.email}
                </a>
              </div>
            </address>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="
          border-t border-(--color-border)
          bg-(--color-surface-elevated)
        "
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-(--color-text-muted)">{copyrightText}</p>
            <div className="flex gap-6">
              <Link href="/privacidad" className="text-sm text-(--color-text-muted) hover:text-(--color-primary)">
                Política de Privacidad
              </Link>
              <Link href="/terminos" className="text-sm text-(--color-text-muted) hover:text-(--color-primary)">
                Términos de Uso
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
