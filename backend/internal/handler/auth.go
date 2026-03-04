package handler

import (
	"errors"
	"net/http"
	"zenso/internal/json"
	"zenso/internal/model"
	"zenso/internal/service"
	"zenso/internal/session"
	"zenso/internal/store"
	"zenso/internal/validator"
)

type AuthHandler struct {
	users       store.UserStore
	userService service.UserService
	authService service.AuthService

	session *session.Session
}

func NewAuthHandler(
	users store.UserStore,
	userService service.UserService,
	authService service.AuthService,
	session *session.Session,
) *AuthHandler {
	return &AuthHandler{
		users:       users,
		userService: userService,
		authService: authService,
		session:     session,
	}
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

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input model.UserLoginInput
	if err := json.Decode(r, &input); err != nil {
		json.BadRequest(w, "Invalid request body")
		return
	}

	v := validator.New()
	if errs := v.Validate(input); len(errs) > 0 {
		json.UnprocessedEntity(w, errs)
		return
	}

	user, err := h.authService.Authenticate(r.Context(), input)
	if err != nil {
		json.InternalError(w, err)
		return
	}

	h.session.Put(r.Context(), "USER_ID", user.ID)

	json.OK(w, map[string]*model.User{"ok": user})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := h.session.GetInt64(r.Context(), "USER_ID")

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		json.InternalError(w, err)
		return
	}

	json.OK(w, user)
}
