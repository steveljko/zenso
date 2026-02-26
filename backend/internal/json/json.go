package json

import (
	"encoding/json"
	"log"
	"net/http"
)

type JSONResponse struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// Respond is the base helper that handles the JSON encoding.
func Respond(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	resp := JSONResponse{
		Success: status >= 200 && status < 300,
		Data:    data,
	}

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Error encoding JSON: %v", err)
	}
}

func RespondWithError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	resp := JSONResponse{
		Success: false,
		Error:   message,
	}

	json.NewEncoder(w).Encode(resp)
}

func OK(w http.ResponseWriter, data any) {
	Respond(w, http.StatusOK, data)
}

func Created(w http.ResponseWriter, data any) {
	Respond(w, http.StatusCreated, data)
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func BadRequest(w http.ResponseWriter, message string) {
	RespondWithError(w, http.StatusBadRequest, message)
}

func Unauthorized(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Unauthorized"
	}
	RespondWithError(w, http.StatusUnauthorized, message)
}

func NotFound(w http.ResponseWriter, message string) {
	if message == "" {
		message = "Resource not found"
	}
	RespondWithError(w, http.StatusNotFound, message)
}

// InternalError logs the full error details server-side and returns a generic
// 500 message to the client to avoid leaking internal implementation details.
func InternalError(w http.ResponseWriter, err error) {
	log.Printf("Internal Server Error: %v", err)
	RespondWithError(w, http.StatusInternalServerError, "An unexpected error occurred")
}

func UnprocessedEntity(w http.ResponseWriter, err any) {
	Respond(w, http.StatusUnprocessableEntity, err)
}

func Decode(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
