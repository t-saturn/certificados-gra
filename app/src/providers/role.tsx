'use client';

import { createContext, useContext } from 'react';

export type RoleValue = { id: string; name: string; modules?: string[] } | null;

const RoleContext = createContext<RoleValue>(null);

export const RoleProvider = ({ value, children }: { value: RoleValue; children: React.ReactNode }) => <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;

export const useRole = () => useContext(RoleContext);
