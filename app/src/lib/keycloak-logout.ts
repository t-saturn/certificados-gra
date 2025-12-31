import { signOut } from 'next-auth/react';

type KeycloakLogoutResponse = {
  url?: string;
  error?: string;
};

export const keycloakSignOut = async (): Promise<void> => {
  try {
    const response = await fetch('/api/auth/keycloak-logout');
    const data: KeycloakLogoutResponse = await response.json();

    await signOut({ redirect: false });

    if (data.url) {
      window.location.href = data.url;
    } else {
      window.location.href = '/';
    }
  } catch {
    await signOut({ callbackUrl: '/' });
  }
};
