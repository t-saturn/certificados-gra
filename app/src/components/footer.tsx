import { Mail, Phone, MapPin, ExternalLink, Shield, FileText, Globe, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

const ORG_NAME = 'Gobierno Regional de Ayacucho';
const ORG_SUBTITLE = 'Sistema de authenticacion unica';
const ORG_ADDRESS = 'Jr. Callao N 122, Ayacucho, Huamanga, Ayacucho';
const ORG_PHONE = '066-303195';
const ORG_EMAIL = 'kcalle@regionayacucho.gob.pe';

const LINKS = {
  portalPrincipal: 'https://www.gob.pe/regionayacucho',
  terminos: '#',
  privacidad: '#',
  contactoTecnico: '#',
  facebook: 'https://www.facebook.com/gobiernoregionalayacucho/',
};

const quickLinks = [
  { label: 'Portal Principal', href: LINKS.portalPrincipal, icon: ExternalLink },
  { label: 'Términos de Uso', href: LINKS.terminos, icon: FileText },
  { label: 'Política de Privacidad', href: LINKS.privacidad, icon: Shield },
  {
    label: 'Contacto Técnico',
    href: LINKS.contactoTecnico !== '#' && LINKS.contactoTecnico ? LINKS.contactoTecnico : ORG_EMAIL ? `mailto:${ORG_EMAIL}` : '#',
    icon: Mail,
  },
];

const contactInfo = [
  { label: 'Dirección', value: ORG_ADDRESS, icon: MapPin },
  { label: 'Teléfono', value: ORG_PHONE, icon: Phone },
  { label: 'Email', value: ORG_EMAIL, icon: Mail },
];

const socialLinks = [
  { name: 'Web', href: LINKS.portalPrincipal, icon: <Globe /> },
  { name: 'Facebook', href: LINKS.facebook, icon: <Facebook /> },
];

export const Footer: React.FC = () => {
  return (
    <footer className="bg-background mt-auto border-border border-t">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 container">
        <div className="py-8">
          <div className="gap-8 grid grid-cols-1 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex justify-center items-center w-10 h-10">
                  <Image src="/img/logo.png" alt="Logo Gobierno Regional de Ayacucho" width={24} height={24} className="rounded-full" priority />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{ORG_NAME}</h3>
                  <p className="text-muted-foreground text-sm">{ORG_SUBTITLE}</p>
                </div>
              </div>

              <p className="mb-4 max-w-md text-muted-foreground text-sm">
                Plataforma integral para la gestión de procesos administrativos y operativos del {ORG_NAME}, diseñada para optimizar la eficiencia institucional.
              </p>

              <div className="flex flex-wrap gap-2">
                {quickLinks.map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <Button key={link.label} variant="ghost" size="sm" className="px-2 h-8 text-xs" asChild>
                      <a href={link.href} className="flex items-center space-x-1" target={link.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                        <IconComponent className="w-3 h-3" />
                        <span>{link.label}</span>
                      </a>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-medium text-foreground">Información de Contacto</h4>
              <div className="space-y-2">
                {contactInfo.map((contact) => {
                  const IconComponent = contact.icon;
                  const isEmail = contact.label.toLowerCase().includes('email') && contact.value && contact.value !== '#';
                  const isPhone = contact.label.toLowerCase().includes('teléfono') && contact.value && contact.value !== '#';
                  const content = isEmail ? (
                    <a className="text-foreground text-sm hover:underline" href={`mailto:${contact.value}`}>
                      {contact.value}
                    </a>
                  ) : isPhone ? (
                    <a className="text-foreground text-sm hover:underline" href={`tel:${contact.value.replace(/\s+/g, '')}`}>
                      {contact.value}
                    </a>
                  ) : (
                    <p className="text-foreground text-sm">{contact.value}</p>
                  );

                  return (
                    <div key={contact.label} className="flex items-start space-x-2">
                      <IconComponent className="mt-0.5 w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">{contact.label}</p>
                        {content}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-medium text-foreground">Estado del Sistema</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Servidor</span>
                  <div className="flex items-center space-x-2">
                    <div className="bg-green-500 rounded-full w-2 h-2" />
                    <span className="text-foreground text-xs">Online</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Base de Datos</span>
                  <div className="flex items-center space-x-2">
                    <div className="bg-green-500 rounded-full w-2 h-2" />
                    <span className="text-foreground text-xs">Conectada</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Última actualización</span>
                  <span className="text-foreground text-xs">Hace 2 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="py-4">
          <div className="flex sm:flex-row flex-col justify-between items-center space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-4 text-muted-foreground text-sm">
              <span>
                © {new Date().getFullYear()} {ORG_NAME} - OTIC
              </span>
              <span>•</span>
              <span>Todos los derechos reservados</span>
              <span>•</span>
              <span>Versión 1.0.0</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-muted-foreground text-xs">Síguenos:</span>
              {socialLinks.map((social) => (
                <Button key={social.name} variant="ghost" size="sm" className="p-0 w-6 h-6 text-muted-foreground hover:text-foreground" asChild>
                  <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.name}>
                    {social.icon}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
