package handler

import (
	"encoding/json"
	"net/http"
	"zenso/internal/model"
	"zenso/internal/response"
	"zenso/internal/store"
)

type AuthHandler struct {
	users store.UserStore
}

func NewAuthHandler(users store.UserStore) *AuthHandler {
	return &AuthHandler{users: users}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var input model.CreateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	err := h.users.Create(r.Context(), input)
	if err != nil {
		response.InternalError(w, err)
		return
	}

	response.Created(w, "User created!")
}
