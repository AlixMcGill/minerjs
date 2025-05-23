package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var db *sql.DB

type Login struct {
    HasedPassword string
    SessionToken string
    CSRFToken string
}

// Key is the username
// convert to database later
var users = map[string]Login{}

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

    http.HandleFunc("/register", register)
    http.HandleFunc("/login", login)
    http.HandleFunc("/logout", logout)
    http.HandleFunc("/protected", protected)

    fmt.Println("Server started at http://localhost:8080")
    err := http.ListenAndServe(":8080", nil)
    if err != nil {
        panic(err)
    }
}

func register(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        er := http.StatusMethodNotAllowed
        http.Error(w, "Invalid method", er)
        return
    }

    username := r.FormValue("username")
    password := r.FormValue("password")

    if len(username) < 8 || len(password) < 8 {
        er:= http.StatusNotAcceptable
        http.Error(w, "Invalid username/password", er)
        return
    }

    if _, ok := users[username]; ok {
        er := http.StatusConflict
        http.Error(w, "User already exists", er)
        return
    }

    hashedPassword, _ := hashPassword(password)
    users[username] = Login{
        HasedPassword: hashedPassword,
    }

    fmt.Fprintln(w, "User registered successfully!")
}

func login(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        er := http.StatusMethodNotAllowed
        http.Error(w, "Invalid method", er)
        return
    }

    username := r.FormValue("username")
    password := r.FormValue("password")

    user, ok := users[username]
    if !ok || !checkPasswordHash(password, user.HasedPassword) {
        er := http.StatusUnauthorized
        http.Error(w, "Invalid username or password", er)
        return
    }

    sessionToken := generateToken(32)
    csrfToken := generateToken(32)

    // set session cookie
    http.SetCookie(w, &http.Cookie{
        Name: "session_token",
        Value: sessionToken,
        Expires: time.Now().Add(24 * time.Hour),
        HttpOnly: true,
    })

    // set CSRF token in a cookie
    http.SetCookie(w, &http.Cookie{
        Name: "csrf_token",
        Value: csrfToken,
        Expires: time.Now().Add(24 * time.Hour),
        HttpOnly: false,
    })

    // store token in database
    user.SessionToken = sessionToken
    user.CSRFToken = csrfToken
    users[username] = user

    fmt.Fprintln(w, "Login successful!")
}

func logout(w http.ResponseWriter, r *http.Request) {
    if err := Authorize(r); err != nil {
        er := http.StatusUnauthorized
        http.Error(w, "Unauthorized", er)
        return
    }

    // clear cookies
    http.SetCookie(w, &http.Cookie{
        Name: "session_token",
        Value: "",
        Expires: time.Now().Add(24 * time.Hour),
        HttpOnly: true,
    })
    http.SetCookie(w, &http.Cookie{
        Name: "csrf_token",
        Value: "",
        Expires: time.Now().Add(24 * time.Hour),
        HttpOnly: false,
    })

    // clear the tokens from the database

    username := r.FormValue("username")
    user, _ := users[username]
    user.SessionToken = ""
    user.CSRFToken = ""
    users[username] = user

    fmt.Fprintf(w, "Logged out successfully!")
}

func protected(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        er := http.StatusMethodNotAllowed
        http.Error(w, "Invalid request method", er)
        return
    }

    if err := Authorize(r); err != nil {
        er := http.StatusUnauthorized
        http.Error(w, "Unauthorized", er)
        return
    }

    username := r.FormValue("username")
    fmt.Fprintf(w, "CSRF validation successful! Welcome, %s", username)
}
