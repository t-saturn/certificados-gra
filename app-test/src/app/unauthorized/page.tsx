'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldBan, LogOut, UserCog, ChevronLeft } from 'lucide-react';
import { keycloakSignOut } from '@/lib/keycloak-logout';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await keycloakSignOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ring ring-border">
            <ShieldBan className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Acceso Restringido
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Tu cuenta ha sido autenticada correctamente, pero no tiene los permisos necesarios para acceder a esta aplicación.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-4 pt-4">
          <div className="bg-destructive/10 text-destructive border border-destructive rounded-lg p-3 text-sm font-medium">
            Si crees que esto es un error, por favor contacta al administrador del sistema para solicitar la asignación de un rol.
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:gap-4 pt-2">
          <Button 
            onClick={handleLogout} 
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            <UserCog className="h-4 w-4" />
            Cambiar de cuenta
          </Button>

          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className="w-full gap-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </CardFooter>
        
        <div className="pb-6 text-center">
            <Button 
                variant="link" 
                size="sm" 
                className="text-muted-foreground"
                onClick={() => router.push('/')}
            >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Volver al inicio
            </Button>
        </div>
      </Card>
    </div>
  );
}