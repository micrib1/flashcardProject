import fetch from "https://cdn.skypack.dev/node-fetch"

let flashcards = []

async function getQueryParam(param) {
    const urlParam = new URLSearchParams(window.location.search)
    console.log(urlParam.get(param))
    return urlParam.get(param)
}

async function getDecks() {
    const decks = await fetch("http://localhost:8080/decks").then((data) => data.json());
    const deckList = document.getElementById("deckList");
    deckList.innerHTML = '';
    for (const deck of decks) {
        const div = document.createElement('div');

        const input = document.createElement('input');
        input.type = 'radio';
        input.id = `deck-${deck.id}`;
        input.name = 'deck';
        input.value = deck.id;

        const label = document.createElement('label');
        label.setAttribute('for', `deck-${deck.id}`);
        label.textContent = `${deck.name} - ${deck.author}`;

        div.appendChild(input);
        div.appendChild(label);
        deckList.appendChild(div);
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
    
    const data = {
        question, answer,
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

async function getFlashcards() {
    const deckSelection = document.querySelector('input[name="deck"]:checked')
    if (!deckSelection) {
        alert("No deck selected, please select a deck.")
        return
    }
    const deckID = deckSelection.value
    console.log(deckID)

    await fetch("http://localhost:8080/get-flashcards", {
        method: "POST",
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify({ deck_id: deckID }),
    })
    .then((result) => {
        console.log(JSON.stringify({ deck_id: deckID}))
        if (!result.ok) {
            throw new Error("Failed to fetch flashcards")
        }
        return result.json()
    })
    .then((fetchedFlashcards) => {
        console.log("fetched flaschards: ", fetchedFlashcards)
        flashcards = [...flashcards, ...fetchedFlashcards]
        console.log("Flashcards updated: ", flashcards)
    })
    .catch((error) => {
        console.error("Error fetching flashcards: ", error)
    })
}

async function runEventListeners() {
    const addDeckForm = document.getElementById("addDeckForm")
    const addFlashcardForm = document.getElementById("addFlashcardForm")
    const finishButton = document.getElementById("finishButton")
    const newGameButton = document.getElementById("newGameButton")

    if (newGameButton) {
        newGameButton.addEventListener("click", function(event) {
            event.preventDefault()
            getFlashcards()
        })
    }

    if (addDeckForm) {
        addDeckForm.addEventListener("submit", async function(event) {
            event.preventDefault()
            const name = document.getElementById("deckNameInput").value
            const author = document.getElementById("authorNameInput").value
            await createDeck(name, author)

            //hide deck form, show flashcard form
            addDeckForm.parentElement.classList.add("hidden")
            addFlashcardForm.parentElement.classList.remove("hidden")
        })
    }

    if (addFlashcardForm) {
        addFlashcardForm.addEventListener("submit", function(event) {
            event.preventDefault()
            createFlashcard()
        })
    }

    if (finishButton) {
        finishButton.addEventListener("click", function(event) {
            event.preventDefault()
            document.location.href = 'http://127.0.0.1:5500/index.html'
        })
    }

    if (window.location.pathname.endsWith("index.html")) {
        getDecks()
    }
    
}

runEventListeners()