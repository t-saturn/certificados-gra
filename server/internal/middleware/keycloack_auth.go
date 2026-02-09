package middleware

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog/log"
)

// KeycloakConfig configuración para Keycloak
type KeycloakConfig struct {
	SSOURL string
	Realm  string
}

// KeycloakPublicKey estructura para almacenar las claves públicas de Keycloak
type KeycloakPublicKey struct {
	Kid string         `json:"kid"`
	Kty string         `json:"kty"`
	Alg string         `json:"alg"`
	Use string         `json:"use"`
	N   string         `json:"n"`
	E   string         `json:"e"`
	Key *rsa.PublicKey `json:"-"`
}

// KeycloakCerts estructura para las claves públicas de Keycloak
type KeycloakCerts struct {
	Keys []KeycloakPublicKey `json:"keys"`
}

// KeycloakClaims claims personalizados para el token de Keycloak
type KeycloakClaims struct {
	Email             string                            `json:"email"`
	EmailVerified     bool                              `json:"email_verified"`
	Name              string                            `json:"name"`
	PreferredUsername string                            `json:"preferred_username"`
	GivenName         string                            `json:"given_name"`
	FamilyName        string                            `json:"family_name"`
	RealmAccess       map[string]interface{}            `json:"realm_access"`
	ResourceAccess    map[string]map[string]interface{} `json:"resource_access"`
	jwt.RegisteredClaims
}

// KeycloakMiddleware gestiona la validación de tokens
type KeycloakMiddleware struct {
	certsURL      string
	realm         string
	issuer        string
	publicKeys    map[string]*rsa.PublicKey
	mu            sync.RWMutex
	lastFetch     time.Time
	cacheDuration time.Duration
}

var (
	keycloakMiddleware *KeycloakMiddleware
	keycloakOnce       sync.Once
	keycloakInitErr    error
)

// InitKeycloakMiddleware inicializa el middleware de Keycloak
func InitKeycloakMiddleware(cfg KeycloakConfig) error {
	keycloakOnce.Do(func() {
		log.Info().Msg("Initializing Keycloak middleware...")

		if cfg.SSOURL == "" || cfg.Realm == "" {
			keycloakInitErr = errors.New("KEYCLOAK_SSO_URL and KEYCLOAK_REALM are required")
			log.Error().Err(keycloakInitErr).Msg("Keycloak configuration missing")
			return
		}

		issuer := fmt.Sprintf("%s/realms/%s", cfg.SSOURL, cfg.Realm)
		certsURL := fmt.Sprintf("%s/protocol/openid-connect/certs", issuer)

		keycloakMiddleware = &KeycloakMiddleware{
			certsURL:      certsURL,
			realm:         cfg.Realm,
			issuer:        issuer,
			publicKeys:    make(map[string]*rsa.PublicKey),
			cacheDuration: 1 * time.Hour,
		}

		// Obtener las claves públicas al inicializar
		if err := keycloakMiddleware.fetchPublicKeys(); err != nil {
			keycloakInitErr = fmt.Errorf("failed to fetch public keys: %w", err)
			log.Error().Err(keycloakInitErr).Msg("Failed to initialize Keycloak")
			return
		}

		log.Info().
			Str("issuer", issuer).
			Str("certs_url", certsURL).
			Msg("Keycloak middleware initialized successfully")
	})

	return keycloakInitErr
}

// fetchPublicKeys obtiene las claves públicas del servidor de Keycloak
func (km *KeycloakMiddleware) fetchPublicKeys() error {
	km.mu.RLock()
	if time.Since(km.lastFetch) < km.cacheDuration && len(km.publicKeys) > 0 {
		km.mu.RUnlock()
		return nil
	}
	km.mu.RUnlock()

	log.Debug().Str("url", km.certsURL).Msg("Fetching Keycloak public keys")

	resp, err := http.Get(km.certsURL)
	if err != nil {
		return fmt.Errorf("error fetching certificates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("error fetching certificates, status: %d", resp.StatusCode)
	}

	var certs KeycloakCerts
	if err := json.NewDecoder(resp.Body).Decode(&certs); err != nil {
		return fmt.Errorf("error decoding certificates: %w", err)
	}

	newKeys := make(map[string]*rsa.PublicKey)
	for _, key := range certs.Keys {
		if key.Kty != "RSA" {
			continue
		}

		pubKey, err := km.buildRSAPublicKey(key.N, key.E)
		if err != nil {
			log.Warn().Err(err).Str("kid", key.Kid).Msg("Failed to build RSA public key")
			continue
		}

		newKeys[key.Kid] = pubKey
	}

	km.mu.Lock()
	km.publicKeys = newKeys
	km.lastFetch = time.Now()
	km.mu.Unlock()

	log.Debug().Int("keys_count", len(newKeys)).Msg("Public keys fetched successfully")

	return nil
}

// buildRSAPublicKey construye una clave pública RSA desde N y E
func (km *KeycloakMiddleware) buildRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, fmt.Errorf("error decoding N: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, fmt.Errorf("error decoding E: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	var e int
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}

	return &rsa.PublicKey{
		N: n,
		E: e,
	}, nil
}

// getPublicKey obtiene la clave pública por kid
func (km *KeycloakMiddleware) getPublicKey(kid string) (*rsa.PublicKey, error) {
	km.mu.RLock()
	key, exists := km.publicKeys[kid]
	km.mu.RUnlock()

	if !exists {
		// Intentar refrescar las claves
		if err := km.fetchPublicKeys(); err != nil {
			return nil, err
		}

		km.mu.RLock()
		key, exists = km.publicKeys[kid]
		km.mu.RUnlock()

		if !exists {
			return nil, fmt.Errorf("public key not found for kid: %s", kid)
		}
	}

	return key, nil
}

// ValidateToken valida el token JWT
func (km *KeycloakMiddleware) ValidateToken(tokenString string) (*KeycloakClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &KeycloakClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verificar el algoritmo
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Obtener kid del header
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("kid not found in token header")
		}

		// Obtener la clave pública correspondiente
		return km.getPublicKey(kid)
	})

	if err != nil {
		return nil, fmt.Errorf("error parsing token: %w", err)
	}

	claims, ok := token.Claims.(*KeycloakClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	// Validar issuer
	if claims.Issuer != km.issuer {
		return nil, fmt.Errorf("invalid issuer: expected %s, got %s", km.issuer, claims.Issuer)
	}

	return claims, nil
}

// KeycloakAuth middleware de autenticación completa
func KeycloakAuth() fiber.Handler {
	return func(c fiber.Ctx) error {
		if keycloakMiddleware == nil {
			log.Error().Msg("Keycloak middleware not initialized")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "AUTH_NOT_CONFIGURED",
					"message": "Authentication service not configured",
				},
			})
		}

		authHeader := c.Get("Authorization")

		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "MISSING_TOKEN",
					"message": "Authorization token required",
				},
			})
		}

		parts := strings.Split(authHeader, " ")

		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "INVALID_TOKEN_FORMAT",
					"message": "Invalid token format",
				},
			})
		}

		tokenString := parts[1]

		claims, err := keycloakMiddleware.ValidateToken(tokenString)
		if err != nil {
			log.Debug().Err(err).Msg("Token validation failed")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "INVALID_TOKEN",
					"message": fmt.Sprintf("Invalid token: %v", err),
				},
			})
		}

		// Guardar claims en el contexto
		c.Locals("user", claims)
		c.Locals("user_id", claims.Subject)
		c.Locals("email", claims.Email)
		c.Locals("username", claims.PreferredUsername)

		return c.Next()
	}
}

// KeycloakAuthOnly middleware que solo valida la sesión y extrae el user_id
// No verifica roles, solo autenticación
func KeycloakAuthOnly() fiber.Handler {
	return func(c fiber.Ctx) error {
		if keycloakMiddleware == nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "AUTH_NOT_CONFIGURED",
					"message": "Authentication service not configured",
				},
			})
		}

		authHeader := c.Get("Authorization")

		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "MISSING_TOKEN",
					"message": "Authorization token required",
				},
			})
		}

		parts := strings.Split(authHeader, " ")

		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "INVALID_TOKEN_FORMAT",
					"message": "Invalid token format",
				},
			})
		}

		tokenString := parts[1]

		claims, err := keycloakMiddleware.ValidateToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "INVALID_TOKEN",
					"message": fmt.Sprintf("Invalid token: %v", err),
				},
			})
		}

		// Solo guardar user_id (subject del JWT)
		c.Locals("user_id", claims.Subject)

		return c.Next()
	}
}

// RequireRealmRole middleware para validar roles del realm
func RequireRealmRole(requiredRole string) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, ok := c.Locals("user").(*KeycloakClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "UNAUTHENTICATED",
					"message": "User not authenticated",
				},
			})
		}

		if claims.RealmAccess == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "NO_REALM_ACCESS",
					"message": "No realm access",
				},
			})
		}

		roles, ok := claims.RealmAccess["roles"].([]interface{})
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "ROLES_NOT_FOUND",
					"message": "Roles not found",
				},
			})
		}

		for _, role := range roles {
			if roleStr, ok := role.(string); ok && roleStr == requiredRole {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status": "error",
			"error": fiber.Map{
				"code":    "FORBIDDEN",
				"message": fmt.Sprintf("Required role: %s", requiredRole),
			},
		})
	}
}

// RequireResourceRole middleware para validar roles de recursos específicos
func RequireResourceRole(resource string, requiredRole string) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, ok := c.Locals("user").(*KeycloakClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "UNAUTHENTICATED",
					"message": "User not authenticated",
				},
			})
		}

		if claims.ResourceAccess == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "NO_RESOURCE_ACCESS",
					"message": "No resource access",
				},
			})
		}

		resourceAccess, ok := claims.ResourceAccess[resource]
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "RESOURCE_NOT_FOUND",
					"message": fmt.Sprintf("No access to resource: %s", resource),
				},
			})
		}

		roles, ok := resourceAccess["roles"].([]interface{})
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "ROLES_NOT_FOUND",
					"message": "Roles not found in resource",
				},
			})
		}

		for _, role := range roles {
			if roleStr, ok := role.(string); ok && roleStr == requiredRole {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status": "error",
			"error": fiber.Map{
				"code":    "FORBIDDEN",
				"message": fmt.Sprintf("Required role in %s: %s", resource, requiredRole),
			},
		})
	}
}

// HasAnyResourceRole middleware para validar si tiene algún rol en un recurso
func HasAnyResourceRole(resource string, requiredRoles []string) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, ok := c.Locals("user").(*KeycloakClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "UNAUTHENTICATED",
					"message": "User not authenticated",
				},
			})
		}

		if claims.ResourceAccess == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "NO_RESOURCE_ACCESS",
					"message": "No resource access",
				},
			})
		}

		resourceAccess, ok := claims.ResourceAccess[resource]
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "RESOURCE_NOT_FOUND",
					"message": fmt.Sprintf("No access to resource: %s", resource),
				},
			})
		}

		roles, ok := resourceAccess["roles"].([]interface{})
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"status": "error",
				"error": fiber.Map{
					"code":    "ROLES_NOT_FOUND",
					"message": "Roles not found in resource",
				},
			})
		}

		userRoles := make(map[string]bool)
		for _, role := range roles {
			if roleStr, ok := role.(string); ok {
				userRoles[roleStr] = true
			}
		}

		for _, requiredRole := range requiredRoles {
			if userRoles[requiredRole] {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status": "error",
			"error": fiber.Map{
				"code":    "FORBIDDEN",
				"message": fmt.Sprintf("Required one of these roles in %s: %v", resource, requiredRoles),
			},
		})
	}
}

// GetUserID obtiene el user_id del contexto
func GetUserID(c fiber.Ctx) string {
	if userID, ok := c.Locals("user_id").(string); ok {
		return userID
	}
	return ""
}

// GetUserClaims obtiene los claims del usuario del contexto
func GetUserClaims(c fiber.Ctx) *KeycloakClaims {
	if claims, ok := c.Locals("user").(*KeycloakClaims); ok {
		return claims
	}
	return nil
}