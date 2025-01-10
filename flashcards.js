import fetch from "https://cdn.skypack.dev/node-fetch"

let flashcards = []
let currentFlashcardIndex = 0

//Deck and flashcard creation
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

async function getDeckByID(deckID) {
    const deckNameElement = document.getElementById("deckName")

    await fetch("http://localhost:8080/get-deck-by-id", {
        method: "POST",
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify({ id: deckID }),
    }).then((result) => {
        if (!result.ok) {
            throw new Error("Failed to fetch deck")
        }
        return result.json()
    }).then((fetchedDeck) => {
        deckNameElement.textContent = fetchedDeck.name + " - " + fetchedDeck.author
    }).catch((error) => {
        console.error("Error fetching deck attributes: ", error)
    })
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

//flashcard game
async function getFlashcards() {
    flashcards = []
    const deckSelection = document.querySelector('input[name="deck"]:checked')
    if (!deckSelection) {
        alert("No deck selected, please select a deck.")
        return
    }
    const deckID = deckSelection.value
    getDeckByID(deckID)

    await fetch("http://localhost:8080/get-flashcards", {
        method: "POST",
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify({ deck_id: deckID }),
    })
    .then((result) => {
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

async function shuffleFlashcards(array) {
    try {
        console.debug("initial flashcards array: ", JSON.stringify(array))
        for (let i = array.length -1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))

            if (typeof array[j] === "undefined" || typeof array[i] === "undefined") {
                console.debug(`Invalid array element at index i: ${i} or j: ${j}`)
            }

            [array[i], array[j]] = [array[j], array[i]]
        }
        return array
    } catch(error) {
        console.error("Error during shuffle: ", error);
        return array
    }
}

async function showFlashcard() {
    if (flashcards.length === 0) {
        alert("No flashcards available")
    return
    }

    const flashcard = flashcards[currentFlashcardIndex]
    const questionElement = document.getElementById("flashcardQuestion")
    const answerElement = document.getElementById("flashcardAnswer")

    questionElement.textContent = "Question: " + flashcard.question
    answerElement.textContent = "Answer: " + flashcard.answer

    if (questionElement.classList.contains("hidden")) {
        flipFlashcard()
    }
}

async function flipFlashcard() {
    const questionElement = document.getElementById("flashcardQuestion")
    const answerElement = document.getElementById("flashcardAnswer")

    if (questionElement.classList.contains("hidden")) {
        questionElement.classList.remove("hidden")
        answerElement.classList.add("hidden")
    } else {
        questionElement.classList.add("hidden")
        answerElement.classList.remove("hidden")
    }
}

async function nextFlashcard() {
    if (flashcards.length === 0) {
        alert("No flashcards available")
        return
    }

    await updateScores()
    //check for win before proceeding to next flashcard
    if (flashcards.every(flashcard => flashcard.counter === 7)) {
        const questionElement = document.getElementById("flashcardQuestion")
        questionElement.textContent = "Congratulations!  You Win!"

        if (questionElement.classList.contains("hidden")) {
            flipFlashcard()
        }
        return
    }
    
    const lastFlashcardIndex = flashcards.length - 1
    console.debug(lastFlashcardIndex)
    if (currentFlashcardIndex !== lastFlashcardIndex) {
        currentFlashcardIndex += 1
        if (flashcards[currentFlashcardIndex].counter !== 7) {
            showFlashcard()
        } else {
            nextFlashcard()
        }
    } else {
        flashcards = await shuffleFlashcards(flashcards)
        currentFlashcardIndex = 0
        if (flashcards[currentFlashcardIndex].counter !== 7) {
            showFlashcard()
        } else {
            flashcards.rem
            nextFlashcard()
        }
    }
}

async function markFlashcardCorrect() {
    const flashcard = flashcards[currentFlashcardIndex]
    flashcard.counter += 1
    nextFlashcard()
    console.log(flashcards)
}

async function markFlashcardIncorrect() {
    const flashcard = flashcards[currentFlashcardIndex]
    flashcard.counter = 0
    nextFlashcard()
    console.log(flashcards)
}

async function updateScores() {
    var flashcard
    let [startCount, levelOneCount, levelTwoCount, levelThreeCount, levelFourCount, levelFiveCount, levelSixCount, levelSevenCount] = [0, 0, 0, 0, 0, 0, 0, 0]
    for (flashcard of flashcards) {
        switch (flashcard.counter) {
            case 0:
                startCount += 1
                break;
            case 1:
                levelOneCount += 1
                break;
            case 2:
                levelTwoCount += 1
                break;
            case 3:
                levelThreeCount += 1
                break;
            case 4:
                levelFourCount += 1
                break;
            case 5:
                levelFiveCount += 1
                break;
            case 6:
                levelSixCount += 1
                break;
            case 7:
                levelSevenCount += 1
        }
    
    //get score elements
    const startCountElement = document.getElementById("levelZero")
    const levelOneCountElement = document.getElementById("levelOne")
    const levelTwoCountElement = document.getElementById("levelTwo")
    const levelThreeCountElement = document.getElementById("levelThree")
    const levelFourCountElement = document.getElementById("levelFour")
    const levelFiveCountElement = document.getElementById("levelFive")
    const levelSixCountElement = document.getElementById("levelSix")
    const levelSevenCountElement = document.getElementById("levelSeven")

    //update scores
    startCountElement.textContent = startCount
    levelOneCountElement.textContent = levelOneCount
    levelTwoCountElement.textContent = levelTwoCount
    levelThreeCountElement.textContent = levelThreeCount
    levelFourCountElement.textContent = levelFourCount
    levelFiveCountElement.textContent = levelFiveCount
    levelSixCountElement.textContent = levelSixCount
    levelSevenCountElement.textContent = levelSevenCount
    }
}


async function runEventListeners() {
    const addDeckForm = document.getElementById("addDeckForm")
    const addFlashcardForm = document.getElementById("addFlashcardForm")
    const finishButton = document.getElementById("finishButton")
    const newGameButton = document.getElementById("newGameButton")
    const flipCardButton = document.getElementById("flipCardButton")
    const markCorrectButton = document.getElementById("markCorrectButton")
    const markIncorrectButton = document.getElementById("markIncorrectButton")
    //const deckName = document.getElementById("deckName")

    if (newGameButton) {
        newGameButton.addEventListener("click", async function(event) {
            event.preventDefault()
            await getFlashcards()
            const totalFlashcardCount = flashcards.length
            showFlashcard()
            updateScores()
        })
    }

    if (flipCardButton) {
        flipCardButton.addEventListener("click", async function() {
            flipFlashcard()
        })
    } 

    if (markCorrectButton) {
        markCorrectButton.addEventListener("click", async function() {
            markFlashcardCorrect()
        })
    }

    if (markIncorrectButton) {
        markIncorrectButton.addEventListener("click", async function() {
            markFlashcardIncorrect()
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

document.addEventListener("DOMContentLoaded", function () {
    runEventListeners()
})
