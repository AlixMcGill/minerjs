package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"github.com/joho/godotenv"
    _ "github.com/lib/pq"
)

var db *sql.DB

func initDB() {
    err := godotenv.Load()
    if err != nil {
        log.Fatal("Error loading .env file")
    }

    user := os.Getenv("DB_USER")
    password := os.Getenv("DB_PASSWORD")
    dbname :=  os.Getenv("DB_NAME")
    host := os.Getenv("DB_HOST")
    port := os.Getenv("DB_PORT")
    sslmode := os.Getenv("SSL_MODE")

    connStr := fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=%s", user, password, dbname, host, port, sslmode)
    db, err = sql.Open("postgres", connStr)
    if err != nil {
        panic(err)
    }

    // verify connection
    err = db.Ping()
    if err != nil {
        panic(err)
    }

    fmt.Println()
}

func main() {
    initDB()
    // serve static files
    fs := http.FileServer(http.Dir("./static"))
    http.Handle("/", fs)

    fmt.Println("Server started at http://localhost:8080")
    err := http.ListenAndServe(":8080", nil)
    if err != nil {
        panic(err)
    }
}
