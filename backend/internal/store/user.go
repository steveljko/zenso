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

func (s *userStore) GetByID(ctx context.Context, id int) (*model.User, error) {
	var user model.User
	err := s.db.GetContext(ctx, &user, `
		SELECT id, name, email, password, created_at, updated_at
		FROM users WHERE id = ?`, id,
	)
	if err != nil {
		return nil, fmt.Errorf("getting user by id: %w", err)
	}

	return &user, nil
}

func (s *userStore) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	err := s.db.GetContext(ctx, &user, `
		SELECT id, name, email, password, created_at, updated_at
		FROM users WHERE email = ?`, email,
	)
	if err != nil {
		return nil, fmt.Errorf("getting user by email: %w", err)
	}

	return &user, nil
}

func (s *userStore) EmailExists(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx, `
        SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)`, email,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking email existence: %w", err)
	}
	return exists, nil
}
