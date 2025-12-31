'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRole } from '@/providers/role';

interface ProfileSchema {
  name: string;
  role: string;
  avatar: string; // inicial del nombre
}

interface ProfileContextType {
  profile: ProfileSchema;
  fetchProfile: (userId: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

function initialFromName(name?: string, emailFallback?: string) {
  const base = (name && name.trim()) || (emailFallback && emailFallback.trim()) || 'Usuario';
  return base.charAt(0).toUpperCase();
}

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = useSession();
  const roleCtx = useRole();

  // Derivado directamente del contexto y la sesión
  const profile: ProfileSchema = {
    name: session?.user?.name ?? session?.user?.email ?? 'Usuario',
    role: roleCtx?.name ?? 'invitado',
    avatar: initialFromName(session?.user?.name ?? undefined, session?.user?.email ?? undefined),
  };

  // Compat: si piden refrescar, no hace nada porque todo está derivado
  const fetchProfile = async () => {};

  return <ProfileContext.Provider value={{ profile, fetchProfile }}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile debe usarse dentro de un ProfileProvider');
  return ctx;
};
