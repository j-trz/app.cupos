package services

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Verificación de ID tokens de Office 365 / Microsoft Entra ID (Azure AD) —
// preparación para el login corporativo que va a reemplazar el login propio
// en producción (decisión ya tomada, ver docs/FLUJOS_FUNCIONALIDADES.md
// sección 1 y la nota equivalente en el vault). El frontend obtiene el ID
// token real vía MSAL.js (@azure/msal-browser) contra el tenant configurado
// y lo manda a LoginOffice365 (ver user_handler.go); acá se valida contra
// las claves públicas REALES de Microsoft antes de confiar en ningún claim
// — nunca decodificar un JWT ajeno sin verificar la firma primero.

type office365Claims struct {
	Email             string `json:"email"`
	PreferredUsername string `json:"preferred_username"`
	Name              string `json:"name"`
	jwt.RegisteredClaims
}

type jwksKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type jwksResponse struct {
	Keys []jwksKey `json:"keys"`
}

type openIDConfig struct {
	JWKSURI string `json:"jwks_uri"`
	Issuer  string `json:"issuer"`
}

var (
	jwksMu      sync.Mutex
	jwksCache   map[string]jwksKey // kid -> clave pública
	jwksExpires time.Time
	issuerCache string
)

func azureTenantID() string { return os.Getenv("AZURE_TENANT_ID") }
func azureClientID() string { return os.Getenv("AZURE_CLIENT_ID") }

// Office365LoginConfigured indica si las env vars necesarias están cargadas
// — el endpoint de login y el botón del frontend se apagan solos si no,
// para no romper nada mientras se termina de configurar el App Registration
// en el portal de Azure.
func Office365LoginConfigured() bool {
	return azureTenantID() != "" && azureClientID() != ""
}

func fetchOpenIDConfig(tenantID string) (*openIDConfig, error) {
	url := fmt.Sprintf("https://login.microsoftonline.com/%s/v2.0/.well-known/openid-configuration", tenantID)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("no se pudo obtener la configuración OpenID de Microsoft: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Microsoft devolvió %d consultando la configuración OpenID (¿AZURE_TENANT_ID correcto?)", resp.StatusCode)
	}
	var cfg openIDConfig
	if err := json.NewDecoder(resp.Body).Decode(&cfg); err != nil {
		return nil, fmt.Errorf("respuesta OpenID inválida: %w", err)
	}
	return &cfg, nil
}

// refreshJWKS trae las claves públicas vigentes del tenant. Se cachean 12hs
// — Microsoft las rota ocasionalmente, no hace falta pedirlas en cada login.
func refreshJWKS() error {
	tenantID := azureTenantID()
	if tenantID == "" {
		return fmt.Errorf("AZURE_TENANT_ID no está configurada")
	}
	cfg, err := fetchOpenIDConfig(tenantID)
	if err != nil {
		return err
	}
	resp, err := http.Get(cfg.JWKSURI)
	if err != nil {
		return fmt.Errorf("no se pudieron obtener las claves públicas de Microsoft: %w", err)
	}
	defer resp.Body.Close()
	var jwks jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("JWKS inválido: %w", err)
	}

	keys := make(map[string]jwksKey, len(jwks.Keys))
	for _, k := range jwks.Keys {
		if k.Kty == "RSA" && k.Kid != "" {
			keys[k.Kid] = k
		}
	}

	jwksMu.Lock()
	jwksCache = keys
	jwksExpires = time.Now().Add(12 * time.Hour)
	issuerCache = cfg.Issuer
	jwksMu.Unlock()
	return nil
}

// getJWKSKey busca una clave por kid, refrescando el cache si venció o si el
// kid no aparece todavía (Microsoft rota claves — un kid desconocido no es
// necesariamente un token falso, puede ser una clave nueva que no bajamos).
func getJWKSKey(kid string) (*jwksKey, string, error) {
	jwksMu.Lock()
	stale := jwksCache == nil || time.Now().After(jwksExpires)
	k, found := jwksCache[kid]
	issuer := issuerCache
	jwksMu.Unlock()

	if found && !stale {
		return &k, issuer, nil
	}
	if err := refreshJWKS(); err != nil {
		return nil, "", err
	}
	jwksMu.Lock()
	defer jwksMu.Unlock()
	if k, ok := jwksCache[kid]; ok {
		return &k, issuerCache, nil
	}
	return nil, "", fmt.Errorf("no se encontró la clave pública %q entre las claves activas del tenant", kid)
}

func rsaPublicKeyFromJWK(k *jwksKey) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, fmt.Errorf("módulo RSA inválido: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, fmt.Errorf("exponente RSA inválido: %w", err)
	}
	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: int(new(big.Int).SetBytes(eBytes).Int64()),
	}, nil
}

// ValidateOffice365IDToken verifica la firma del ID token contra las claves
// públicas reales del tenant de Microsoft configurado, y valida emisor +
// audiencia + vigencia (esto último ya lo maneja la librería jwt a partir de
// `exp`/`nbf`). Devuelve el email y nombre verificados del usuario — nunca
// el claim crudo sin pasar por acá.
func ValidateOffice365IDToken(idToken string) (email string, name string, err error) {
	if !Office365LoginConfigured() {
		return "", "", fmt.Errorf("login con Office 365 no está configurado en el servidor")
	}

	var claims office365Claims
	var actualIssuer string
	token, err := jwt.ParseWithClaims(idToken, &claims, func(t *jwt.Token) (interface{}, error) {
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, fmt.Errorf("el token no trae kid")
		}
		key, issuer, err := getJWKSKey(kid)
		if err != nil {
			return nil, err
		}
		actualIssuer = issuer
		return rsaPublicKeyFromJWK(key)
	}, jwt.WithValidMethods([]string{"RS256"}))
	if err != nil {
		return "", "", fmt.Errorf("token inválido: %w", err)
	}
	if !token.Valid {
		return "", "", fmt.Errorf("token inválido")
	}

	if actualIssuer != "" && claims.Issuer != actualIssuer {
		return "", "", fmt.Errorf("el token no fue emitido por el tenant esperado")
	}

	clientID := azureClientID()
	audOK := false
	for _, a := range claims.Audience {
		if a == clientID {
			audOK = true
			break
		}
	}
	if !audOK {
		return "", "", fmt.Errorf("el token no fue emitido para esta aplicación")
	}

	userEmail := strings.TrimSpace(claims.Email)
	if userEmail == "" {
		// El claim "email" es opcional en la spec de OIDC — preferred_username
		// en un tenant de Azure AD casi siempre es el UPN (formato email).
		userEmail = strings.TrimSpace(claims.PreferredUsername)
	}
	if userEmail == "" {
		return "", "", fmt.Errorf("el token no trae un email verificable (ni email ni preferred_username)")
	}

	return userEmail, claims.Name, nil
}
