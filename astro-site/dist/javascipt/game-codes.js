(function () {
    const body = document.body;

    function resolveGameId() {
        const fromData = body && body.dataset ? String(body.dataset.gameId || "").trim().toLowerCase() : "";
        if (fromData) {
            return fromData;
        }

        const path = String(window.location.pathname || "");

        const last = path.split("/").pop() || "";

        return last.replace(/\.html$/i, "").toLowerCase();
    }

    const gameId = resolveGameId();

    const FALLBACK_DATABASE = {};
    function cleanText(value) {
        return String(value || "").trim();
    }

    function isPlaceholderText(value) {
        const normalized = cleanText(value).toLowerCase();
        return !normalized || normalized === "x" || normalized === "loading..." || normalized === "loading working codes..." || normalized === "loading expired codes...";
    }

    function stripTrailingPeriodLabel(text) {
        return cleanText(text).replace(/\s*\([^)]*\)\s*$/, "").trim();
    }

    function composeTitleWithPeriod(baseTitle, periodLabel) {
        const base = stripTrailingPeriodLabel(baseTitle);
        const period = cleanText(periodLabel);
        return period ? `${base} (${period})` : base;
    }

    function applyGlobalPeriodFromMeta(database) {
        const meta = database && typeof database._meta === "object" ? database._meta : null;
        const periodLabel = cleanText(meta && meta.defaultCodesPeriod);
        if (!periodLabel) {
            return;
        }

       // const titleElement = document.querySelector("h1");
       // if (titleElement) {
       //     titleElement.textContent = composeTitleWithPeriod(titleElement.textContent, periodLabel);
       // }

        document.title = composeTitleWithPeriod(document.title, periodLabel);
    }

    function applyLastUpdatedFromMeta(database) {
        const labelElement = document.getElementById("lastUpdatedLabel");
        const testedElement = document.getElementById("testedTodayLabel");
        if (!labelElement && !testedElement) {
            return;
        }

        const meta = database && typeof database._meta === "object" ? database._meta : null;
        const gameEntry = gameId && database && typeof database[gameId] === "object" ? database[gameId] : null;
        const globalUpdated = cleanText(meta && meta.lastUpdated);
        const gameUpdated = cleanText(gameEntry && gameEntry.lastUpdated) || cleanText(meta && meta.gameLastUpdated && gameId ? meta.gameLastUpdated[gameId] : "");
        const globalTested = cleanText(meta && meta.lastTested);
        const gameTested = cleanText(gameEntry && gameEntry.lastTested) || cleanText(meta && meta.gameLastTested && gameId ? meta.gameLastTested[gameId] : "");
        const resolvedDate = gameUpdated || globalUpdated;
        const resolvedTestedDate = gameTested || globalTested || resolvedDate;

        if (labelElement) {
            if (!resolvedDate) {
                labelElement.textContent = "Last updated: recently";
            } else {
                labelElement.textContent = "Last updated: " + resolvedDate;
            }
        }

        if (testedElement) {
            testedElement.textContent = "Tested: " + (resolvedTestedDate || "recently");
        }
    }

    function buildRelatedGamesMarkup(currentGameId) {
        const MAX_RELATED_GAMES = 5;
        const allGames = [
            {
                id: "rivals",
                name: "Rivals",
                page: "rivals",
                image: "../images/logo/rivals2.webp",
                summary: "Fast Roblox FPS with 1v1 and 5v5 matches."
            },
            {
                id: "99nights",
                name: "99 Nights in the Forest",
                page: "99nights",
                image: "../images/logo/99nights2.webp",
                summary: "Survival-horror where you try to outlast 99 nights."
            },
            {
                id: "arsenal",
                name: "Arsenal",
                page: "Arsenal",
                image: "../images/logo/Arsenal2.webp",
                summary: "Popular Roblox shooter by ROLVe with fast-paced combat."
            },
            {
                id: "fishit",
                name: "Fish It",
                page: "fishit",
                image: "../images/logo/Fishit2.webp",
                summary: "Relaxed fishing game with upgrades and progression."
            },
            {
                id: "rerangers",
                name: "Re:Rangers X",
                page: "ReRangersX",
                image: "../images/logo/rerangers2.webp",
                summary: "Anime-themed Roblox action RPG with ranger progression and battles."
            },
            {
                id: "bizlineage",
                name: "Bizarre Lineage",
                page: "bizarrelineage",
                image: "../images/logo/bizarrelineage2.webp",
                summary: "Anime-themed Roblox action RPG with lineage progression and battles."
            },
            {
                id: "sailorpiece",
                name: "Sailor Piece",
                page: "sailorpiece",
                image: "../images/logo/sailorpiece2.webp",
                summary: "Anime-themed Roblox action RPG with sailor progression and battles."
            },
            {
                id: "hooked",
                name: "Hooked!",
                page: "hooked",
                image: "../images/logo/hooked2.webp",
                summary: "Fast-paced physics-based brawler on small platforms."
            },
            {
                id: "kinglegacy",
                name: "King Legacy",
                page: "kinglegacy",
                image: "../images/logo/kinglegacy2.webp",
                summary: "Adventurous Roblox game with exploration and quests."
            },
            {
                id: "animecardclash",
                name: "Anime Card Clash",
                page: "animecardclash",
                image: "../images/logo/animecardclash2.webp",
                summary: "Competitive Roblox card game with strategic battles and collectible cards."
            },
            {
                id: "knockout!",
                name: "Knockout",
                page: "knockout",
                image: "../images/logo/knockout2.webp",
                summary: "Competitive Roblox game where players try to be the last one standing in a shrinking arena."
            },
            {
                id: "animeoverload",
                name: "Anime Overload!",
                page: "animeoverload",
                image: "../images/logo/animeoverload2.webp",
                summary: "Anime-themed Roblox action game with overload progression and battles."
            },
            {
                id: "allstartowerdefense",
                name: "All Star Tower Defense",
                page: "allstartowerdefense",
                image: "../images/logo/allstartowerdefense2.webp",
                summary: "Anime-themed Roblox tower defense game with strategic battles and character progression."
            },
            {
                id: "animevanguards",
                name: "Anime Vanguards",
                page: "animevanguards",
                image: "../images/logo/animevanguards2.webp",
                summary: "Anime-themed Roblox tower defense game with battles and Gacha character collection."
            },
            {
                id: "solsrng",
                name: "SolsRNG",
                page: "solsrng",
                image: "../images/logo/solsrng2.webp",
                summary: "Anime-themed Roblox game with RNG mechanics and strategic battles."
            }
        ];

        function shuffleGames(games) {
            const shuffled = games.slice();
            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = shuffled[i];
                shuffled[i] = shuffled[j];
                shuffled[j] = temp;
            }
            return shuffled;
        }

        const candidates = allGames.filter(function (game) {
            return game.id !== currentGameId;
        });
        const maxItems = Math.min(MAX_RELATED_GAMES, candidates.length);
        const storageKey = "relatedGamesLastOrder:" + currentGameId;

        let previousSignature = "";
        try {
            previousSignature = sessionStorage.getItem(storageKey) || "";
        } catch {
            previousSignature = "";
        }

        let relatedGames = [];
        let signature = "";

        for (let attempt = 0; attempt < 10; attempt += 1) {
            relatedGames = shuffleGames(candidates).slice(0, maxItems);
            signature = relatedGames.map(function (game) {
                return game.id;
            }).join("|");

            if (signature !== previousSignature || candidates.length <= 1) {
                break;
            }
        }

        try {
            sessionStorage.setItem(storageKey, signature);
        } catch {
            // Ignore storage errors in restricted browser contexts.
        }

        return relatedGames
            .map(function (game) {
                return [
                    '<a class="related-game-card" href="' + game.page + '">',
                    '  <img class="related-game-thumb" src="' + game.image + '" alt="' + game.name + ' logo" loading="lazy" decoding="async">',
                    '  <span class="related-game-copy">',
                    '      <span class="related-game-name">' + game.name + ' Codes</span>',
                    '      <span class="related-game-summary">' + game.summary + '</span>',
                    '  </span>',
                    '</a>'
                ].join("");
            })
            .join("");
    }

    function renderRelatedGames() {
        const container = document.getElementById("relatedGamesLinks");
        if (!container || !gameId) {
            return;
        }

        container.innerHTML = buildRelatedGamesMarkup(gameId);
    }

    function injectStructuredData(database) {
        if (!gameId) {
            return;
        }

        const meta = database && typeof database._meta === "object" ? database._meta : null;
        const gameEntry = database && typeof database[gameId] === "object" ? database[gameId] : null;
        const globalUpdated = cleanText(meta && meta.lastUpdated);
        const gameUpdated = cleanText(gameEntry && gameEntry.lastUpdated) || cleanText(meta && meta.gameLastUpdated && meta.gameLastUpdated[gameId]);
        const dateModifiedLabel = gameUpdated || globalUpdated;
        const nowIso = new Date().toISOString();
        const pathname = String(window.location.pathname || "");
        const origin = String(window.location.origin || "");
        const hasHttpOrigin = /^https?:\/\//i.test(origin);
        const pageUrl = hasHttpOrigin && pathname ? origin + pathname : pathname;
        const pageHeading = cleanText((document.querySelector("h1") || {}).textContent) || document.title;
        const pageDescription = cleanText((document.querySelector('meta[name="description"]') || {}).content);
        const pageImage = cleanText((document.querySelector('meta[property="og:image"]') || {}).content);
        const logoUrl = hasHttpOrigin ? origin + "/images/logo/Mainlogo.png" : "../images/logo/Mainlogo.png";
        const redeemSteps = Array.from(document.querySelectorAll("#redeemStepsList li"))
            .map(function (item) {
                return cleanText(item.textContent);
            })
            .filter(Boolean);
        const activeCodes = Array.from(document.querySelectorAll("#workingCodesList .copy-text"))
            .map(function (item) {
                return cleanText(item.textContent);
            })
            .filter(Boolean);

        const graph = [
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": hasHttpOrigin ? origin + "/" : "/"
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": pageHeading,
                        "item": pageUrl || pathname
                    }
                ]
            },
            {
                "@type": "WebPage",
                "name": pageHeading,
                "url": pageUrl || pathname,
                "description": pageDescription,
                "dateModified": dateModifiedLabel || nowIso,
                "inLanguage": document.documentElement.lang || "en",
                "primaryImageOfPage": pageImage || undefined
            },
            {
                "@type": "Article",
                "headline": pageHeading,
                "description": pageDescription,
                "image": pageImage ? [pageImage] : undefined,
                "mainEntityOfPage": pageUrl || pathname,
                "dateModified": dateModifiedLabel || nowIso,
                "author": {
                    "@type": "Organization",
                    "name": "GMEcodes"
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "GMEcodes",
                    "logo": {
                        "@type": "ImageObject",
                        "url": logoUrl
                    }
                }
            }
        ];

        if (redeemSteps.length > 0) {
            graph.push({
                "@type": "HowTo",
                "name": "How to redeem " + pageHeading,
                "description": pageDescription,
                "step": redeemSteps.map(function (stepText, index) {
                    return {
                        "@type": "HowToStep",
                        "position": index + 1,
                        "name": stepText,
                        "text": stepText
                    };
                })
            });
        }

        if (activeCodes.length > 0) {
            graph.push({
                "@type": "ItemList",
                "name": "Active codes for " + pageHeading,
                "numberOfItems": activeCodes.length,
                "itemListElement": activeCodes.map(function (codeText, index) {
                    return {
                        "@type": "ListItem",
                        "position": index + 1,
                        "name": codeText
                    };
                })
            });
        }

        const schema = {
            "@context": "https://schema.org",
            "@graph": graph
        };

        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
    }


    const CACHE_KEY = "gameCodesDatabaseCache";

    function sanitizeGameData(data) {
        const source = data && typeof data === "object" ? data : {};
        const seenWorking = new Set();
        const seenExpired = new Set();

        const workingCodes = (Array.isArray(source.workingCodes) ? source.workingCodes : [])
            .map(function (entry) {
                if (typeof entry === "string") {
                    const code = cleanText(entry);
                    if (isPlaceholderText(code)) {
                        return null;
                    }

                    const key = code.toLowerCase();
                    if (seenWorking.has(key)) {
                        return null;
                    }
                    seenWorking.add(key);

                    return {
                        code: code,
                        reward: ""
                    };
                }

                if (!entry || typeof entry !== "object") {
                    return null;
                }

                const code = cleanText(entry.code || entry.name || entry.value);
                const reward = cleanText(entry.reward || entry.description);
                if (isPlaceholderText(code)) {
                    return null;
                }

                const key = code.toLowerCase();
                if (seenWorking.has(key)) {
                    return null;
                }
                seenWorking.add(key);

                return {
                    code: code,
                    reward: isPlaceholderText(reward) ? "" : reward
                };
            })
            .filter(Boolean);

        const expiredCodes = (Array.isArray(source.expiredCodes) ? source.expiredCodes : [])
            .map(function (entry) {
                const code = cleanText(entry);
                if (isPlaceholderText(code)) {
                    return "";
                }

                const key = code.toLowerCase();
                if (seenExpired.has(key)) {
                    return "";
                }
                seenExpired.add(key);
                return code;
            })
            .filter(Boolean);

        return {
            workingCodes: workingCodes,
            expiredCodes: expiredCodes
        };
    }

    function cacheDatabase(database) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(database));
        } catch {
            // Ignore write errors in private mode or restricted storage.
        }
    }

    function readCachedDatabase() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
            return null;
        }
    }

    async function loadDatabase() {
        const sources = ["../data/game-codes.json", "data/game-codes.json"];

        for (const source of sources) {
            try {
                const response = await fetch(source);
                if (!response.ok) {
                    continue;
                }

                const json = await response.json();
                if (json && typeof json === "object") {
                    cacheDatabase(json);
                    return json;
                }
            } catch {
                // Keep trying the next source.
            }
        }

        const cached = readCachedDatabase();
        if (cached) {
            return cached;
        }

        return FALLBACK_DATABASE;
    }

    function renderWorkingCodes(listElement, workingCodes) {
        listElement.innerHTML = "";

        if (workingCodes.length === 0) {
            listElement.innerHTML = '<li class="list-group-item">No verified active codes are listed right now.</li>';
            return;
        }

        function normalizeWorkingCodeEntry(entry) {
            if (typeof entry === "string") {
                const codeText = entry.trim();
                return {
                    code: codeText,
                    reward: ""
                };
            }

            if (entry && typeof entry === "object") {
                const codeText = String(entry.code || entry.name || entry.value || "").trim();
                const rewardText = String(entry.reward || entry.description || "").trim();
                return {
                    code: codeText,
                    reward: rewardText
                };
            }

            return {
                code: "",
                reward: ""
            };
        }

        workingCodes.forEach(function (entry) {
            const normalizedEntry = normalizeWorkingCodeEntry(entry);
            const code = normalizedEntry.code;
            const reward = normalizedEntry.reward;
            if (!code) {
                return;
            }

            const item = document.createElement("li");
            item.className = "list-group-item d-flex justify-content-between align-items-center";

            const left = document.createElement("span");
            const strong = document.createElement("strong");
            strong.className = "copy-text";
            strong.textContent = code;
            left.appendChild(strong);
            if (reward) {
                left.appendChild(document.createTextNode(" - " + reward));
            }

            const copyIcon = document.createElement("i");
            copyIcon.className = "bi bi-clipboard copy-icon";
            copyIcon.style.cursor = "pointer";
            copyIcon.setAttribute("aria-label", "Copy code");
            copyIcon.onclick = function () {
                if (typeof window.copyToClipboard === "function") {
                    window.copyToClipboard(copyIcon);
                }
            };

            item.appendChild(left);
            item.appendChild(copyIcon);
            listElement.appendChild(item);
        });
    }

    function renderSimpleList(listElement, values, itemClassName, emptyText) {
        listElement.innerHTML = "";

        if (values.length === 0) {
            const empty = document.createElement("li");
            empty.textContent = emptyText || "No items available right now.";
            if (itemClassName) {
                empty.className = itemClassName;
            }
            listElement.appendChild(empty);
            return;
        }

        values.forEach(function (value) {
            const text = String(value || "").trim();
            if (!text) {
                return;
            }

            const li = document.createElement("li");
            if (itemClassName) {
                li.className = itemClassName;
            }
            li.textContent = text;
            listElement.appendChild(li);
        });
    }

    function renderGamePage(gameData) {
        const workingCodesList = document.getElementById("workingCodesList") || document.querySelector("#L4 .list-group");
        const expiredCodesList = document.getElementById("expiredCodesList") || document.querySelector("#L4Expired .wp-block-list");

        if (workingCodesList) {
            renderWorkingCodes(workingCodesList, gameData.workingCodes);
        }

        if (expiredCodesList) {
            renderSimpleList(expiredCodesList, gameData.expiredCodes, "", "No verified expired codes are listed right now.");
        }
    }

    loadDatabase().then(function (database) {
        applyGlobalPeriodFromMeta(database);
        applyLastUpdatedFromMeta(database);
        renderRelatedGames();
        injectStructuredData(database);

        const gameEntry = gameId ? database[gameId] : null;

        if (!gameEntry) {
            return;
        }

        const gameData = sanitizeGameData(gameEntry);
        renderGamePage(gameData);
    });
})();
