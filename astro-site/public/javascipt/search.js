let games = []

const fallbackGames = [
{
name: "99 Nights in the Forest (Roblox)",
page: "games/99nights",
image: "images/logo/99nights2.jpg"
},
{
name: "Rivals(Roblox)",
page: "games/rivals",
image: "images/logo/rivals2.jpg"
},
{
name: "Arsenal(Roblox)",
page: "games/Arsenal",
image: "images/logo/Arsenal2.jpg"
},
{
name: "Fish it(Roblox)",
page: "games/fishit",
image: "images/logo/Fishit2.jpg"
},
{
name: "Re:Rangers X(Roblox)",
page: "games/ReRangersX",
image: "images/logo/rerangers2.jpg"
},
{
name: "Bizarre Lineage(Roblox)",
page: "games/bizarrelineage",
image: "images/logo/bizarrelineage2.jpg"
},
{
name: "Sailor Piece(Roblox)",
page: "games/sailorpiece",
image: "images/logo/sailorpiece2.jpg"
},
{
name: "Hooked!(Roblox)",
page: "games/hooked",
image: "images/logo/hooked2.jpg"
},
{
name: "King Legacy(Roblox)",
page: "games/kinglegacy",
image: "images/logo/kinglegacy2.jpg"
},
{
name: "Anime Card Clash(Roblox)",
page: "games/animecardclash",
image: "images/logo/animecardclash2.jpg"
},
{
name: "Knockout! (Roblox)",
page: "games/knockout",
image: "images/logo/knockout2.jpg"
}

]

const availablePages = new Set([
"games/99nightsl",
"games/rivals",
"games/Arsenal",
"games/fishit",
"games/ReRangersX",
"games/bizarrelineage",
"games/sailorpiece",
"games/hooked",
"games/kinglegacy",
"games/animecardclash",
"games/knockout"
])

const input = document.getElementById("search-input")
const results = document.getElementById("search-results")

let selectedIndex = -1

function normalizePath(path) {
if (typeof path !== "string") return ""
return path.replace(/^(\.\.\/|\.\/)+/, "")
}

function escapeRegExp(text) {
return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function sanitizeGames(rawGames) {
if (!Array.isArray(rawGames)) return []

const unique = new Set()

return rawGames
.map(game => {
const name = typeof game?.name === "string" ? game.name.trim() : ""
const page = normalizePath(game?.page)
const image = normalizePath(game?.image)
return { name, page, image }
})
.filter(game => {
if (!game.name || !game.page || !game.image) return false
if (!availablePages.has(game.page)) return false
const key = `${game.name}::${game.page}`
if (unique.has(key)) return false
unique.add(key)
return true
})
}

async function loadGamesDatabase() {
const sources = ["data/games.json", "../data/games.json"]

for (const source of sources) {
try {
const res = await fetch(source)
if (!res.ok) continue
const data = await res.json()
const cleaned = sanitizeGames(data)
if (cleaned.length > 0) return cleaned
} catch {
// Browsers usually block file:// fetch. Continue to next source/fallback.
}
}

return sanitizeGames(fallbackGames)
}

if (input && results) {
loadGamesDatabase().then(data => {
games = data
})

// SEARCH INPUT
input.addEventListener("input", () => {
const query = input.value.toLowerCase().trim()

results.innerHTML = ""
selectedIndex = -1

if (query === "") {
results.style.display = "none"
return
}

const filtered = games.filter(game =>
game.name.toLowerCase().includes(query)
)

if (filtered.length === 0) {
results.innerHTML = `
<div class="no-results">
No games found
</div>
`

results.style.display = "block"
return
}

// CREATE RESULTS
filtered.forEach(game => {
const item = document.createElement("div")
item.classList.add("result-item")

const highlighted = game.name.replace(
new RegExp(escapeRegExp(query), "gi"),
match => `<span class="highlight">${match}</span>`
)

item.innerHTML = `
<img src="${game.image}" alt="${game.name}">
<span>${highlighted}</span>
`

item.onclick = () => {
window.location.href = game.page
}

results.appendChild(item)
})

results.style.display = "block"
})

// KEYBOARD NAVIGATION
input.addEventListener("keydown", e => {
const items = results.querySelectorAll(".result-item")
if (items.length === 0) return

if (e.key === "ArrowDown") {
e.preventDefault()
selectedIndex++
}

if (e.key === "ArrowUp") {
e.preventDefault()
selectedIndex--
}

if (selectedIndex >= items.length) selectedIndex = 0
if (selectedIndex < 0) selectedIndex = items.length - 1

items.forEach(item => item.classList.remove("active"))

if (items[selectedIndex]) {
items[selectedIndex].classList.add("active")
}

if (e.key === "Enter" && items[selectedIndex]) {
e.preventDefault()
items[selectedIndex].click()
}
})

// CLOSE SEARCH WHEN CLICK OUTSIDE
document.addEventListener("click", e => {
if (!e.target.closest(".search-container")) {
results.style.display = "none"
}
})
}