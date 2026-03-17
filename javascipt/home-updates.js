(function () {
    const listElement = document.getElementById("latestUpdatesList");
    if (!listElement) {
        return;
    }

    const gameMeta = {
        rivals: { name: "Rivals", href: "games/rivals.html", image: "images/logo/rivals2.jpg" },
        "99nights": { name: "99 Nights in the Forest", href: "games/99nights.html", image: "images/logo/99nights2.jpg" },
        arsenal: { name: "Arsenal", href: "games/Arsenal.html", image: "images/logo/Arsenal2.jpg" },
        fishit: { name: "Fish It", href: "games/fishit.html", image: "images/logo/Fishit2.jpg" },
        rerangers: { name: "Re:Rangers X", href: "games/ReRangersX.html", image: "images/logo/rerangers2.jpg" },
        bizlineage: { name: "Bizarre Lineage", href: "games/bizarrelineage.html", image: "images/logo/bizarrelineage2.jpg" }
    };
    const LATEST_LIMIT = 4;
    const DATABASE_CACHE_KEY = "homeUpdatesDatabaseCache";
    const CHANGE_STATE_KEY = "homeUpdatesChangeState";

    function cleanText(value) {
        return String(value || "").trim();
    }

    function getUpdatedLabel(meta, gameId) {
        const perGame = cleanText(meta && meta.gameLastUpdated && meta.gameLastUpdated[gameId]);
        if (perGame) {
            return perGame;
        }

        return cleanText(meta && meta.lastUpdated) || "Recently";
    }

    function getTestedLabel(meta, gameId) {
        const perGame = cleanText(meta && meta.gameLastTested && meta.gameLastTested[gameId]);
        if (perGame) {
            return perGame;
        }

        return cleanText(meta && meta.lastTested) || "";
    }

    function toTimestamp(label) {
        const parsed = Date.parse(label);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    function normalizeCodeEntry(entry) {
        if (typeof entry === "string") {
            return entry.trim();
        }

        if (!entry || typeof entry !== "object") {
            return "";
        }

        const normalized = {};
        Object.keys(entry).sort().forEach(function (key) {
            const value = entry[key];
            normalized[key] = typeof value === "string" ? value.trim() : value;
        });
        return normalized;
    }

    function getGameSignature(database, gameId) {
        const gameData = database && database[gameId] && typeof database[gameId] === "object" ? database[gameId] : {};
        const normalized = {
            workingCodes: Array.isArray(gameData.workingCodes) ? gameData.workingCodes.map(normalizeCodeEntry) : [],
            expiredCodes: Array.isArray(gameData.expiredCodes) ? gameData.expiredCodes.map(normalizeCodeEntry) : []
        };

        return JSON.stringify(normalized);
    }

    function readJsonStorage(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
            return null;
        }
    }

    function writeJsonStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Ignore storage failures.
        }
    }

    function updateChangeState(database) {
        const previousDatabase = readJsonStorage(DATABASE_CACHE_KEY);
        const previousState = readJsonStorage(CHANGE_STATE_KEY) || {};
        const nextState = {};
        const now = new Date().toISOString();

        Object.keys(gameMeta).forEach(function (gameId) {
            const currentSignature = getGameSignature(database, gameId);
            const previousSignature = getGameSignature(previousDatabase, gameId);
            if (!previousDatabase || currentSignature === previousSignature) {
                if (previousState[gameId]) {
                    nextState[gameId] = previousState[gameId];
                }
                return;
            }

            nextState[gameId] = now;
        });

        writeJsonStorage(DATABASE_CACHE_KEY, database);
        writeJsonStorage(CHANGE_STATE_KEY, nextState);
        return nextState;
    }

    function getEffectiveTimestamp(meta, gameId, changeState) {
        const detectedChange = cleanText(changeState && changeState[gameId]);
        if (detectedChange) {
            const detectedTimestamp = toTimestamp(detectedChange);
            if (detectedTimestamp > 0) {
                return detectedTimestamp;
            }
        }

        const updatedTimestamp = toTimestamp(getUpdatedLabel(meta, gameId));
        if (updatedTimestamp > 0) {
            return updatedTimestamp;
        }

        return toTimestamp(getTestedLabel(meta, gameId));
    }

    function getNewestGameIds(meta, changeState) {
        const ids = Object.keys(gameMeta);
        ids.sort(function (a, b) {
            const dateA = getEffectiveTimestamp(meta, a, changeState);
            const dateB = getEffectiveTimestamp(meta, b, changeState);
            if (dateB !== dateA) {
                return dateB - dateA;
            }

            const testedA = toTimestamp(getTestedLabel(meta, a));
            const testedB = toTimestamp(getTestedLabel(meta, b));
            if (testedB !== testedA) {
                return testedB - testedA;
            }

            return a.localeCompare(b);
        });

        return ids.slice(0, LATEST_LIMIT);
    }

    function buildUpdateCard(gameId, gameData, meta) {
        const gameInfo = gameMeta[gameId];
        if (!gameInfo || !gameData || typeof gameData !== "object") {
            return "";
        }

        const workingCount = Array.isArray(gameData.workingCodes) ? gameData.workingCodes.length : 0;
        const expiredCount = Array.isArray(gameData.expiredCodes) ? gameData.expiredCodes.length : 0;
        const updatedLabel = getUpdatedLabel(meta, gameId);

        return [
            '<article class="update-card">',
            '  <a class="update-image-wrap" href="' + gameInfo.href + '">',
            '      <img class="update-image" src="' + gameInfo.image + '" alt="' + gameInfo.name + ' logo" loading="lazy" decoding="async">',
            '  </a>',
            '  <h3><a href="' + gameInfo.href + '">' + gameInfo.name + ' Codes</a></h3>',
            '  <p class="update-meta">Updated: ' + updatedLabel + '</p>',
            '  <p class="update-stats">' + workingCount + ' working, ' + expiredCount + ' expired</p>',
            '  <a class="update-link" href="' + gameInfo.href + '">Open page</a>',
            '</article>'
        ].join("\n");
    }

    function renderFallback() {
        const cards = Object.keys(gameMeta).map(function (gameId) {
            const game = gameMeta[gameId];
            return [
                '<article class="update-card">',
                '  <a class="update-image-wrap" href="' + game.href + '">',
                '      <img class="update-image" src="' + game.image + '" alt="' + game.name + ' logo" loading="lazy" decoding="async">',
                '  </a>',
                '  <h3><a href="' + game.href + '">' + game.name + ' Codes</a></h3>',
                '  <p class="update-meta">Updated: Recently</p>',
                '  <p class="update-stats">Live stats available when JSON is loaded.</p>',
                '  <a class="update-link" href="' + game.href + '">Open page</a>',
                '</article>'
            ].join("\n");
        }).slice(0, LATEST_LIMIT);

        listElement.innerHTML = cards.join("\n");
    }

    function renderFromDatabase(database) {
        const meta = database && typeof database._meta === "object" ? database._meta : null;
        const changeState = updateChangeState(database) || readJsonStorage(CHANGE_STATE_KEY) || {};
        const newestIds = getNewestGameIds(meta, changeState);
        const cards = newestIds.map(function (gameId) {
            return buildUpdateCard(gameId, database && database[gameId], meta);
        }).filter(Boolean);

        if (cards.length === 0) {
            renderFallback();
            return;
        }

        listElement.innerHTML = cards.join("\n");
    }

    async function loadDatabase() {
        const sources = ["data/game-codes.json", "../data/game-codes.json"];

        for (const source of sources) {
            try {
                const response = await fetch(source);
                if (!response.ok) {
                    continue;
                }

                const json = await response.json();
                if (json && typeof json === "object") {
                    return json;
                }
            } catch {
                // Try next source.
            }
        }

        return readJsonStorage(DATABASE_CACHE_KEY);
    }

    loadDatabase().then(function (database) {
        if (!database) {
            renderFallback();
            return;
        }

        renderFromDatabase(database);
    });
})();
