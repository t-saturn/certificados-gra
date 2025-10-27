'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  const roleCtx = useRole(); // { id: string; name: string } | null

  const [profile, setProfile] = useState<ProfileSchema>({
    name: 'Usuario',
    role: 'invitado',
    avatar: 'U',
  });

  const computeProfile = () => {
    const name = session?.user?.name ?? session?.user?.email ?? 'Usuario';
    const avatar = initialFromName(session?.user?.name ?? undefined, session?.user?.email ?? undefined);
    const roleName = roleCtx?.name ?? 'invitado';
    return { name, role: roleName, avatar };
  };

  useEffect(() => {
    setProfile(computeProfile());
    // deps: cuando cambie nombre/email o el nombre del rol, recomputa
  }, [session?.user?.name, session?.user?.email, roleCtx?.name]);

  // Compat: si pides “refrescar perfil”, re-sincroniza desde los contexts
  const fetchProfile = async (_userId: string) => {
    setProfile(computeProfile());
  };

  return <ProfileContext.Provider value={{ profile, fetchProfile }}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile debe usarse dentro de un ProfileProvider');
  return ctx;
};
