package store

import (
	"context"
	"zenso/internal/model"
)

type UserStore interface {
	Create(ctx context.Context, input model.CreateUserInput) error
}
