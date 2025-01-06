package main

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/gin-contrib/cors"

	"github.com/joho/godotenv"

	"database/sql"

	"fmt"

	"os"

	"log"

	_ "github.com/tursodatabase/libsql-client-go/libsql"
)

type Deck struct {
	ID         int64       `json:"id"`
	Name       string      `json:"name"`
	Author     string      `json:"author"`
	Flashcards []Flashcard `json:"flashcards"`
}

type Flashcard struct {
	ID       int64  `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
	Counter  int    `json:"counter"`
	DeckID   int64  `json:"deck_id"`
}

var db *sql.DB
var decks = []Deck{}

func getDecks(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, decks)
}

func createDeck(c *gin.Context) {
	var newDeck Deck

	if err := c.BindJSON(&newDeck); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid JSON"})
		return
	}

	deckID, err := insertDeck(newDeck)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save deck"})
		return
	}

	c.IndentedJSON(http.StatusCreated, gin.H{"message": "Deck created", "deck_id": deckID})
}

func insertDeck(deck Deck) (int64, error) {

	stmt, err := db.Prepare("INSERT INTO decks (name, author) VALUES (?, ?)")
	if err != nil {
		log.Println("Error preparing statement", "statement: ", stmt, "deck: ", deck, "error: ", err)
		return 0, err
	}
	defer stmt.Close()

	result, err := stmt.Exec(deck.Name, deck.Author)
	if err != nil {
		log.Println("Error executing statement:", deck.Name, deck.Author, " Error: ", err)
		return 0, err
	}

	deckID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return deckID, nil
}

func getDeckByName(name string, author string) (*Deck, error) {
	query := "SELECT id, name, author FROM decks WHERE name = ? AND author = ?"
	row := db.QueryRow(query, name, author)

	var deck Deck
	if err := row.Scan(&deck.ID, &deck.Name, &deck.Author); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("Deck not found")
		}
		return nil, err
	}

	return &deck, nil
}

var flashcards = []Flashcard{}

func getFlashcards(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, flashcards)
}

func createFlashcard(c *gin.Context) {
	var newFlashcard Flashcard

	if err := c.BindJSON(&newFlashcard); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid JSON"})
		return
	}

	name, ok := c.GetQuery("name")

	if !ok {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"message": "Missing name query parameter."})
		return
	}

	author, ok := c.GetQuery("author")

	if !ok {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"message": "Missing author query parameter."})
		return
	}

	deck, err := getDeckByName(name, author)

	if err != nil {
		c.IndentedJSON(http.StatusNotFound, gin.H{"message": "Deck not found."})
		return
	}

	err = insertFlashcard(deck.ID, newFlashcard)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save flashcard"})
		return
	}

	c.IndentedJSON(http.StatusCreated, gin.H{"message": "Flashcard created"})
}

func insertFlashcard(deckID int64, flashcard Flashcard) error {
	stmt, err := db.Prepare("INSERT INTO flashcards (question, answer, counter, deck_id) VALUES (?, ?, ?, ?)")
	if err != nil {
		return err
	}

	_, err = stmt.Exec(flashcard.Question, flashcard.Answer, flashcard.Counter, deckID)
	return err
}

func runDB() (db *sql.DB, err error) {
	dbUrl := os.Getenv("TURSO_DATABASE_URL")
	if dbUrl == "" {
		return nil, fmt.Errorf("TURSO_DATABASE_URL environment variable not set")
	}

	authToken := os.Getenv("TURSO_AUTH_TOKEN")
	if authToken != "" {
		dbUrl += "?authToken=" + authToken
	}

	db, err = sql.Open("libsql", dbUrl)
	if err != nil {
		return nil, fmt.Errorf("error opening cloud db %w", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	} else {
		log.Println("Database pinged successfully")
	}

	return db, nil
}

func main() {
	log.Println("starting program...")

	var err error
	err = godotenv.Load(".env")
	log.Println("loading environment...")
	if err != nil {
		log.Println("Error loading .env file")
	} else {
		log.Println(".env file loaded")
	}

	log.Println("initializing database...")
	if db, err = runDB(); err != nil {
		fmt.Fprintf(os.Stderr, "error running: %v\n", err)
		os.Exit(1)
	} else {
		fmt.Fprintf(os.Stdout, "database connected successfully")
		log.Println("database running...")
	}
	defer db.Close()

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://127.0.0.1:5500"},
		AllowMethods:     []string{"PUT", "PATCH", "POST", "DELETE", "GET"},
		AllowHeaders:     []string{"Content-type"},
		AllowCredentials: true,
	}))
	router.GET("/decks", getDecks)
	router.POST("/decks", createDeck)
	router.GET("/flashcards", getFlashcards)
	router.POST("/flashcards", createFlashcard)
	router.Run("localhost:8080")
}
