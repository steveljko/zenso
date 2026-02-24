package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"zenso/internal/config"
	"zenso/internal/db"
	"zenso/internal/handler"
	"zenso/internal/store"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	godotenv.Load()

	cfg := config.Load()

	dbConn, err := db.New(cfg.DB)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer dbConn.Close()

	const migrationDir = "migrations/"
	logger.Info("running database migrations")
	if err = db.RunMigrations(dbConn, migrationDir); err != nil {
		logger.Error("failed to run migrations")
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Server.Port),
		Handler:      routes(dbConn),
		IdleTimeout:  time.Minute,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	shutdownErr := make(chan error)

	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		sig := <-quit

		logger.Info("shutting down server", "signal", sig.String())

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		shutdownErr <- srv.Shutdown(ctx)
	}()

	logger.Info("starting server", "addr", srv.Addr)

	err = srv.ListenAndServe()
	if !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}

	if err = <-shutdownErr; err != nil {
		logger.Error("graceful shutdown error", "error", err)
		os.Exit(1)
	}

	logger.Info("server stopped")
}

// routes initializes the internal API router and wires up handlers with their dependencies.
func routes(db *sqlx.DB) http.Handler {
	healthHandler := handler.NewHealthHandler()

	userStore := store.NewUserStore(db)
	authHandler := handler.NewAuthHandler(userStore)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", healthHandler.Get)

	mux.HandleFunc("POST /register", authHandler.Register)

	return mux
}
