package store

import (
	"context"
	"fmt"
	"zenso/internal/model"
	"zenso/internal/utils"

	"github.com/jmoiron/sqlx"
)

type userStore struct {
	db *sqlx.DB
}

func NewUserStore(db *sqlx.DB) UserStore {
	return &userStore{db: db}
}

func (s *userStore) Create(ctx context.Context, input model.CreateUserInput) error {
	hash, err := utils.HashPassword(input.Password)
	if err != nil {
		return fmt.Errorf("hashing password: %w", err)
	}

	_, err = s.db.ExecContext(ctx, `
    INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
		input.Name, input.Email, hash,
	)
	if err != nil {
		return fmt.Errorf("creating user: %w", err)
	}

	return nil
}
