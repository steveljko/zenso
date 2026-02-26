package handler

import (
	"errors"
	"net/http"
	"zenso/internal/json"
	"zenso/internal/model"
	"zenso/internal/service"
	"zenso/internal/store"
	"zenso/internal/validator"
)

type AuthHandler struct {
	users       store.UserStore
	userService service.UserService
}

func NewAuthHandler(users store.UserStore, userService service.UserService) *AuthHandler {
	return &AuthHandler{users: users, userService: userService}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var input model.CreateUserInput
	if err := json.Decode(r, &input); err != nil {
		json.BadRequest(w, "Invalid request body")
		return
	}

	v := validator.New()
	if errs := v.Validate(input); len(errs) > 0 {
		json.UnprocessedEntity(w, errs)
		return
	}

	user, err := h.userService.CreateUser(r.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrEmailTaken) {
			json.UnprocessedEntity(w, map[string]string{"email": "Email is already in use."})
			return
		}
		json.InternalError(w, err)
		return
	}

	json.Created(w, user)
}
