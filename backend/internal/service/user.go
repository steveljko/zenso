package service

import (
	"context"
	"errors"
	"zenso/internal/model"
	"zenso/internal/store"
)

type userService struct {
	users store.UserStore
}

func NewUserService(users store.UserStore) UserService {
	return &userService{users: users}
}

var ErrEmailTaken = errors.New("email already in use")

func (s *userService) CreateUser(ctx context.Context, input model.CreateUserInput) (*model.User, error) {
	exists, err := s.users.EmailExists(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrEmailTaken
	}

	if err = s.users.Create(ctx, input); err != nil {
		return nil, err
	}

	user, err := s.users.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	return user, nil
}
