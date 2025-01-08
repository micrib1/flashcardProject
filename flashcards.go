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

	"strconv"

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
	Counter  int64  `json:"counter"`
	DeckID   int64  `json:"deck_id"`
}

var db *sql.DB
var decks = []Deck{}
var flashcards = []Flashcard{}

func getDecks(c *gin.Context) {
	rows, err := db.Query("SELECT * FROM decks")
	if err != nil {
		log.Println("Error querying database for decks: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch decks"})
		return
	}
	defer rows.Close()

	decks = []Deck{}
	for rows.Next() {
		var deck Deck
		if err := rows.Scan(&deck.ID, &deck.Name, &deck.Author); err != nil {
			log.Println("Error scanning row into deck struct: ", err)
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to parse deck"})
			return
		}
		decks = append(decks, deck)
	}

	if err := rows.Err(); err != nil {
		log.Println("Error iterating rows: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to retrieve decks"})
		return
	}

	c.IndentedJSON(http.StatusOK, decks)
	log.Println("decks: ", decks)
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

func getFlashcards(c *gin.Context) {
	//DeckID sent as string via JSON - accept as string and convert to int64
	var data struct {
		DeckID string `json:"deck_id"`
	}

	if err := c.BindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid JSON"})
	}
	log.Println("deckID as string: ", data.DeckID)

	deckID, err := strconv.ParseInt(data.DeckID, 10, 64)
	if err != nil {
		log.Println("Error converting deckID to int64: ", err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid deck_id format"})
		return
	}

	//set flashcards to empty slice and populate with deck flashcards
	flashcards = []Flashcard{}
	rows, err := db.Query("SELECT id, question, answer, counter, deck_id FROM flashcards WHERE deck_id = ?", deckID)
	if err != nil {
		log.Println("Error querying database for flashcards: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch flashcards"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var flashcard Flashcard
		if err := rows.Scan(&flashcard.ID, &flashcard.Question, &flashcard.Answer, &flashcard.Counter, &flashcard.DeckID); err != nil {
			log.Println("Error scanning row into flashcard struct: ", err)
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to parse flashcard data"})
			return
		}
		flashcards = append(flashcards, flashcard)
	}

	if err := rows.Err(); err != nil {
		log.Println("Error iterating rows: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to retrieve flashcards"})
		return
	}
	c.JSON(http.StatusOK, flashcards)
	log.Println(flashcards)
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
	router.POST("/get-flashcards", getFlashcards)
	router.POST("/flashcards", createFlashcard)
	router.Run("localhost:8080")
}
