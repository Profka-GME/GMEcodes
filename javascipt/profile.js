document.addEventListener('DOMContentLoaded', async function() {
    const profileShell = document.getElementById('profileShell');
    const notLoggedInShell = document.getElementById('profileNotLoggedIn');
    const profileTitle = document.getElementById('profileTitle');
    const profileCommentsTitle = document.getElementById('profileCommentsTitle');
    const profileRepliesTitle = document.getElementById('profileRepliesTitle');
    const profileIncomingRepliesTitle = document.getElementById('profileIncomingRepliesTitle');
    const profileDescriptionTitle = document.getElementById('profileDescriptionTitle');
    const usernameEl = document.getElementById('profileUsername');

    const joinedEl = document.getElementById('profileJoined');
    const totalLikesEl = document.getElementById('profileTotalLikes');
    const totalDislikesEl = document.getElementById('profileTotalDislikes');
    const profileAvatar = document.getElementById('profileAvatar');
    const profilePictureSection = document.getElementById('profilePictureSection');
    const profileAvatarChoices = document.getElementById('profileAvatarChoices');
    const descriptionForm = document.getElementById('profileDescriptionForm');
    const descriptionInput = document.getElementById('profileDescription');
    const saveButton = document.getElementById('profileSaveButton');
    const saveStatus = document.getElementById('profileSaveStatus');
    const commentsList = document.getElementById('profileCommentsList');
    const repliesSection = document.getElementById('profileRepliesSection');
    const repliesList = document.getElementById('profileRepliesList');
    const incomingRepliesSection = document.getElementById('profileIncomingRepliesSection');
    const incomingRepliesList = document.getElementById('profileIncomingRepliesList');
    const PROFILE_ITEMS_PER_PAGE = 6;
    const pageState = {
        comments: 1,
        replies: 1,
        incoming: 1
    };

    const currentUser = localStorage.getItem('currentUser');
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const params = new URLSearchParams(window.location.search);
    const requestedUser = params.get('user');
    const targetUsername = requestedUser && requestedUser.trim() ? requestedUser.trim() : currentUser;

    const DIRECT_LINK_REGEX = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|gg|io|co|dev|me|info|biz|edu|gov)(?:\/\S*)?)/i;
    const DOMAIN_FRAGMENT_REGEX = /\b[a-z0-9-]{2,}\s*(?:\.|\(dot\)|\[dot\]|\{dot\}|\bdot\b)\s*(?:com|net|org|gg|io|co|dev|me|info|biz|edu|gov)\b/i;
    const OBFUSCATED_HTTP_REGEX = /h\W*t\W*t\W*p\W*s?/i;
    const OBFUSCATED_WWW_REGEX = /w\W*w\W*w\W*\.?/i;

    const BLOCKED_WORDS = [
        'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'pussy', 'cunt',
        'motherfucker', 'fucker', 'fucking', 'wtf', 'slut', 'whore', 'damn',
        'hell', 'crap', 'bullshit', 'jackass', 'dumbass', 'dipshit', 'sonofabitch',
        'prick', 'twat', 'jerkoff', 'retard', 'retarded', 'screwyou', 'stfu',
        'kys', 'idiot', 'moron', 'loser', 'trash', 'garbage'
    ];

    const SEXUAL_TERMS = [
        'porn', 'porno', 'pornhub', 'xnxx', 'xvideos', 'nude', 'nudes', 'naked',
        'onlyfans', 'sex', 'sexy', 'blowjob', 'handjob', 'cum', 'milf', 'nsfw'
    ];

    const HATE_PATTERNS = [
        /\bkill\s+all\b/i,
        /\bhate\s+all\b/i,
        /\bgo\s+die\b/i,
        /\byou\s+should\s+die\b/i,
        /\bcleanse\b/i,
        /\bexterminate\b/i
    ];

    const PROTECTED_GROUP_TERMS = [
        'black', 'white', 'asian', 'arab', 'african', 'latino', 'hispanic',
        'indian', 'jewish', 'muslim', 'christian', 'immigrant', 'foreigner',
        'refugee', 'ethnicity', 'race'
    ];

    const GROUP_HOSTILITY_TERMS = [
        'hate', 'kill', 'ban', 'remove', 'deport', 'exterminate', 'dirty',
        'filthy', 'inferior', 'subhuman', 'vermin', 'animals'
    ];

    const RACIAL_HARASSMENT_PATTERNS = [
        /\bgo\s+back\s+to\s+(?:your|ur)\s+country\b/i,
        /\b(?:deport|ban|remove)\s+(?:all\s+)?(?:immigrants?|foreigners?|refugees?)\b/i,
        /\b(?:dirty|filthy)\s+(?:immigrants?|foreigners?|[a-z]+\s+people)\b/i
    ];

    const RACIAL_SLUR_PATTERNS = [
        /\bn[\W_]*[i1!|][\W_]*g[\W_]*g[\W_]*[e3][\W_]*r\b/i,
        /\bn[\W_]*[i1!|][\W_]*g[\W_]*g[\W_]*[a@]\b/i,
        /\bn[\W_]*i[\W_]*g[\W_]*g[\W_]*[u\W_]*h\b/i,
        /\bn[\W_]*[i1!|l][\W_]*(?:g|6)[\W_]*(?:g|6)[\W_]*(?:[e3][\W_]*r|[a@4])(?:[\W_]*s)?\b/i
    ];

    const AVATAR_OPTIONS = [
        '../images/avatars/avatar-1.svg',
        '../images/avatars/avatar-2.svg',
        '../images/avatars/avatar-3.svg',
        '../images/avatars/avatar-4.svg',
        '../images/avatars/avatar-5.svg',
        '../images/avatars/avatar-6.svg'
    ];
    const DEFAULT_AVATAR = AVATAR_OPTIONS[0];
    const SUPABASE_COMMENTS_TABLE = 'comments';

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sameUser(a, b) {
        return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    }

    function getUserRole(username) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(function(u) {
            return sameUser(u.username, username);
        });

        return String(user && user.role ? user.role : '').trim().toLowerCase();
    }

    function getRoleBadgeMarkup(username) {
        const role = getUserRole(username);
        if (role === 'admin') {
            return '<span class="owner-title-badge ms-2">Owner</span>';
        }

        return '';
    }

    function normalizeVoteUsers(list) {
        if (!Array.isArray(list)) {
            return [];
        }

        const unique = [];
        list.forEach(function(name) {
            const cleaned = String(name || '').trim();
            if (!cleaned) {
                return;
            }

            const exists = unique.some(function(existing) {
                return sameUser(existing, cleaned);
            });

            if (!exists) {
                unique.push(cleaned);
            }
        });

        return unique;
    }

    function mapLeetCharacter(char) {
        const map = {
            '0': 'o',
            '1': 'i',
            '!': 'i',
            '|': 'i',
            '3': 'e',
            '4': 'a',
            '@': 'a',
            '5': 's',
            '$': 's',
            '6': 'g',
            '7': 't',
            '8': 'b',
            '9': 'g'
        };
        return map[char] || char;
    }

    function normalizeForModeration(text) {
        const raw = String(text || '')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        let mapped = '';
        for (let i = 0; i < raw.length; i += 1) {
            mapped += mapLeetCharacter(raw[i]);
        }

        const spaced = mapped.replace(/[^a-z0-9]+/g, ' ').trim();
        const compact = spaced.replace(/\s+/g, '');
        return {
            raw: raw,
            spaced: spaced,
            compact: compact
        };
    }

    function containsProfanity(text) {
        const normalized = normalizeForModeration(text);
        return BLOCKED_WORDS.some(function(word) {
            const boundary = new RegExp('(^|\\s)' + word + '(\\s|$)', 'i');
            const separated = new RegExp('(^|[^a-z0-9])' + word.split('').join('\\s*') + '($|[^a-z0-9])', 'i');
            return boundary.test(normalized.spaced) || separated.test(normalized.spaced);
        });
    }

    function containsSexualContent(text) {
        const normalized = normalizeForModeration(text);
        return SEXUAL_TERMS.some(function(word) {
            const boundary = new RegExp('(^|\\s)' + word + '(\\s|$)', 'i');
            const separated = new RegExp('(^|[^a-z0-9])' + word.split('').join('\\s*') + '($|[^a-z0-9])', 'i');
            return boundary.test(normalized.spaced) || separated.test(normalized.spaced);
        });
    }

    function containsHatePattern(text) {
        const normalized = normalizeForModeration(text);
        return HATE_PATTERNS.some(function(pattern) {
            return pattern.test(text) || pattern.test(normalized.spaced) || pattern.test(normalized.compact);
        });
    }

    function containsRacialAbuse(text) {
        const normalized = normalizeForModeration(text);

        const hasPattern = RACIAL_HARASSMENT_PATTERNS.some(function(pattern) {
            return pattern.test(text) || pattern.test(normalized.spaced) || pattern.test(normalized.compact);
        });
        if (hasPattern) {
            return true;
        }

        const groupFound = PROTECTED_GROUP_TERMS.some(function(term) {
            const boundary = new RegExp('(^|\\s)' + term + '(\\s|$)', 'i');
            return boundary.test(normalized.spaced) || normalized.compact.indexOf(term) !== -1;
        });

        if (!groupFound) {
            return false;
        }

        return GROUP_HOSTILITY_TERMS.some(function(term) {
            const boundary = new RegExp('(^|\\s)' + term + '(\\s|$)', 'i');
            return boundary.test(normalized.spaced) || normalized.compact.indexOf(term) !== -1;
        });
    }

    function containsRacialSlur(text) {
        const normalized = normalizeForModeration(text);
        const tokenVariantMatch = normalized.spaced
            .split(/\s+/)
            .some(function(token) {
                return /^n[i1!|l]g{2,}(?:a|er|uh)s?$/i.test(token);
            });

        if (tokenVariantMatch) {
            return true;
        }

        return RACIAL_SLUR_PATTERNS.some(function(pattern) {
            return pattern.test(text) || pattern.test(normalized.raw) || pattern.test(normalized.spaced) || pattern.test(normalized.compact);
        });
    }

    function isSpam(text) {
        const raw = String(text || '').trim();
        if (!raw) {
            return false;
        }

        if (raw.length > 400) {
            return true;
        }

        if (/(.)\1{6,}/i.test(raw)) {
            return true;
        }

        if (/(\b\w+\b)(?:\W+\1){4,}/i.test(raw)) {
            return true;
        }

        const symbolCount = (raw.match(/[!?._\-*~]/g) || []).length;
        if (symbolCount >= Math.max(12, Math.floor(raw.length * 0.35))) {
            return true;
        }

        const letters = raw.match(/[a-z]/gi) || [];
        const uppercase = raw.match(/[A-Z]/g) || [];
        if (letters.length >= 12 && uppercase.length / letters.length > 0.75) {
            return true;
        }

        const normalized = normalizeForModeration(raw);
        const words = normalized.spaced.split(/\s+/).filter(Boolean);
        if (words.length >= 8) {
            const unique = new Set(words);
            if (unique.size <= Math.ceil(words.length * 0.4)) {
                return true;
            }

            const freq = words.reduce(function(acc, w) {
                acc[w] = (acc[w] || 0) + 1;
                return acc;
            }, {});
            const topCount = Object.values(freq).reduce(function(max, n) {
                return Math.max(max, n);
            }, 0);
            if (topCount >= Math.ceil(words.length * 0.5)) {
                return true;
            }
        }

        if (/(.{2,30})\1{3,}/i.test(normalized.compact)) {
            return true;
        }

        return false;
    }

    function containsLink(text) {
        if (DIRECT_LINK_REGEX.test(text)) {
            return true;
        }

        const normalized = normalizeForModeration(text);
        if (OBFUSCATED_HTTP_REGEX.test(normalized.raw) || OBFUSCATED_WWW_REGEX.test(normalized.raw)) {
            return true;
        }

        if (DOMAIN_FRAGMENT_REGEX.test(normalized.raw)) {
            return true;
        }

        if (normalized.compact.indexOf('http') !== -1 || normalized.compact.indexOf('www') !== -1) {
            return true;
        }

        return false;
    }

    function getContentViolation(text) {
        const cleaned = String(text || '').trim();
        if (!cleaned) {
            return null;
        }

        if (containsLink(cleaned)) {
            return 'Links are not allowed in description.';
        }

        if (containsProfanity(cleaned)) {
            return 'Cussing is not allowed in description.';
        }

        if (containsSexualContent(cleaned)) {
            return 'Sexual content is not allowed in description.';
        }

        if (containsHatePattern(cleaned)) {
            return 'Hateful or violent language is not allowed in description.';
        }

        if (containsRacialAbuse(cleaned)) {
            return 'Racially abusive language is not allowed in description.';
        }

        if (containsRacialSlur(cleaned)) {
            return 'Racial slurs are not allowed in description.';
        }

        if (isSpam(cleaned)) {
            return 'Spam-like text is not allowed in description.';
        }

        return null;
    }

    function getSafeAvatarPath(path) {
        const candidate = String(path || '').trim();
        if (!candidate) {
            return DEFAULT_AVATAR;
        }

        const allowed = AVATAR_OPTIONS.some(function(option) {
            return option === candidate;
        });

        return allowed ? candidate : DEFAULT_AVATAR;
    }

    let _sbClient = null;

    function getSupabaseClient() {
        if (_sbClient) {
            return _sbClient;
        }
        const url = window.SUPABASE_URL;
        const key = window.SUPABASE_ANON_KEY;
        const validKeys = Boolean(url && key && String(url).indexOf('YOUR_') === -1 && String(key).indexOf('YOUR_') === -1);
        if (!validKeys) {
            return null;
        }
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            return null;
        }
        _sbClient = window.supabase.createClient(url, key);
        return _sbClient;
    }

    function sourceFromStorageKey(key) {
        const raw = String(key || '').replace(/Comments$/i, '');
        if (!raw) {
            return 'Game';
        }
        const normalized = raw.toLowerCase();
        if (normalized === '99nights') {
            return '99 Nights in the Forest';
        }
        if (normalized === 'arsenal') {
            return 'Arsenal';
        }
        if (normalized === 'bizlineage') {
            return 'Bizarre Lineage';
        }
        if (normalized === 'fishit') {
            return 'Fish It';
        }
        if (normalized === 'rerangers') {
            return 'Re:Rangers X';
        }
        if (normalized === 'sailorpiece') {
            return 'Sailor Piece';
        }
        if (normalized === 'hooked') {
            return 'Hooked!';
        }
        if (normalized === 'kinglegacy') {
            return 'King Legacy';
        }
        if (normalized === 'animecardclash') {
            return 'Anime Card Clash';
        }
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    function parseStoreComments(key) {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function getLocalCommentStores() {
        const stores = [];

        const legacy = parseStoreComments('comments');
        if (legacy.length > 0) {
            stores.push({
                key: 'legacy-comments',
                source: 'Rivals',
                comments: legacy
            });
        }

        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key || !/Comments$/i.test(key)) {
                continue;
            }

            const parsed = parseStoreComments(key);
            if (parsed.length === 0) {
                continue;
            }

            stores.push({
                key: key,
                source: sourceFromStorageKey(key),
                comments: parsed
            });
        }

        return stores;
    }

    function normalizeSharedCommentRow(row) {
        let parsedBody = null;
        if (typeof row.body === 'string') {
            try {
                parsedBody = JSON.parse(row.body);
            } catch (e) {
                parsedBody = null;
            }
        }

        const createdAtText = (parsedBody && parsedBody.createdAt)
            || (row.created_at ? new Date(row.created_at).toLocaleString() : 'Unknown time');
        const parsedCreatedAtMs = Number((parsedBody && parsedBody.createdAtMs) || Date.parse(String(row.created_at || createdAtText)));

        return {
            id: String(row.id),
            parentId: parsedBody && parsedBody.parentId != null ? String(parsedBody.parentId) : null,
            username: (parsedBody && parsedBody.username) || 'User',
            text: (parsedBody && parsedBody.text) || String(row.body || ''),
            createdAt: createdAtText,
            createdAtMs: Number.isFinite(parsedCreatedAtMs) ? parsedCreatedAtMs : 0,
            updatedAt: (parsedBody && parsedBody.updatedAt) || null,
            likes: normalizeVoteUsers(parsedBody && parsedBody.likes),
            dislikes: normalizeVoteUsers(parsedBody && parsedBody.dislikes)
        };
    }

    async function getSharedCommentStores() {
        const sb = getSupabaseClient();
        if (!sb) {
            return [];
        }

        const result = await sb
            .from(SUPABASE_COMMENTS_TABLE)
            .select('id, game_id, body, created_at')
            .order('created_at', { ascending: true });

        if (result.error || !Array.isArray(result.data)) {
            return [];
        }

        const storesByGame = new Map();
        result.data.forEach(function(row) {
            const gameId = String(row.game_id || '').trim().toLowerCase();
            if (!gameId) {
                return;
            }

            if (!storesByGame.has(gameId)) {
                storesByGame.set(gameId, {
                    key: 'shared-' + gameId,
                    source: sourceFromStorageKey(gameId + 'Comments'),
                    comments: []
                });
            }

            storesByGame.get(gameId).comments.push(normalizeSharedCommentRow(row));
        });

        return Array.from(storesByGame.values());
    }

    async function getCommentStores() {
        const localStores = getLocalCommentStores();
        const sharedStores = await getSharedCommentStores();
        return localStores.concat(sharedStores);
    }

    function normalizeComment(store, c) {
        const localId = String(c.id || Date.now());
        const localParent = c.parentId == null ? null : String(c.parentId);
        const createdAtText = c.createdAt || c.timestamp || 'Unknown time';
        const parsedCreatedAtMs = Number(c.createdAtMs || Date.parse(createdAtText));
        return {
            scopedId: store.key + ':' + localId,
            scopedParentId: localParent == null ? null : store.key + ':' + localParent,
            id: localId,
            parentId: localParent,
            username: c.username || c.author || 'Unknown',
            text: c.text || '',
            createdAt: createdAtText,
            createdAtMs: Number.isFinite(parsedCreatedAtMs) ? parsedCreatedAtMs : 0,
            updatedAt: c.updatedAt || null,
            likes: normalizeVoteUsers(c.likes),
            dislikes: normalizeVoteUsers(c.dislikes),
            source: store.source
        };
    }

    async function getAllNormalizedComments() {
        const stores = await getCommentStores();
        return stores.flatMap(function(store) {
            return store.comments.map(function(c) {
                return normalizeComment(store, c);
            });
        });
    }

    async function getAllCommentsForUser(usernameToMatch) {
        const allComments = await getAllNormalizedComments();
        const mine = allComments.filter(function(c) {
            return sameUser(c.username, usernameToMatch);
        });

        return mine.sort(function(a, b) {
            return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
        });
    }

    function getPageNumbers(currentPage, totalPages) {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, function(_, i) { return i + 1; });
        }

        const pages = [1];
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        if (start > 2) {
            pages.push('...');
        }

        for (let i = start; i <= end; i += 1) {
            pages.push(i);
        }

        if (end < totalPages - 1) {
            pages.push('...');
        }

        pages.push(totalPages);
        return pages;
    }

    function renderPaginationMarkup(listKey, currentPage, totalPages) {
        if (totalPages <= 1) {
            return '';
        }

        const numbers = getPageNumbers(currentPage, totalPages);
        let html = '<nav class="profile-pagination mt-2" aria-label="Profile section pages">';

        html += '<button class="btn btn-sm btn-outline-info" data-profile-page="' + listKey + '" data-page="' + (currentPage - 1) + '" ' + (currentPage === 1 ? 'disabled' : '') + '>Prev</button>';

        numbers.forEach(function(p) {
            if (p === '...') {
                html += '<span class="profile-pagination-ellipsis">...</span>';
                return;
            }

            const activeClass = p === currentPage ? 'btn-info text-dark' : 'btn-outline-info';
            html += '<button class="btn btn-sm ' + activeClass + '" data-profile-page="' + listKey + '" data-page="' + p + '">' + p + '</button>';
        });

        html += '<button class="btn btn-sm btn-outline-info" data-profile-page="' + listKey + '" data-page="' + (currentPage + 1) + '" ' + (currentPage === totalPages ? 'disabled' : '') + '>Next</button>';
        html += '</nav>';
        return html;
    }

    function renderPaginated(items, listElement, emptyText, listKey, renderItem) {
        if (!listElement) {
            return;
        }

        if (items.length === 0) {
            listElement.innerHTML = '<p class="text-muted mb-0">' + escapeHtml(emptyText) + '</p>';
            return;
        }

        const totalPages = Math.max(1, Math.ceil(items.length / PROFILE_ITEMS_PER_PAGE));
        pageState[listKey] = Math.min(Math.max(1, pageState[listKey] || 1), totalPages);
        const startIndex = (pageState[listKey] - 1) * PROFILE_ITEMS_PER_PAGE;
        const pageItems = items.slice(startIndex, startIndex + PROFILE_ITEMS_PER_PAGE);

        listElement.innerHTML = pageItems.map(renderItem).join('') + renderPaginationMarkup(listKey, pageState[listKey], totalPages);
    }

    function renderActivityCards(items, listElement, emptyText, listKey) {
        renderPaginated(items, listElement, emptyText, listKey, function(comment) {
            const editedTag = comment.updatedAt ? '<span class="badge text-bg-secondary ms-2">Edited</span>' : '';
            return '\n                <div class="border rounded p-3 mb-3" style="border-color: rgba(84,170,207,0.45) !important; background: rgba(10, 20, 30, 0.55);">\n                    <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">\n                        <div>\n                            <strong>' + escapeHtml(comment.source) + '</strong>' + editedTag + '\n                            <div class="small text-info mt-1">' + escapeHtml(comment.createdAt) + '</div>\n                        </div>\n                    </div>\n                    <p class="mb-0 mt-2">' + escapeHtml(comment.text) + '</p>\n                </div>\n            ';
        });
    }

    async function getRepliesReceived(usernameToMatch) {
        const all = await getAllNormalizedComments();
        const byScopedId = new Map();

        all.forEach(function(c) {
            byScopedId.set(c.scopedId, c);
        });

        const incoming = all.filter(function(c) {
            if (c.scopedParentId == null) {
                return false;
            }

            const parent = byScopedId.get(c.scopedParentId);
            if (!parent) {
                return false;
            }

            return sameUser(parent.username, usernameToMatch) && !sameUser(c.username, usernameToMatch);
        }).map(function(c) {
            const parent = byScopedId.get(c.scopedParentId);
            return {
                id: c.id,
                createdAtMs: c.createdAtMs,
                source: c.source,
                fromUser: c.username,
                text: c.text,
                createdAt: c.createdAt,
                parentText: parent ? parent.text : ''
            };
        });

        return incoming.sort(function(a, b) {
            return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
        });
    }

    function renderIncomingReplies(items, listElement, listKey) {
        renderPaginated(items, listElement, 'No one has replied to your comments yet.', listKey, function(item) {
            const fromUserBadge = getRoleBadgeMarkup(item.fromUser);
            return '\n                <div class="border rounded p-3 mb-3" style="border-color: rgba(84,170,207,0.45) !important; background: rgba(10, 20, 30, 0.55);">\n                    <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">\n                        <div>\n                            <strong>' + escapeHtml(item.source) + '</strong>\n                            <span class="badge text-bg-info ms-2">From ' + escapeHtml(item.fromUser) + '</span>' + fromUserBadge + '\n                            <div class="small text-info mt-1">' + escapeHtml(item.createdAt) + '</div>\n                        </div>\n                    </div>\n                    <p class="mb-1 mt-2">' + escapeHtml(item.text) + '</p>\n                    <p class="mb-0 small text-muted">On your comment: ' + escapeHtml(item.parentText || '') + '</p>\n                </div>\n            ';
        });
    }

    async function getReactionTotalsForUser(usernameToMatch) {
        const allComments = await getAllNormalizedComments();
        return allComments.reduce(function(acc, c) {
            if (!sameUser(c.username, usernameToMatch)) {
                return acc;
            }

            acc.likes += c.likes.length;
            acc.dislikes += c.dislikes.length;
            return acc;
        }, { likes: 0, dislikes: 0 });
    }

    async function renderComments(usernameToMatch) {
        const activity = await getAllCommentsForUser(usernameToMatch);
        const topLevelComments = activity.filter(function(item) {
            return item.parentId == null;
        });
        const replies = activity.filter(function(item) {
            return item.parentId != null;
        });

        renderActivityCards(topLevelComments, commentsList, 'No comments found for this profile yet.', 'comments');
        return {
            replies: replies
        };
    }

    function renderAvatarChoices(selectedAvatar, ownProfile) {
        if (!profileAvatarChoices || !profilePictureSection) {
            return;
        }

        if (!ownProfile) {
            profilePictureSection.style.display = 'none';
            return;
        }

        profilePictureSection.style.display = 'block';
        profileAvatarChoices.innerHTML = AVATAR_OPTIONS.map(function(path, idx) {
            const selectedClass = path === selectedAvatar ? 'is-selected' : '';
            return '\n                <button type="button" class="avatar-choice-btn ' + selectedClass + '" data-avatar-choice="' + path + '" aria-label="Select avatar ' + (idx + 1) + '">\n                    <img src="' + path + '" alt="Avatar option ' + (idx + 1) + '">\n                </button>\n            ';
        }).join('');
    }

    if (!targetUsername) {
        if (notLoggedInShell) {
            notLoggedInShell.style.display = 'block';
            notLoggedInShell.innerHTML = '<article class="card bg-dark text-white shadow-lg border-0 mx-auto" style="max-width: 560px;"><div class="card-body p-4"><h2 class="h4 mb-3">No profile selected</h2><a class="btn btn-primary" href="../index.html"><i class="bi bi-house me-2"></i>Back Home</a></div></article>';
        }
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    let user = users.find(function(u) {
        return sameUser(u.username, targetUsername);
    });

    // Fallback: derive a lightweight public profile from known comments.
    if (!user) {
        const stores = await getCommentStores();
        const matchedComments = [];

        stores.forEach(function(store) {
            const comments = Array.isArray(store && store.comments) ? store.comments : [];
            comments.forEach(function(comment) {
                if (sameUser(comment && comment.username, targetUsername)) {
                    matchedComments.push(comment);
                }
            });
        });

        if (matchedComments.length > 0) {
            const firstCreatedMs = matchedComments.reduce(function(minMs, comment) {
                const value = Number(comment && comment.createdAtMs);
                if (!Number.isFinite(value) || value <= 0) {
                    return minMs;
                }
                return minMs === 0 ? value : Math.min(minMs, value);
            }, 0);

            user = {
                username: targetUsername,
                email: '',
                avatar: DEFAULT_AVATAR,
                description: '',
                registeredDate: firstCreatedMs > 0 ? new Date(firstCreatedMs).toISOString() : null,
                role: 'user'
            };
        }
    }

    if (!user) {
        if (notLoggedInShell) {
            notLoggedInShell.style.display = 'block';
            notLoggedInShell.innerHTML = '<article class="card bg-dark text-white shadow-lg border-0 mx-auto" style="max-width: 560px;"><div class="card-body p-4"><h2 class="h4 mb-3">Profile not found</h2><p class="text-muted">This user may not have created an account yet.</p><a class="btn btn-primary" href="../index.html"><i class="bi bi-house me-2"></i>Back Home</a></div></article>';
        }
        return;
    }

    const isOwnProfile = isLoggedIn && currentUser && sameUser(user.username, currentUser);

    profileShell.style.display = 'block';
    if (usernameEl) {
        usernameEl.innerHTML = escapeHtml(user.username) + getRoleBadgeMarkup(user.username);
    }
    joinedEl.textContent = user.registeredDate ? new Date(user.registeredDate).toLocaleString() : 'Unknown';
    descriptionInput.value = user.description || '';

    const selectedAvatar = getSafeAvatarPath(user.avatar);
    if (profileAvatar) {
        profileAvatar.src = selectedAvatar;
    }

    const totals = await getReactionTotalsForUser(user.username);
    if (totalLikesEl) {
        totalLikesEl.textContent = String(totals.likes);
    }
    if (totalDislikesEl) {
        totalDislikesEl.textContent = String(totals.dislikes);
    }

    if (profileTitle) {
        profileTitle.innerHTML = '<i class="bi bi-person-circle me-2"></i>' + (isOwnProfile ? 'Your Profile' : (escapeHtml(user.username) + '\'s Profile'));
    }

    if (profileCommentsTitle) {
        profileCommentsTitle.innerHTML = '<i class="bi bi-chat-left-text me-2"></i>' + (isOwnProfile ? 'Your Comments' : ('Comments by ' + escapeHtml(user.username)));
    }

    if (profileRepliesTitle && repliesSection) {
        profileRepliesTitle.innerHTML = '<i class="bi bi-reply me-2"></i>Your Replies';
    }

    if (profileIncomingRepliesTitle && incomingRepliesSection) {
        profileIncomingRepliesTitle.innerHTML = '<i class="bi bi-chat-dots me-2"></i>Replies You Got';
    }

    if (!isOwnProfile) {
        if (profileDescriptionTitle) {
            profileDescriptionTitle.textContent = 'Description';
        }
        if (descriptionInput) {
            descriptionInput.setAttribute('readonly', 'readonly');
        }
        if (saveButton) {
            saveButton.style.display = 'none';
        }
        if (saveStatus) {
            saveStatus.textContent = 'Read-only profile';
        }
        if (repliesSection) {
            repliesSection.style.display = 'none';
        }
        if (incomingRepliesSection) {
            incomingRepliesSection.style.display = 'none';
        }
        if (profilePictureSection) {
            profilePictureSection.style.display = 'none';
        }
    }

    renderAvatarChoices(selectedAvatar, isOwnProfile);

    const rendered = await renderComments(user.username);

    if (isOwnProfile && repliesSection && repliesList) {
        repliesSection.style.display = 'block';
        renderActivityCards(rendered.replies, repliesList, 'You have not posted any replies yet.', 'replies');
    }

    if (isOwnProfile && incomingRepliesSection && incomingRepliesList) {
        incomingRepliesSection.style.display = 'block';
        renderIncomingReplies(await getRepliesReceived(user.username), incomingRepliesList, 'incoming');
    }

    async function handleProfilePageClick(e) {
        const btn = e.target.closest('[data-profile-page][data-page]');
        if (!btn) {
            return;
        }

        const key = btn.getAttribute('data-profile-page');
        const targetPage = Number(btn.getAttribute('data-page'));
        if (!key || !Number.isFinite(targetPage)) {
            return;
        }

        pageState[key] = Math.max(1, targetPage);
        const refreshed = await renderComments(user.username);

        if (isOwnProfile && repliesSection && repliesList) {
            renderActivityCards(refreshed.replies, repliesList, 'You have not posted any replies yet.', 'replies');
        }

        if (isOwnProfile && incomingRepliesSection && incomingRepliesList) {
            renderIncomingReplies(await getRepliesReceived(user.username), incomingRepliesList, 'incoming');
        }
    }

    if (commentsList) {
        commentsList.addEventListener('click', handleProfilePageClick);
    }
    if (repliesList) {
        repliesList.addEventListener('click', handleProfilePageClick);
    }
    if (incomingRepliesList) {
        incomingRepliesList.addEventListener('click', handleProfilePageClick);
    }

    if (!isOwnProfile) {
        return;
    }

    descriptionForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const updatedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const idx = updatedUsers.findIndex(function(u) {
            return sameUser(u.username, currentUser);
        });
        if (idx === -1) {
            return;
        }

        const proposedDescription = descriptionInput.value.trim();
        const violation = getContentViolation(proposedDescription);
        if (violation) {
            saveStatus.classList.remove('text-info');
            saveStatus.classList.add('text-danger');
            saveStatus.textContent = violation;
            return;
        }

        updatedUsers[idx].description = proposedDescription;
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        window.dispatchEvent(new CustomEvent('userProfileUpdated'));

        saveStatus.classList.remove('text-danger');
        saveStatus.classList.add('text-info');
        saveStatus.textContent = 'Description saved.';
        setTimeout(function() {
            saveStatus.textContent = '';
        }, 1800);
    });

    if (profileAvatarChoices) {
        profileAvatarChoices.addEventListener('click', function(e) {
            const choiceButton = e.target.closest('[data-avatar-choice]');
            if (!choiceButton || !isOwnProfile) {
                return;
            }

            const chosenAvatar = getSafeAvatarPath(choiceButton.getAttribute('data-avatar-choice'));
            const updatedUsers = JSON.parse(localStorage.getItem('users') || '[]');
            const idx = updatedUsers.findIndex(function(u) {
                return sameUser(u.username, currentUser);
            });
            if (idx === -1) {
                return;
            }

            updatedUsers[idx].avatar = chosenAvatar;
            localStorage.setItem('users', JSON.stringify(updatedUsers));
            window.dispatchEvent(new CustomEvent('userProfileUpdated'));

            if (profileAvatar) {
                profileAvatar.src = chosenAvatar;
            }
            renderAvatarChoices(chosenAvatar, true);

            saveStatus.classList.remove('text-danger');
            saveStatus.classList.add('text-info');
            saveStatus.textContent = 'Profile picture updated.';
            setTimeout(function() {
                saveStatus.textContent = '';
            }, 1600);
        });
    }
});
