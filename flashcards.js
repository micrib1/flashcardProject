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

    console.log(result)
}


async function createFlashcard() {
    const question = document.getElementById("question").value;
    const answer = document.getElementById("answer").value;
    console.log(question, answer)

    const name = await getQueryParam("name")
    const author = await getQueryParam("author")
    
    const data = {
        question, answer,
    }

    const fetchLocation = "http://localhost:8080/flashcards?name="+ name + "&author=" + author
    const result = await fetch(fetchLocation, {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify(data)
    })

    console.log(result)
}


document.addEventListener("submit", createDeck(await getQueryParam("name"), await getQueryParam("author")))
createFlashcard()