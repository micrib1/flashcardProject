package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
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

var flashcards = []Flashcard{}

func getFlashcards(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, flashcards)
}

func createFlashcard(c *gin.Context) {
	var newFlashcard Flashcard

	if err := c.BindJSON(&newFlashcard); err != nil {
		return
	}

	flashcards = append(flashcards, newFlashcard)
	c.IndentedJSON(http.StatusCreated, newFlashcard)
}

func main() {
	router := gin.Default()
	router.GET("/decks", getDecks)
	router.POST("/decks", createDeck)
	router.GET("/flashcards", getFlashcards)
	router.POST("/flashcards", createFlashcard)
	router.Run("localhost:8080")

}
