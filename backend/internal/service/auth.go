package service

import (
	"context"
	"errors"
	"zenso/internal/model"
	"zenso/internal/store"
	"zenso/internal/utils"
)

type authService struct {
	users store.UserStore
}

func NewAuthService(users store.UserStore) AuthService {
	return &authService{users: users}
}

var ErrInvalidCreds = errors.New("invalid credentials")

func (s *authService) Authenticate(ctx context.Context, input model.UserLoginInput) (*model.User, error) {
	user, err := s.users.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, ErrInvalidCreds
	}

	ok, err := utils.VerifyPassword(input.Password, user.Password)
	if err != nil {
		return nil, ErrInvalidCreds
	}
	if !ok {
		return nil, ErrInvalidCreds
	}

	return user, nil
}
