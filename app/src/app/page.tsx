'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Search, ArrowRight, Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Footer } from '@/components/footer';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const Container: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={`container mx-auto w-full px-6 ${className ?? ''}`}>{children}</div>
);

const Logo: React.FC = () => (
  <div className="flex items-center gap-2 sm:gap-3" data-testid="logo">
    <Image src="/img/logo.png" alt="Logo Gobierno Regional de Ayacucho" width={36} height={36} className="rounded-full" priority />
    <div className="hidden sm:block leading-tight">
      <p className="font-bold tracking-tight">
        <span className="font-black text-primary text-lg sm:text-xl">Gobierno Regional</span>
      </p>
      <p className="font-black text-primary text-lg sm:text-xl tracking-tight">de Ayacucho</p>
    </div>
  </div>
);

const Header: React.FC = () => (
  <header className="top-0 z-50 fixed inset-x-0 bg-background/80 backdrop-blur border-b">
    <Container className="flex justify-between items-center py-2 sm:py-3">
      <Logo />
      <ThemeToggle />
    </Container>
  </header>
);

export default function Page() {
  return (
    <main className="flex flex-col bg-background min-h-screen text-foreground">
      <Header />

      <div className="flex flex-col justify-center items-center px-4 min-h-[calc(100vh-4rem)]">
        <section className="flex flex-col flex-1 justify-center items-center py-20 text-center container">
          <h2 className="mb-4 font-bold text-primary text-3xl md:text-4xl">Sistema de Certificados en Línea</h2>
          <p className="mb-8 max-w-2xl text-muted-foreground text-base">
            Consulta, descarga y verifica certificados oficiales emitidos por el Gobierno Regional de Ayacucho. Una plataforma segura, moderna y transparente al servicio de la
            ciudadanía.
          </p>
          <div className="flex sm:flex-row flex-col gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/80 text-primary-foreground">
              <Link href="#verificar">
                <Search className="mr-2 w-4 h-4" /> Verificar Certificado
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#servicios">
                <FileText className="mr-2 w-4 h-4" /> Ver Servicios
              </Link>
            </Button>
          </div>
        </section>

        <section id="servicios" className="py-16">
          <div className="container">
            <h3 className="mb-8 font-semibold text-2xl text-center">Nuestros Servicios</h3>
            <div className="gap-8 grid md:grid-cols-3">
              <Card className="hover:shadow-md transition">
                <CardHeader>
                  <FileText className="mb-2 w-8 h-8 text-primary" />
                  <CardTitle>Emisión Digital</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">Generación y emisión de certificados digitales con validez oficial y firma electrónica.</CardContent>
              </Card>
              <Card className="hover:shadow-md transition">
                <CardHeader>
                  <Search className="mb-2 w-8 h-8 text-primary" />
                  <CardTitle>Verificación en Línea</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">Verifica la autenticidad de tus certificados desde cualquier dispositivo conectado a Internet.</CardContent>
              </Card>
              <Card className="hover:shadow-md transition">
                <CardHeader>
                  <CheckCircle className="mb-2 w-8 h-8 text-primary" />
                  <CardTitle>Transparencia</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">Acceso seguro y auditable para garantizar la integridad y trazabilidad de cada documento.</CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="verificar" className="py-20 container">
          <div className="mx-auto max-w-xl text-center">
            <h3 className="mb-4 font-semibold text-2xl">Verificar Certificado</h3>
            <p className="mb-6 text-muted-foreground">Ingrese el código único del certificado para validar su autenticidad.</p>
            <div className="flex sm:flex-row flex-col gap-3">
              <input
                type="text"
                placeholder="Ejemplo: GRA-2025-00123"
                className="bg-input-background px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full text-foreground placeholder:text-muted-foreground"
              />
              <Button className="bg-primary hover:bg-primary/80 text-primary-foreground">
                <ArrowRight className="mr-2 w-4 h-4" /> Verificar
              </Button>
            </div>
          </div>
        </section>

        <section id="contacto" className="py-16">
          <div className="text-center container">
            <h3 className="mb-4 font-semibold text-2xl">Contáctanos</h3>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              Si tienes dudas o necesitas asistencia técnica, comunícate con el equipo del <span className="font-medium text-primary">Gobierno Regional de Ayacucho</span>.
            </p>
            <Button asChild variant="outline" size="lg">
              <a href="mailto:kcalle@regionayacucho.gob.pe">
                <Mail className="mr-2 w-4 h-4" /> Enviar un correo
              </a>
            </Button>
          </div>
        </section>
      </div>

      <div className="mt-20">
        <Footer />
      </div>
    </main>
  );
}
