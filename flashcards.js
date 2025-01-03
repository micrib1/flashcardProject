import fetch from "https://cdn.skypack.dev/node-fetch"

async function getQueryParam(param) {
    const urlParam = new URLSearchParams(window.location.search)
    console.log(urlParam.get(param))
    return urlParam.get(param)
}

async function getDecks() {
    const decks = await fetch("http://localhost:8080/decks").then((data) => data.json());
    for (const deck of decks) {
        console.log(deck)
    }
}

async function createDeck(name, author) {
    const data = {
        name, author,
    }

    const result = await fetch("http://localhost:8080/decks", {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify(data)
    })

    if(result.ok) {
    const url = `http://127.0.0.1:5500/addDeck.html?name=${encodeURIComponent(name)}&author=${encodeURIComponent(author)}`
    window.history.pushState({}, "", url)
    } else {
        const errorMsg = await result.text()
        console.error("Error creating deck:", errorMsg)
    }

    console.log(result)
}

async function createFlashcard() {
    const question = document.getElementById("question").value;
    const answer = document.getElementById("answer").value;

    const name = await getQueryParam("name")
    const author = await getQueryParam("author")

    const deckID = await getDeckID(name, author);

    if (!deckID) {
        console.error("Deck ID not found")
        return;
    }
    
    const data = {
        question, answer, deck_id: deckID,
    }

    const fetchLocation = `http://localhost:8080/flashcards?name=${encodeURIComponent(name)}&author=${encodeURIComponent(author)}`
    const result = await fetch(fetchLocation, {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify(data)
    })

    console.log(result)
}

async function getDeckID(name, author) {
    const response = await fetch(`http://localhost:8080/decks?name=${encodeURIComponent(name)}&author=${encodeURIComponent(author)}`)
    const decks = await response.json()
    if (decks && decks.length > 0) {
        return decks[0].id;
    } else {
        console.error("Deck not found")
        return null
    }
}

async function getFormInputs() {
    const addDeckForm = document.getElementById("addDeckForm")
    const addFlashcardForm = document.getElementById("addFlashcardForm")
    const insertDeckButton = document.getElementById("insertDeckButton")

    addDeckForm.addEventListener("submit", async function(event) {
        event.preventDefault()
        const name = document.getElementById("deckNameInput").value
        const author = document.getElementById("authorNameInput").value
        await createDeck(name, author)

        //hide deck form, show flashcard form
        addDeckForm.parentElement.classList.add("hidden")
        addFlashcardForm.parentElement.classList.remove("hidden")
    })
    addFlashcardForm.addEventListener("submit", function(event) {
        event.preventDefault()
        createFlashcard()
    })
    insertDeckButton.addEventListener("click", function(event) {
        event.preventDefault()
        console.log("TEST - Button works")
    })
}

getFormInputs()