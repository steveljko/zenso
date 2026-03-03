package middleware

import (
	"log"
	"net/http"
	"zenso/internal/json"
	"zenso/internal/session"
)

// RequireAuth prevents unauthorized users from accessing protected routes.
func RequireAuth(s *session.Session) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := s.GetInt64(r.Context(), "USER_ID")
			log.Println(userID)
			if userID == 0 {
				json.BadRequest(w, "Unauthorized")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireGuest redirects authenticated users away from auth routes.
func RequireGuest(s *session.Session) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := s.GetInt64(r.Context(), "USER_ID")
			log.Println(userID)
			if userID != 0 {
				json.BadRequest(w, "Already authenticated")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
