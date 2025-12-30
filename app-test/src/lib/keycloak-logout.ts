import { signOut } from 'next-auth/react';

export async function keycloakSignOut() {
  // 1 cerrar NextAuth (limpia cookies authjs)
  await signOut({ redirect: false });

  // 2 pedir al server la URL de logout Keycloak
  const res = await fetch('/api/auth/keycloak-logout', { cache: 'no-store' });
  const data = await res.json();

  if (!res.ok || !data?.url) {
    // fallback: al menos vuelve al inicio
    window.location.href = '/';
    return;
  }

  // 3 redirigir a Keycloak logout real
  window.location.href = data.url;
}
