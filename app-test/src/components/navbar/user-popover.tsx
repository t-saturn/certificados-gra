'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, LogOut, User, Shield, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useProfile } from '@/context/profile';
import { keycloakSignOut } from '@/lib/keycloak-logout';

export function UserPopover() {
  const { profile } = useProfile();

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const userStats = {
    lastLogin: 'Hace 2 horas',
    location: 'Ayacucho, Perú',
    sessionsActive: 2,
    role: profile.role || 'Administrador',
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-3 hover:bg-accent/50 px-3 py-2 rounded-xl h-auto hover:scale-[1.02] transition-all duration-200">
          <Avatar className="ring-2 ring-primary/20 ring-offset-2 ring-offset-background w-10 h-10">
            <AvatarImage src={profile.avatar || '/placeholder.svg?height=40&width=40'} alt={profile.name} />
            <AvatarFallback className="bg-linear-to-br from-primary to-chart-1 font-semibold text-primary-foreground">{getInitials(profile.name)}</AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <div className="max-w-32 font-medium text-foreground text-sm truncate">{profile.name}</div>
            <div className="text-muted-foreground text-xs">{userStats.role}</div>
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="bg-popover shadow-2xl shadow-black/10 backdrop-blur-xl mr-2 border-border/50 w-80" align="end">
        <div className="space-y-6">
          {/* ...todo tu contenido igual... */}

          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="relative">
              <Avatar className="ring-4 ring-primary/20 ring-offset-4 ring-offset-background w-20 h-20">
                <AvatarImage src={profile.avatar || '/placeholder.svg?height=80&width=80'} alt={profile.name} />
                <AvatarFallback className="bg-linear-to-br from-primary to-chart-1 font-bold text-primary-foreground text-xl">{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
              <div className="-right-1 -bottom-1 absolute flex justify-center items-center bg-green-500 border-2 border-background rounded-full w-6 h-6">
                {/* eslint-disable-next-line react/self-closing-comp */}
                <div className="bg-white rounded-full w-2 h-2"></div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-lg">{profile.name}</h3>
              <Badge variant="secondary" className="bg-primary/10 border-primary/20 font-medium text-primary">
                <Shield className="mr-1 w-3 h-3" />
                {userStats.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Link href="https://accounts.regionayacucho.gob.pe/user" target="_blank">
              <Button variant="ghost" className="justify-between w-full h-12 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex justify-center items-center bg-primary/10 rounded-lg w-8 h-8">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="hover:font-bold text-left">
                    <div className="font-medium text-sm">Mi Perfil</div>
                    <div className="text-muted-foreground text-xs">Gestionar información personal</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            </Link>

            <Link href="/main/settings">
              <Button variant="ghost" className="justify-between w-full h-12 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex justify-center items-center bg-orange-500/10 rounded-lg w-8 h-8">
                    <Settings className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="hover:font-bold text-left">
                    <div className="font-medium text-sm">Configuración</div>
                    <div className="text-muted-foreground text-xs">Preferencias del sistema</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            </Link>
          </div>

          <div className="mt-2 pt-2 border-border/50 border-t">
            <button
              onClick={() => keycloakSignOut()}
              className="flex items-center gap-2 hover:bg-red-600 px-3 py-2 rounded-lg w-full font-medium text-red-600 hover:text-white text-sm transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
