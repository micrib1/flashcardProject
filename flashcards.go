package main

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/gin-contrib/cors"

	"errors"
)

type Deck struct {
	Name       string      `json:"name"`
	Author     string      `json:"author"`
	Flashcards []Flashcard `json:"flashcards"`
}

type Flashcard struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
	Counter  int    `json:"counter"`
}

var decks = []Deck{}

func getDecks(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, decks)
}

func createDeck(c *gin.Context) {
	var newDeck Deck

	if err := c.BindJSON(&newDeck); err != nil {
		return
	}

	decks = append(decks, newDeck)
	c.IndentedJSON(http.StatusCreated, newDeck)
}

func getDeckByName(name string, author string) (*Deck, error) {
	for i, d := range decks {
		if d.Name == name && d.Author == author {
			return &decks[i], nil
		}
	}
	return nil, errors.New("Deck not found")
}

var flashcards = []Flashcard{}

func getFlashcards(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, flashcards)
}

func createFlashcard(c *gin.Context) {
	var newFlashcard Flashcard

	if err := c.BindJSON(&newFlashcard); err != nil {
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

	deck.Flashcards = append(deck.Flashcards, newFlashcard)
	c.IndentedJSON(http.StatusCreated, newFlashcard)
}

func main() {
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
