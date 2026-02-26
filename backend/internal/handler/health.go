package handler

import (
	"net/http"
	"zenso/internal/json"
)

type HealthHandler struct {
}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Get(w http.ResponseWriter, r *http.Request) {
	json.OK(w, map[string]string{"status": "ok"})
}
