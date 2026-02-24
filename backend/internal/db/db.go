package db

import (
	"fmt"
	"log"

	"zenso/internal/config"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"github.com/pressly/goose/v3"
)

func New(cfg config.DBConfig) (*sqlx.DB, error) {
	// WAL mode enabled for better concurrent read performance
	dsn := cfg.DSN + "?_journal=WAL&_foreign_keys=on&_busy_timeout=5000"

	db, err := sqlx.Connect("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("connecting to database: %w", err)
	}

	db.SetMaxOpenConns(1) // sqlite only supports one writer at a time
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("pinging database: %w", err)
	}

	return db, nil
}

// RunMigrations checks the current schema version and applies any pending migrations.
func RunMigrations(db *sqlx.DB, migrationsDir string) error {
	if err := goose.SetDialect("sqlite"); err != nil {
		return fmt.Errorf("failed to select dialect: %v", err)
	}

	curr, err := goose.GetDBVersion(db.DB)
	if err != nil {
		return fmt.Errorf("failed to get current migration version: %v", err)
	}

	log.Printf("Current migration version: %d", curr)

	if err = goose.Up(db.DB, migrationsDir); err != nil {
		return fmt.Errorf("failed to apply migrations: %v", err)
	}

	newVersion, err := goose.GetDBVersion(db.DB)
	if err != nil {
		return err
	}

	if newVersion > curr {
		log.Printf("Successfully migrated from version %d to %d", curr, newVersion)
	} else {
		log.Printf("Database is already up to date at version %d", curr)
	}

	return nil
}
