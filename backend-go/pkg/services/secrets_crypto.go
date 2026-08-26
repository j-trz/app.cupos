package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"log"
	"os"
	"strings"
)

// encSecretPrefix marca un valor cifrado por EncryptSecret — permite
// distinguir uno ya cifrado de uno en texto plano (dato legacy guardado antes
// de que esto existiera, o un valor recién tipeado en un formulario de "test
// de conexión" que nunca pasó por acá) sin necesitar una migración aparte:
// los valores viejos se re-encriptan solos la próxima vez que se guardan, y
// DecryptSecret sigue leyendo los que todavía no lo estén.
const encSecretPrefix = "enc:v1:"

func secretsEncryptionKey() []byte {
	passphrase := os.Getenv("SECRETS_ENCRYPTION_KEY")
	if passphrase == "" {
		return nil
	}
	// SHA-256 de la passphrase da una clave de 32 bytes válida para
	// AES-256-GCM, sin exigirle al operador que genere/pegue un valor de
	// longitud exacta en la variable de entorno.
	sum := sha256.Sum256([]byte(passphrase))
	return sum[:]
}

// EncryptSecret cifra un valor sensible (ej. AtlasConfig.Clave) con
// AES-256-GCM antes de guardarlo en la base. Si SECRETS_ENCRYPTION_KEY no
// está configurada, devuelve el valor tal cual (mismo comportamiento que
// había antes de que esto existiera) y deja una advertencia en el log — no
// bloquea el guardado por no tener todavía la variable de entorno cargada.
func EncryptSecret(plain string) string {
	if plain == "" {
		return plain
	}
	key := secretsEncryptionKey()
	if key == nil {
		log.Println("WARNING: SECRETS_ENCRYPTION_KEY no está configurada — guardando credencial sin cifrar")
		return plain
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		log.Printf("EncryptSecret: %v — guardando sin cifrar", err)
		return plain
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		log.Printf("EncryptSecret: %v — guardando sin cifrar", err)
		return plain
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		log.Printf("EncryptSecret: %v — guardando sin cifrar", err)
		return plain
	}
	sealed := gcm.Seal(nonce, nonce, []byte(plain), nil)
	return encSecretPrefix + base64.StdEncoding.EncodeToString(sealed)
}

// DecryptSecret revierte EncryptSecret. Si el valor no tiene el prefijo de
// cifrado lo devuelve tal cual (legacy en texto plano, o un valor recién
// tipeado que nunca pasó por EncryptSecret) — nunca rompe contra un valor en
// texto plano.
func DecryptSecret(value string) string {
	if !strings.HasPrefix(value, encSecretPrefix) {
		return value
	}
	key := secretsEncryptionKey()
	if key == nil {
		log.Println("WARNING: valor cifrado pero SECRETS_ENCRYPTION_KEY no está configurada — no se puede leer")
		return ""
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(value, encSecretPrefix))
	if err != nil {
		log.Printf("DecryptSecret: %v", err)
		return ""
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		log.Printf("DecryptSecret: %v", err)
		return ""
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		log.Printf("DecryptSecret: %v", err)
		return ""
	}
	nonceSize := gcm.NonceSize()
	if len(raw) < nonceSize {
		log.Println("DecryptSecret: valor cifrado corrupto o truncado")
		return ""
	}
	nonce, ciphertext := raw[:nonceSize], raw[nonceSize:]
	plain, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		log.Printf("DecryptSecret: %v", err)
		return ""
	}
	return string(plain)
}
