package store

import (
	"context"
	"errors"
	"zenso/internal/model"
)

var ErrNotFound = errors.New("not found")

type UserStore interface {
	Create(ctx context.Context, input model.CreateUserInput) error
	GetByID(ctx context.Context, id int) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	EmailExists(ctx context.Context, email string) (bool, error)
}
