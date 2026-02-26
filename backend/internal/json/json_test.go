package json

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func decodeBody(t *testing.T, body []byte) JSONResponse {
	t.Helper()
	var resp JSONResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	return resp
}

func TestRespond(t *testing.T) {
	tests := []struct {
		name            string
		status          int
		data            any
		wantStatus      int
		wantSuccess     bool
		wantDataPresent bool
	}{
		{
			name:            "200 OK with data",
			status:          http.StatusOK,
			data:            map[string]string{"key": "value"},
			wantStatus:      http.StatusOK,
			wantSuccess:     true,
			wantDataPresent: true,
		},
		{
			name:        "201 Created",
			status:      http.StatusCreated,
			data:        map[string]int{"id": 42},
			wantStatus:  http.StatusCreated,
			wantSuccess: true,
		},
		{
			name:        "400 Bad Request treated as failure",
			status:      http.StatusBadRequest,
			data:        nil,
			wantStatus:  http.StatusBadRequest,
			wantSuccess: false,
		},
		{
			name:        "500 Internal Server Error treated as failure",
			status:      http.StatusInternalServerError,
			data:        nil,
			wantStatus:  http.StatusInternalServerError,
			wantSuccess: false,
		},
		{
			name:        "299 boundary is success",
			status:      299,
			data:        nil,
			wantStatus:  299,
			wantSuccess: true,
		},
		{
			name:        "300 boundary is failure",
			status:      300,
			data:        nil,
			wantStatus:  300,
			wantSuccess: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			Respond(w, tt.status, tt.data)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tt.wantStatus)
			}
			if ct := w.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", ct)
			}

			resp := decodeBody(t, w.Body.Bytes())
			if resp.Success != tt.wantSuccess {
				t.Errorf("success = %v, want %v", resp.Success, tt.wantSuccess)
			}
		})
	}
}

func TestRespondWithError(t *testing.T) {
	tests := []struct {
		name        string
		status      int
		message     string
		wantStatus  int
		wantMessage string
	}{
		{
			name:        "bad request with message",
			status:      http.StatusBadRequest,
			message:     "invalid input",
			wantStatus:  http.StatusBadRequest,
			wantMessage: "invalid input",
		},
		{
			name:        "unauthorized",
			status:      http.StatusUnauthorized,
			message:     "token expired",
			wantStatus:  http.StatusUnauthorized,
			wantMessage: "token expired",
		},
		{
			name:        "empty message",
			status:      http.StatusBadRequest,
			message:     "",
			wantStatus:  http.StatusBadRequest,
			wantMessage: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			RespondWithError(w, tt.status, tt.message)

			if w.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tt.wantStatus)
			}

			resp := decodeBody(t, w.Body.Bytes())
			if resp.Success {
				t.Error("success should be false for error responses")
			}
			if resp.Error != tt.wantMessage {
				t.Errorf("error = %q, want %q", resp.Error, tt.wantMessage)
			}
		})
	}
}

func TestOK(t *testing.T) {
	tests := []struct {
		name string
		data any
	}{
		{"with string data", "hello"},
		{"with struct data", map[string]int{"count": 5}},
		{"with nil data", nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			OK(w, tt.data)

			if w.Code != http.StatusOK {
				t.Errorf("status = %d, want 200", w.Code)
			}

			resp := decodeBody(t, w.Body.Bytes())
			if !resp.Success {
				t.Error("success should be true for OK response")
			}
		})
	}
}

func TestCreated(t *testing.T) {
	tests := []struct {
		name string
		data any
	}{
		{"with data", map[string]string{"id": "abc123"}},
		{"with nil", nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			Created(w, tt.data)

			if w.Code != http.StatusCreated {
				t.Errorf("status = %d, want 201", w.Code)
			}

			resp := decodeBody(t, w.Body.Bytes())
			if !resp.Success {
				t.Error("success should be true for Created response")
			}
		})
	}
}

func TestNoContent(t *testing.T) {
	t.Run("returns 204 with no body", func(t *testing.T) {
		w := httptest.NewRecorder()
		NoContent(w)

		if w.Code != http.StatusNoContent {
			t.Errorf("status = %d, want 204", w.Code)
		}
		if w.Body.Len() != 0 {
			t.Errorf("expected empty body, got %q", w.Body.String())
		}
	})
}

func TestBadRequest(t *testing.T) {
	tests := []struct {
		name    string
		message string
	}{
		{"with message", "field 'email' is required"},
		{"empty message", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			BadRequest(w, tt.message)

			if w.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want 400", w.Code)
			}

			resp := decodeBody(t, w.Body.Bytes())
			if resp.Success {
				t.Error("success should be false")
			}
			if resp.Error != tt.message {
				t.Errorf("error = %q, want %q", resp.Error, tt.message)
			}
		})
	}
}

func TestUnauthorized(t *testing.T) {
	tests := []struct {
		name        string
		message     string
		wantMessage string
	}{
		{"custom message", "token invalid", "token invalid"},
		{"empty message defaults", "", "Unauthorized"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			Unauthorized(w, tt.message)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("status = %d, want 401", w.Code)
			}

			resp := decodeBody(t, w.Body.Bytes())
			if resp.Success {
				t.Error("success should be false")
			}
			if resp.Error != tt.wantMessage {
				t.Errorf("error = %q, want %q", resp.Error, tt.wantMessage)
			}
		})
	}
}

func TestNotFound(t *testing.T) {
	tests := []struct {
		name        string
		message     string
		wantMessage string
	}{
		{"custom message", "user not found", "user not found"},
		{"empty message defaults", "", "Resource not found"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			NotFound(w, tt.message)

			if w.Code != http.StatusNotFound {
				t.Errorf("status = %d, want 404", w.Code)
			}

			resp := decodeBody(t, w.Body.Bytes())
			if resp.Success {
				t.Error("success should be false")
			}
			if resp.Error != tt.wantMessage {
				t.Errorf("error = %q, want %q", resp.Error, tt.wantMessage)
			}
		})
	}
}

func TestInternalError(t *testing.T) {
	tests := []struct {
		name string
		err  error
	}{
		{"generic error", errors.New("db connection refused")},
		{"wrapped error", errors.New("context deadline exceeded")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			InternalError(w, tt.err)

			if w.Code != http.StatusInternalServerError {
				t.Errorf("status = %d, want 500", w.Code)
			}

			resp := decodeBody(t, w.Body.Bytes())
			if resp.Success {
				t.Error("success should be false")
			}
			if strings.Contains(resp.Error, tt.err.Error()) {
				t.Errorf("internal error details leaked to client: %q", resp.Error)
			}
			if resp.Error != "An unexpected error occurred" {
				t.Errorf("error = %q, want generic message", resp.Error)
			}
		})
	}
}

func TestUnprocessedEntity(t *testing.T) {
	tests := []struct {
		name string
		data any
	}{
		{"with error string", "validation failed"},
		{"with validation errors slice", []map[string]string{
			{"field": "email", "error": "invalid format"},
			{"field": "age", "error": "must be positive"},
		}},
		{"with struct", map[string]string{"field": "email", "error": "invalid format"}},
		{"with nil", nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			UnprocessedEntity(w, tt.data)

			if w.Code != http.StatusUnprocessableEntity {
				t.Errorf("status = %d, want 422", w.Code)
			}

			resp := decodeBody(t, w.Body.Bytes())
			if resp.Success {
				t.Error("success should be false for unprocessable entity response")
			}
		})
	}
}

func TestDecode(t *testing.T) {
	type payload struct {
		Name string `json:"name"`
		Age  int    `json:"age"`
	}

	tests := []struct {
		name    string
		body    string
		wantErr bool
		want    payload
	}{
		{
			name:    "valid JSON",
			body:    `{"name":"Alice","age":30}`,
			wantErr: false,
			want:    payload{Name: "Alice", Age: 30},
		},
		{
			name:    "empty object",
			body:    `{}`,
			wantErr: false,
			want:    payload{},
		},
		{
			name:    "invalid JSON",
			body:    `not-json`,
			wantErr: true,
		},
		{
			name:    "partial fields",
			body:    `{"name":"Bob"}`,
			wantErr: false,
			want:    payload{Name: "Bob", Age: 0},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(tt.body))
			var got payload
			err := Decode(r, &got)

			if (err != nil) != tt.wantErr {
				t.Errorf("Decode() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("Decode() = %+v, want %+v", got, tt.want)
			}
		})
	}
}
