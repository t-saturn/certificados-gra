import Link from 'next/link';
import { FileText, CheckCircle, Search, ArrowRight, Mail, Key } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Main = () => {
  return (
    <div className="flex flex-col justify-center items-center px-4 min-h-[calc(100vh-4rem)]">
      <section className="flex flex-col flex-1 justify-center items-center py-20 text-center container">
        <h2 className="mb-4 font-bold text-primary text-3xl md:text-4xl">Sistema de Certificados</h2>
        <p className="mb-8 max-w-2xl text-muted-foreground text-base">
          Consulta, descarga y verifica certificados oficiales emitidos por el Gobierno Regional de Ayacucho. Una plataforma segura, moderna y transparente al servicio de la ciudadanía.
        </p>
        <div className="flex sm:flex-row flex-col gap-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/80 text-primary-foreground">
            <Link href="#verificar">
              <Search className="mr-2 w-4 h-4" /> Verificar Certificado
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/main">
              <Key className="mr-2 w-4 h-4" /> Iniciar Sesión
            </Link>
          </Button>
        </div>
      </section>

      <section id="servicios" className="py-16">
        <div className="container">
          <h3 className="mb-8 font-semibold text-2xl text-center">Servicios</h3>
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
              name="codigo"
              placeholder="Ejemplo: GRA-2025-00123"
              className="bg-input-background dark:bg-background/80 px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full text-foreground placeholder:text-muted-foreground"
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
  );
};
