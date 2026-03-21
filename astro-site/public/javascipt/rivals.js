function copyToClipboard(element) {
    // Find the text in the <strong> tag within the same list item
    const textToCopy = element.parentElement.querySelector('.copy-text').innerText;

    navigator.clipboard.writeText(textToCopy).then(() => {
        // Optional: Visual feedback (changes icon to a checkmark briefly)
        const originalClass = element.className;
        element.className = "bi bi-check2 text-success"; 
        
        setTimeout(() => {
            element.className = originalClass;
        }, 1500);
    });
}

// Comment system functionality
document.addEventListener('DOMContentLoaded', function() {
    const addCommentForm = document.getElementById('addCommentForm');
    const commentText = document.getElementById('commentText');
    const commentsList = document.getElementById('commentsList');
    const commentsSection = document.getElementById('commentsSection');
    const loginPrompt = document.getElementById('loginPrompt');
    const storageIdRaw = (document.body && document.body.dataset && document.body.dataset.commentStorage)
        ? document.body.dataset.commentStorage
        : 'rivals';
    const STORAGE_ID = String(storageIdRaw).toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'rivals';
    const COMMENTS_KEY = STORAGE_ID + 'Comments';
    const LEGACY_KEY = STORAGE_ID === 'rivals' ? 'comments' : STORAGE_ID + 'CommentsLegacy';
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
    const SPAM_WINDOW_MS = 60000;
    const MAX_POSTS_PER_WINDOW = 6;
    const MIN_SECONDS_BETWEEN_POSTS = 4;
    const DUPLICATE_LOOKBACK = 20;
    const COMMENTS_PER_PAGE = 8;
    const DEFAULT_AVATAR = '../images/avatars/avatar-1.svg';
    const SUPABASE_COMMENTS_TABLE = 'comments';

    let activeReplyParentId = null;
    let activeEditCommentId = null;
    let currentCommentsPage = 1;
    let commentsSource = 'local';
    let sharedCommentsWarningShown = false;
    let sharedCommentsCachedError = null;
    let _loadCommentsInFlight = false;
    let _sbClient = null;
    let _sharedCommentsCache = null;
    let _sharedCommentsCacheTs = 0;
    const CACHE_TTL_MS = 20000; // reuse fetched comments for 20 seconds

    function currentUser() {
        return localStorage.getItem('currentUser');
    }

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

    function invalidateCommentsCache() {
        _sharedCommentsCache = null;
        _sharedCommentsCacheTs = 0;
    }

    async function getSupabaseAuthUser() {
        if (typeof window.gmecodes_getUser === 'function') {
            try {
                const user = await window.gmecodes_getUser();
                if (user && user.id) {
                    return user;
                }
            } catch (e) {
                return null;
            }
        }

        const sb = getSupabaseClient();
        if (!sb || !sb.auth || typeof sb.auth.getUser !== 'function') {
            return null;
        }

        const result = await sb.auth.getUser();
        return result && result.data ? result.data.user : null;
    }

    function toDisplayTimestamp(value) {
        const parsed = Date.parse(String(value || ''));
        if (Number.isFinite(parsed)) {
            return new Date(parsed).toLocaleString();
        }
        return new Date().toLocaleString();
    }

    function buildSharedBody(comment) {
        return JSON.stringify({
            parentId: comment.parentId == null ? null : String(comment.parentId),
            username: comment.username || 'User',
            text: comment.text || '',
            createdAt: comment.createdAt || new Date().toLocaleString(),
            createdAtMs: Number(comment.createdAtMs || Date.now()),
            updatedAt: comment.updatedAt || null,
            likes: normalizeVoteUsers(comment.likes),
            dislikes: normalizeVoteUsers(comment.dislikes)
        });
    }

    function normalizeSharedRow(row) {
        let parsedBody = null;
        if (typeof row.body === 'string') {
            try {
                parsedBody = JSON.parse(row.body);
            } catch (e) {
                parsedBody = null;
            }
        }

        const createdAtText = (parsedBody && parsedBody.createdAt) || toDisplayTimestamp(row.created_at);
        const parsedCreatedAtMs = Number((parsedBody && parsedBody.createdAtMs) || Date.parse(String(row.created_at || createdAtText)));

        return {
            id: String(row.id),
            parentId: parsedBody && parsedBody.parentId != null ? String(parsedBody.parentId) : null,
            username: (parsedBody && parsedBody.username) || 'User',
            text: (parsedBody && parsedBody.text) || String(row.body || ''),
            createdAt: createdAtText,
            createdAtMs: Number.isFinite(parsedCreatedAtMs) ? parsedCreatedAtMs : Date.now(),
            updatedAt: (parsedBody && parsedBody.updatedAt) || null,
            likes: normalizeVoteUsers(parsedBody && parsedBody.likes),
            dislikes: normalizeVoteUsers(parsedBody && parsedBody.dislikes)
        };
    }

    async function readSharedComments() {
        const sb = getSupabaseClient();
        if (!sb) {
            return null;
        }

        const now = Date.now();
        if (_sharedCommentsCache && (now - _sharedCommentsCacheTs) < CACHE_TTL_MS) {
            return _sharedCommentsCache;
        }

        const result = await sb
            .from(SUPABASE_COMMENTS_TABLE)
            .select('id, game_id, user_id, body, created_at')
            .eq('game_id', STORAGE_ID)
            .order('created_at', { ascending: true });

        if (result.error) {
            sharedCommentsCachedError = result.error;
            return null;
        }

        sharedCommentsCachedError = null;
        const rows = Array.isArray(result.data) ? result.data : [];
        _sharedCommentsCache = rows.map(normalizeSharedRow);
        _sharedCommentsCacheTs = now;
        return _sharedCommentsCache;
    }

    async function insertSharedComment(comment) {
        const sb = getSupabaseClient();
        if (!sb) {
            return false;
        }

        const user = await getSupabaseAuthUser();
        if (!user || !user.id) {
            return false;
        }

        const result = await sb
            .from(SUPABASE_COMMENTS_TABLE)
            .insert({
                game_id: STORAGE_ID,
                user_id: user.id,
                body: buildSharedBody(comment)
            });

        if (result.error) {
            sharedCommentsCachedError = result.error;
            return false;
        }

        sharedCommentsCachedError = null;
        invalidateCommentsCache();
        return true;
    }

    async function updateSharedComment(comment) {
        const sb = getSupabaseClient();
        if (!sb) {
            return false;
        }

        const normalizedId = String(comment && comment.id != null ? comment.id : '').trim();
        if (!normalizedId) {
            return false;
        }

        const numericId = Number(normalizedId);
        const idValue = Number.isFinite(numericId) && String(numericId) === normalizedId ? numericId : normalizedId;

        const result = await sb
            .from(SUPABASE_COMMENTS_TABLE)
            .update({ body: buildSharedBody(comment) })
            .select('id')
            .eq('id', idValue)
            .eq('game_id', STORAGE_ID);

        if (result.error) {
            sharedCommentsCachedError = result.error;
            return false;
        }

        if (!Array.isArray(result.data) || result.data.length === 0) {
            sharedCommentsCachedError = new Error('No rows were updated. Check comments table update policy and ownership rules.');
            return false;
        }

        sharedCommentsCachedError = null;
        invalidateCommentsCache();
        return true;
    }

    async function deleteSharedComments(ids) {
        const sb = getSupabaseClient();
        if (!sb) {
            return false;
        }

        const normalizedIds = ids
            .map(function(id) { return String(id == null ? '' : id).trim(); })
            .filter(Boolean);

        if (normalizedIds.length === 0) {
            return false;
        }

        const allNumeric = normalizedIds.every(function(id) { return /^\d+$/.test(id); });
        const deleteIds = allNumeric
            ? normalizedIds.map(function(id) { return Number(id); })
            : normalizedIds;

        const result = await sb
            .from(SUPABASE_COMMENTS_TABLE)
            .delete()
            .eq('game_id', STORAGE_ID)
            .in('id', deleteIds);

        if (result.error) {
            sharedCommentsCachedError = result.error;
            return false;
        }

        sharedCommentsCachedError = null;
        invalidateCommentsCache();
        return true;
    }

    function warnSharedReadOnly() {
        if (sharedCommentsWarningShown) {
            return;
        }

        sharedCommentsWarningShown = true;
        window.alert('Comments are shared across devices, but this action needs Supabase update/delete policies enabled for the comments table.');
    }

    function getSharedErrorMessage() {
        if (!sharedCommentsCachedError) {
            return '';
        }

        return String(sharedCommentsCachedError.message || sharedCommentsCachedError.details || sharedCommentsCachedError.hint || '').trim();
    }

    function isLoggedIn() {
        return localStorage.getItem('loggedIn') === 'true' && !!currentUser();
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

    function normalizeId(id) {
        return String(id);
    }

    function isSafeAvatarPath(path) {
        return /^(?:\.\.\/)?images\/avatars\/avatar-[1-6]\.svg$/i.test(String(path || '').trim());
    }

    function getUserAvatarPath(username) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(function(u) {
            return sameUser(u.username, username);
        });

        if (!user || !isSafeAvatarPath(user.avatar)) {
            return DEFAULT_AVATAR;
        }

        return user.avatar;
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

            return boundary.test(normalized.spaced) ||
                separated.test(normalized.spaced);
        });
    }

    function containsSexualContent(text) {
        const normalized = normalizeForModeration(text);
        return SEXUAL_TERMS.some(function(word) {
            const boundary = new RegExp('(^|\\s)' + word + '(\\s|$)', 'i');
            const separated = new RegExp('(^|[^a-z0-9])' + word.split('').join('\\s*') + '($|[^a-z0-9])', 'i');
            return boundary.test(normalized.spaced) ||
                separated.test(normalized.spaced);
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

    function isSpam(text) {
        const raw = String(text || '').trim();
        if (!raw) {
            return false;
        }

        if (raw.length > 400) {
            return true;
        }

        // Detect very long repeated characters like aaaaaaaa or !!!!!!!!
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

        // Detect repeated phrase spam.
        if (/(.{2,30})\1{3,}/i.test(normalized.compact)) {
            return true;
        }

        return false;
    }

    function canonicalizeForSpam(text) {
        return normalizeForModeration(text).spaced.replace(/\s+/g, ' ').trim();
    }

    function getBehaviorSpamViolation(text, options) {
        const username = options && options.username ? options.username : null;
        const comments = options && Array.isArray(options.comments) ? options.comments : [];
        const editingId = options && options.editingId ? normalizeId(options.editingId) : null;

        if (!username || comments.length === 0) {
            return null;
        }

        const now = Date.now();
        const userComments = comments.filter(function(c) {
            if (!sameUser(c.username, username)) {
                return false;
            }

            if (editingId && normalizeId(c.id) === editingId) {
                return false;
            }

            return true;
        });

        const recent = userComments.filter(function(c) {
            return Number(c.createdAtMs || 0) >= now - SPAM_WINDOW_MS;
        });

        if (recent.length >= MAX_POSTS_PER_WINDOW) {
            return 'You are posting too fast. Please wait a bit.';
        }

        const latestMs = userComments.reduce(function(maxMs, c) {
            return Math.max(maxMs, Number(c.createdAtMs || 0));
        }, 0);

        if (latestMs > 0) {
            const diffSec = Math.floor((now - latestMs) / 1000);
            if (diffSec < MIN_SECONDS_BETWEEN_POSTS) {
                return 'Please wait a few seconds before posting again.';
            }
        }

        const canonicalNew = canonicalizeForSpam(text);
        const duplicates = userComments
            .slice()
            .sort(function(a, b) {
                return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
            })
            .slice(0, DUPLICATE_LOOKBACK)
            .some(function(c) {
                return canonicalizeForSpam(c.text || '') === canonicalNew;
            });

        if (duplicates) {
            return 'Duplicate message detected. Please avoid reposting the same text.';
        }

        return null;
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

    function getContentViolation(text, options) {
        const cleaned = String(text || '').trim();
        if (!cleaned) {
            return null;
        }

        if (containsLink(cleaned)) {
            return 'Links are not allowed.';
        }

        if (containsProfanity(cleaned)) {
            return 'Cussing is not allowed.';
        }

        if (containsSexualContent(cleaned)) {
            return 'Sexual content is not allowed.';
        }

        if (containsHatePattern(cleaned)) {
            return 'Hateful or violent language is not allowed.';
        }

        if (containsRacialAbuse(cleaned)) {
            return 'Racially abusive language is not allowed.';
        }

        if (containsRacialSlur(cleaned)) {
            return 'Racial slurs are not allowed.';
        }

        if (isSpam(cleaned)) {
            return 'Spam-like text is not allowed.';
        }

        const behaviorViolation = getBehaviorSpamViolation(cleaned, options);
        if (behaviorViolation) {
            return behaviorViolation;
        }

        return null;
    }

    async function getComments() {
        const sharedComments = await readSharedComments();
        if (sharedComments) {
            commentsSource = 'shared';
            return sharedComments;
        }

        commentsSource = 'local';
        let comments = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');

        if (comments.length === 0) {
            // Migrate from old flat key once.
            const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
            if (legacy.length > 0) {
                comments = legacy.map(function(c) {
                    const createdAtText = c.timestamp || new Date().toLocaleString();
                    const parsedMs = Date.parse(createdAtText);
                    return {
                        id: c.id || Date.now() + Math.floor(Math.random() * 1000),
                        parentId: null,
                        username: c.username || c.author || currentUser() || 'Guest',
                        text: c.text,
                        createdAt: createdAtText,
                        createdAtMs: Number.isNaN(parsedMs) ? Date.now() : parsedMs,
                        updatedAt: null,
                        likes: [],
                        dislikes: []
                    };
                });
                saveComments(comments);
            }
        }

        // Normalize old records so ownership and replies work reliably.
        let touched = false;
        comments = comments.map(function(c) {
            const createdAtText = c.createdAt || c.timestamp || new Date().toLocaleString();
            const parsedCreatedAtMs = Number(c.createdAtMs || Date.parse(createdAtText));
            const normalized = {
                id: c.id || Date.now() + Math.floor(Math.random() * 1000),
                parentId: c.parentId ?? null,
                username: c.username || c.author || currentUser() || 'Guest',
                text: c.text || '',
                createdAt: createdAtText,
                createdAtMs: Number.isNaN(parsedCreatedAtMs) ? Date.now() : parsedCreatedAtMs,
                updatedAt: c.updatedAt || null,
                likes: normalizeVoteUsers(c.likes),
                dislikes: normalizeVoteUsers(c.dislikes)
            };

            if (
                normalized.id !== c.id ||
                normalized.parentId !== c.parentId ||
                normalized.username !== c.username ||
                normalized.text !== c.text ||
                normalized.createdAt !== c.createdAt ||
                normalized.createdAtMs !== c.createdAtMs ||
                normalized.updatedAt !== c.updatedAt ||
                !Array.isArray(c.likes) ||
                !Array.isArray(c.dislikes)
            ) {
                touched = true;
            }
            return normalized;
        });

        if (touched) {
            saveComments(comments);
        }

        return comments;
    }

    function saveComments(comments) {
        localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
    }

    function getCommentSortValue(comment) {
        const createdAtMs = Number(comment && comment.createdAtMs);
        if (Number.isFinite(createdAtMs) && createdAtMs > 0) {
            return createdAtMs;
        }

        const parsedCreatedAt = Date.parse(String(comment && comment.createdAt ? comment.createdAt : ''));
        if (Number.isFinite(parsedCreatedAt)) {
            return parsedCreatedAt;
        }

        const numericId = Number(comment && comment.id);
        return Number.isFinite(numericId) ? numericId : 0;
    }

    function deleteCommentAndReplies(comments, targetId) {
        const normalizedTargetId = normalizeId(targetId);
        const children = comments.filter(function(c) {
            return c.parentId != null && normalizeId(c.parentId) === normalizedTargetId;
        });
        let filtered = comments.filter(function(c) {
            return normalizeId(c.id) !== normalizedTargetId;
        });

        children.forEach(function(child) {
            filtered = deleteCommentAndReplies(filtered, child.id);
        });

        return filtered;
    }

    function renderCommentNode(comment, childrenMap, level) {
        const commentId = normalizeId(comment.id);
        const mine = sameUser(comment.username, currentUser());
        const avatarPath = getUserAvatarPath(comment.username);
        const roleBadge = getRoleBadgeMarkup(comment.username);
        const likes = Array.isArray(comment.likes) ? comment.likes : [];
        const dislikes = Array.isArray(comment.dislikes) ? comment.dislikes : [];
        const likedByMe = likes.some(function(name) { return sameUser(name, currentUser()); });
        const dislikedByMe = dislikes.some(function(name) { return sameUser(name, currentUser()); });
        const created = escapeHtml(comment.createdAt || '');
        const profileHref = `/html/profile?user=${encodeURIComponent(comment.username || '')}`;
        const edited = comment.updatedAt ? '<small class="text-info ms-2">(edited)</small>' : '';
        const marginClass = level > 0 ? 'comment-reply-level' : '';

        let html = `
            <article class="comment-node card mb-3 bg-dark text-white ${marginClass}" data-comment-id="${commentId}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div>
                            <h6 class="card-title mb-1 comment-user-meta"><img class="comment-user-avatar" src="${avatarPath}" alt="${escapeHtml(comment.username)} avatar"><a class="comment-user-link" href="${profileHref}">${escapeHtml(comment.username)}</a>${roleBadge} ${edited}</h6>
                            <small class="comment-time">${created}</small>
                        </div>
                        <div class="comment-actions d-flex gap-2 flex-wrap">
                            <button class="btn btn-sm btn-outline-info" data-action="reply" data-id="${commentId}">Reply</button>
                            ${mine ? `<button class="btn btn-sm btn-outline-warning" data-action="edit" data-id="${commentId}">Edit</button>` : ''}
                            ${mine ? `<button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${commentId}">Delete</button>` : ''}
                        </div>
                    </div>
                    <p class="card-text mt-2 mb-0" data-comment-text>${escapeHtml(comment.text)}</p>
                    <div class="comment-votes mt-3 d-flex gap-2 flex-wrap">
                        <button class="btn btn-sm ${likedByMe ? 'btn-success' : 'btn-outline-success'}" data-action="like" data-id="${commentId}">
                            <i class="bi bi-hand-thumbs-up me-1"></i>Like <span class="badge text-bg-light ms-1">${likes.length}</span>
                        </button>
                        <button class="btn btn-sm ${dislikedByMe ? 'btn-danger' : 'btn-outline-danger'}" data-action="dislike" data-id="${commentId}">
                            <i class="bi bi-hand-thumbs-down me-1"></i>Dislike <span class="badge text-bg-light ms-1">${dislikes.length}</span>
                        </button>
                    </div>
                    ${activeEditCommentId === commentId ? `
                        <div class="mt-3">
                            <textarea class="form-control mb-2" rows="3" maxlength="100" data-edit-input="${commentId}">${escapeHtml(comment.text)}</textarea>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-success" data-action="save-edit" data-id="${commentId}">Save</button>
                                <button class="btn btn-sm btn-secondary" data-action="cancel-edit">Cancel</button>
                            </div>
                        </div>
                    ` : ''}
                    ${activeReplyParentId === commentId ? `
                        <div class="mt-3">
                            <textarea class="form-control mb-2" rows="2" maxlength="100" placeholder="Write a reply..." data-reply-input="${commentId}"></textarea>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-primary" data-action="post-reply" data-id="${commentId}">Post Reply</button>
                                <button class="btn btn-sm btn-secondary" data-action="cancel-reply">Cancel</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </article>
        `;

        const children = childrenMap.get(commentId) || [];
        children.forEach(function(child) {
            html += renderCommentNode(child, childrenMap, level + 1);
        });

        return html;
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

    function renderCommentsPagination(currentPage, totalPages) {
        if (totalPages <= 1) {
            return '';
        }

        const numbers = getPageNumbers(currentPage, totalPages);
        let html = '<nav class="comment-pagination mt-3" aria-label="Comments pages">';

        html += '<button class="btn btn-sm btn-outline-info" data-action="page" data-page="' + (currentPage - 1) + '" ' + (currentPage === 1 ? 'disabled' : '') + '>Prev</button>';

        numbers.forEach(function(p) {
            if (p === '...') {
                html += '<span class="comment-pagination-ellipsis">...</span>';
                return;
            }

            const activeClass = p === currentPage ? 'btn-info text-dark' : 'btn-outline-info';
            html += '<button class="btn btn-sm ' + activeClass + '" data-action="page" data-page="' + p + '">' + p + '</button>';
        });

        html += '<button class="btn btn-sm btn-outline-info" data-action="page" data-page="' + (currentPage + 1) + '" ' + (currentPage === totalPages ? 'disabled' : '') + '>Next</button>';
        html += '</nav>';
        return html;
    }

    async function loadComments() {
        if (!commentsList) {
            return;
        }

        if (_loadCommentsInFlight) {
            return;
        }
        _loadCommentsInFlight = true;

        let comments;
        try {
            comments = await getComments();
        } finally {
            _loadCommentsInFlight = false;
        }
        commentsList.innerHTML = '';

        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="text-muted">No comments yet. Be the first to comment!</p>';
            return;
        }

        const byParent = new Map();
        comments.forEach(function(comment) {
            const key = comment.parentId == null ? 'root' : normalizeId(comment.parentId);
            if (!byParent.has(key)) {
                byParent.set(key, []);
            }
            byParent.get(key).push(comment);
        });

        byParent.forEach(function(list) {
            list.sort(function(a, b) {
                return getCommentSortValue(b) - getCommentSortValue(a);
            });
        });

        const rootComments = byParent.get('root') || [];
        const totalPages = Math.max(1, Math.ceil(rootComments.length / COMMENTS_PER_PAGE));
        currentCommentsPage = Math.min(Math.max(1, currentCommentsPage), totalPages);
        const startIndex = (currentCommentsPage - 1) * COMMENTS_PER_PAGE;
        const pagedRoots = rootComments.slice(startIndex, startIndex + COMMENTS_PER_PAGE);

        let html = '';
        pagedRoots.forEach(function(comment) {
            html += renderCommentNode(comment, byParent, 0);
        });

        html += renderCommentsPagination(currentCommentsPage, totalPages);

        commentsList.innerHTML = html;
    }

    async function checkLogin() {
        if (!commentsSection || !loginPrompt) {
            return;
        }

        if (isLoggedIn()) {
            commentsSection.style.display = 'block';
            loginPrompt.style.display = 'none';
            await loadComments();
        } else {
            commentsSection.style.display = 'none';
            loginPrompt.style.display = 'block';
        }
    }

    window.addEventListener('userLoggedIn', function() {
        checkLogin();
    });

    window.addEventListener('userLoggedOut', function() {
        checkLogin();
    });

    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = currentUser();
            const text = (commentText ? commentText.value : '').trim();

            if (!username || !text) {
                return;
            }

            if (text.length > 100) {
                window.alert('Comments cannot be longer than 100 characters.');
                return;
            }

            const comments = await getComments();
            const violation = getContentViolation(text, {
                username: username,
                comments: comments
            });
            if (violation) {
                window.alert(violation);
                return;
            }

            const nextComment = {
                id: Date.now(),
                parentId: null,
                username: username,
                text: text,
                createdAt: new Date().toLocaleString(),
                createdAtMs: Date.now(),
                updatedAt: null,
                likes: [],
                dislikes: []
            };

            if (commentsSource === 'shared') {
                const inserted = await insertSharedComment(nextComment);
                if (!inserted) {
                    const details = getSharedErrorMessage();
                    window.alert('Could not save comment to shared storage.' + (details ? '\n\n' + details : ' Please log in with email and try again.'));
                    return;
                }
            } else {
                window.alert('Shared comments are unavailable on this page right now. Please refresh and log in again.');
                return;
            }

            if (commentText) {
                commentText.value = '';
            }

            activeReplyParentId = null;
            activeEditCommentId = null;
            currentCommentsPage = 1;
            await loadComments();
        });
    }

    if (commentsList) {
        commentsList.addEventListener('click', async function(e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) {
                return;
            }

            const action = btn.getAttribute('data-action');
            const pageTarget = Number(btn.getAttribute('data-page'));
            if (action === 'page' && Number.isFinite(pageTarget)) {
                currentCommentsPage = Math.max(1, pageTarget);
                await loadComments();
                return;
            }

                const id = normalizeId(btn.getAttribute('data-id'));
            const username = currentUser();
            const comments = await getComments();
                const target = comments.find(function(c) { return normalizeId(c.id) === id; });

                if ((action === 'edit' || action === 'delete') && (!target || !sameUser(target.username, username))) {
                return;
            }

            if (action === 'reply') {
                activeReplyParentId = id;
                activeEditCommentId = null;
                await loadComments();
                return;
            }

            if (action === 'cancel-reply') {
                activeReplyParentId = null;
                await loadComments();
                return;
            }

            if (action === 'post-reply') {
                const replyInput = commentsList.querySelector('[data-reply-input="' + id + '"]');
                const replyText = replyInput ? replyInput.value.trim() : '';
                if (!replyText || !username) {
                    return;
                }

                if (replyText.length > 100) {
                    window.alert('Replies cannot be longer than 100 characters.');
                    return;
                }

                const violation = getContentViolation(replyText, {
                    username: username,
                    comments: comments
                });
                if (violation) {
                    window.alert(violation);
                    return;
                }

                const replyComment = {
                    id: Date.now(),
                    parentId: id,
                    username: username,
                    text: replyText,
                    createdAt: new Date().toLocaleString(),
                    createdAtMs: Date.now(),
                    updatedAt: null,
                    likes: [],
                    dislikes: []
                };

                if (commentsSource === 'shared') {
                    const inserted = await insertSharedComment(replyComment);
                    if (!inserted) {
                        const details = getSharedErrorMessage();
                        window.alert('Could not save reply to shared storage.' + (details ? '\n\n' + details : ' Please log in with email and try again.'));
                        return;
                    }
                } else {
                    window.alert('Shared comments are unavailable on this page right now. Please refresh and log in again.');
                    return;
                }

                activeReplyParentId = null;
                await loadComments();
                return;
            }

            if (action === 'like' || action === 'dislike') {
                if (!username) {
                    window.alert('Please log in to like or dislike comments.');
                    return;
                }
                if (!target) {
                    return;
                }

                if (!Array.isArray(target.likes)) {
                    target.likes = [];
                }
                if (!Array.isArray(target.dislikes)) {
                    target.dislikes = [];
                }

                const likeIndex = target.likes.findIndex(function(name) { return sameUser(name, username); });
                const dislikeIndex = target.dislikes.findIndex(function(name) { return sameUser(name, username); });

                if (action === 'like') {
                    if (likeIndex >= 0) {
                        target.likes.splice(likeIndex, 1);
                    } else {
                        target.likes.push(username);
                        if (dislikeIndex >= 0) {
                            target.dislikes.splice(dislikeIndex, 1);
                        }
                    }
                } else {
                    if (dislikeIndex >= 0) {
                        target.dislikes.splice(dislikeIndex, 1);
                    } else {
                        target.dislikes.push(username);
                        if (likeIndex >= 0) {
                            target.likes.splice(likeIndex, 1);
                        }
                    }
                }

                if (commentsSource === 'shared') {
                    const updated = await updateSharedComment(target);
                    if (!updated) {
                        warnSharedReadOnly();
                        const details = getSharedErrorMessage();
                        if (details) {
                            window.alert('Could not update this vote.\n\n' + details);
                        }
                    }
                } else {
                    saveComments(comments);
                }
                await loadComments();
                return;
            }

            if (action === 'edit') {
                activeEditCommentId = id;
                activeReplyParentId = null;
                await loadComments();
                return;
            }

            if (action === 'cancel-edit') {
                activeEditCommentId = null;
                await loadComments();
                return;
            }

            if (action === 'save-edit') {
                const editInput = commentsList.querySelector('[data-edit-input="' + id + '"]');
                const editedText = editInput ? editInput.value.trim() : '';
                if (!editedText || !target) {
                    return;
                }

                if (editedText.length > 100) {
                    window.alert('Comments cannot be longer than 100 characters.');
                    return;
                }

                const violation = getContentViolation(editedText, {
                    username: username,
                    comments: comments,
                    editingId: id
                });
                if (violation) {
                    window.alert(violation);
                    return;
                }

                target.text = editedText;
                target.updatedAt = new Date().toLocaleString();
                if (commentsSource === 'shared') {
                    const updated = await updateSharedComment(target);
                    if (!updated) {
                        warnSharedReadOnly();
                    }
                } else {
                    saveComments(comments);
                }
                activeEditCommentId = null;
                await loadComments();
                return;
            }

            if (action === 'delete') {
                const confirmed = window.confirm('Delete this comment and all replies?');
                if (!confirmed) {
                    return;
                }

                const filtered = deleteCommentAndReplies(comments, id);
                if (commentsSource === 'shared') {
                    const deletedIds = comments
                        .filter(function(item) {
                            return !filtered.some(function(kept) {
                                return normalizeId(kept.id) === normalizeId(item.id);
                            });
                        })
                        .map(function(item) {
                            return item.id;
                        });

                    const deleted = await deleteSharedComments(deletedIds);
                    if (!deleted) {
                        warnSharedReadOnly();
                    }
                } else {
                    saveComments(filtered);
                }
                activeEditCommentId = null;
                activeReplyParentId = null;
                await loadComments();
            }
        });
    }

    checkLogin();
});