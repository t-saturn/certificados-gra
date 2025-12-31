'use client';

import type { FC, ReactNode, JSX } from 'react';
import { createContext, useContext, useMemo } from 'react';
import type { ProfileContextValue, UserProfile } from '@/types/profile.types';

const ProfileContext = createContext<ProfileContextValue | null>(null);

type ProfileProviderProps = {
  children: ReactNode;
  user: UserProfile;
  roleName: string;
};

export const ProfileProvider: FC<ProfileProviderProps> = ({ children, user, roleName }): JSX.Element => {
  const contextValue = useMemo<ProfileContextValue>(
    () => ({
      user,
      roleName,
      isLoading: false,
    }),
    [user, roleName],
  );

  return <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>;
};

export const useProfile = (): ProfileContextValue => {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }

  return context;
};
