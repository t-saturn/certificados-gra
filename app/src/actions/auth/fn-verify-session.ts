'use server';

import { auth } from '@/lib/auth';

export async function verifyKeycloakSession() {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { valid: false, reason: 'no_session' };
    }

    // Verificar que el token sea válido en Keycloak
    const userInfoResponse = await fetch(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!userInfoResponse.ok) {
      console.log('Token inválido en Keycloak:', userInfoResponse.status);
      return { valid: false, reason: 'invalid_token' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error verificando sesión:', error);
    return { valid: false, reason: 'error' };
  }
}
