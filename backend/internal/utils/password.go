package utils

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"

	"golang.org/x/crypto/argon2"
)

type Argon2Params struct {
	time    uint32
	memory  uint32
	threads uint8
	keyLen  uint32
	saltLen uint32
}

var defaultParams = Argon2Params{
	time:    1,
	memory:  64 * 1024,
	threads: 4,
	keyLen:  32,
	saltLen: 16,
}

func HashPassword(password string) (string, error) {
	salt := make([]byte, defaultParams.saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt,
		defaultParams.time, defaultParams.memory, defaultParams.threads, defaultParams.keyLen)

	return base64.RawStdEncoding.EncodeToString(salt) + "$" +
		base64.RawStdEncoding.EncodeToString(hash), nil
}

func VerifyPassword(password, encoded string) (bool, error) {
	parts := splitEncoded(encoded)
	if len(parts) != 2 {
		return false, errors.New("invalid hash format")
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[0])
	if err != nil {
		return false, err
	}
	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil {
		return false, err
	}
	hash := argon2.IDKey([]byte(password), salt,
		defaultParams.time, defaultParams.memory, defaultParams.threads, uint32(len(expectedHash)))

	return subtle.ConstantTimeCompare(hash, expectedHash) == 1, nil
}

func splitEncoded(s string) []string {
	for i, c := range s {
		if c == '$' {
			return []string{s[:i], s[i+1:]}
		}
	}
	return nil
}
