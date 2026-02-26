package service

import (
	"context"
	"zenso/internal/model"
)

type UserService interface {
	CreateUser(ctx context.Context, input model.CreateUserInput) (*model.User, error)
}
