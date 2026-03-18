// auth.js — Supabase-powered authentication with localStorage bridge
'use strict';

(function () {
    // ── Supabase client ──────────────────────────────────────────────────────
    var _sb = null;
    var OWNER_SESSION_KEY = 'gmecodesOwnerSession';
    var defaultAdminUser = {
        username: 'Profka',
        email: 'potatus120@gmail.com',
        passwordHash: '45d1020b965b4277e0de3c43a8cc0c7236cef821eccfc1851fa6d562da11dbc4',
        role: 'admin'
    };

    function getSb() {
        if (_sb) return _sb;
        var url = window.SUPABASE_URL;
        var key = window.SUPABASE_ANON_KEY;
        if (!url || !key || url.indexOf('YOUR_') !== -1 || key.indexOf('YOUR_') !== -1) {
            console.warn('[auth] Supabase not configured. Fill in javascipt/supabase-config.js');
            return null;
        }
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            console.warn('[auth] Supabase SDK not loaded. Add the CDN script before auth.js.');
            return null;
        }
        _sb = window.supabase.createClient(url, key);
        return _sb;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    function getRootPrefix() {
        var path = window.location.pathname.replace(/\\/g, '/');
        return (path.indexOf('/games/') !== -1 || path.indexOf('/html/') !== -1) ? '../' : '';
    }

    function toRootPath(rel) { return getRootPrefix() + rel; }

    function sameUser(a, b) {
        return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    }

    async function hashPassword(value) {
        var text = String(value || '');
        if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
            return text;
        }

        var data = new TextEncoder().encode(text);
        var digest = await window.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest))
            .map(function (byte) { return byte.toString(16).padStart(2, '0'); })
            .join('');
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getUsername(session) {
        if (!session || !session.user) return '';
        return String(
            (session.user.user_metadata && session.user.user_metadata.username) ||
            session.user.email || ''
        );
    }

    function getOwnerSession() {
        if (localStorage.getItem(OWNER_SESSION_KEY) !== 'true') {
            return null;
        }

        return {
            user: {
                email: defaultAdminUser.email,
                created_at: new Date().toISOString(),
                user_metadata: {
                    username: defaultAdminUser.username,
                    role: defaultAdminUser.role
                }
            }
        };
    }

    function ensureOwnerUserRecord() {
        var users = JSON.parse(localStorage.getItem('users') || '[]');
        var exists = users.some(function (user) {
            return sameUser(user.username, defaultAdminUser.username);
        });

        if (!exists) {
            users.push({
                username: defaultAdminUser.username,
                email: defaultAdminUser.email,
                role: defaultAdminUser.role,
                emailVerified: true,
                registeredDate: new Date().toISOString()
            });
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    // ── LocalStorage bridge — keeps rivals.js, profile.js, game-codes.js working ──
    function syncSessionToLocalStorage(session) {
        if (session && session.user) {
            localStorage.removeItem(OWNER_SESSION_KEY);
            var username = getUsername(session);
            var role = (session.user.user_metadata && session.user.user_metadata.role) || 'user';
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('currentUser', username);
            // Maintain a minimal users array so getUserRole() in profile.js still works
            var users = JSON.parse(localStorage.getItem('users') || '[]');
            var idx = users.findIndex(function (u) {
                return String(u.username || '').toLowerCase() === username.toLowerCase();
            });
            if (idx === -1) {
                users.push({
                    username: username,
                    role: role,
                    email: session.user.email,
                    emailVerified: true,
                    registeredDate: session.user.created_at || new Date().toISOString()
                });
            } else {
                users[idx].role = role;
                users[idx].email = session.user.email;
            }
            localStorage.setItem('users', JSON.stringify(users));
        } else if (getOwnerSession()) {
            ensureOwnerUserRecord();
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('currentUser', defaultAdminUser.username);
        } else {
            localStorage.removeItem('loggedIn');
            localStorage.removeItem('currentUser');
        }
    }

    // ── Avatar (stored per-user in localStorage) ─────────────────────────────
    function isSafeAvatarPath(p) {
        return /^(?:\.\.\/)?images\/avatars\/avatar-[1-6]\.svg$/i.test(String(p || '').trim());
    }

    function getStoredAvatar(username) {
        var stored = localStorage.getItem('avatar_' + String(username || '').toLowerCase());
        return (stored && isSafeAvatarPath(stored)) ? stored : 'images/avatars/avatar-1.svg';
    }

    // ── Navbar ───────────────────────────────────────────────────────────────
    var _userNav = null;
    var _dropdownCloseHandler = null;

    function setupDropdown() {
        var toggleBtn = document.getElementById('userDropdownToggle');
        var menu = document.getElementById('userDropdownMenu');
        if (!toggleBtn || !menu) return;

        function closeMenu() {
            menu.classList.remove('show');
            menu.style.display = 'none';
            toggleBtn.setAttribute('aria-expanded', 'false');
        }

        toggleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (menu.classList.contains('show')) {
                closeMenu();
            } else {
                menu.classList.add('show');
                menu.style.display = 'block';
                toggleBtn.setAttribute('aria-expanded', 'true');
            }
        });

        menu.addEventListener('click', function (e) { e.stopPropagation(); });

        if (_dropdownCloseHandler) document.removeEventListener('click', _dropdownCloseHandler);
        _dropdownCloseHandler = closeMenu;
        document.addEventListener('click', _dropdownCloseHandler);
    }

    function renderUserNav(session) {
        if (!_userNav) _userNav = document.getElementById('userNav');
        if (!_userNav) return;

        var effectiveSession = session || getOwnerSession();

        if (effectiveSession && effectiveSession.user) {
            var username = escapeHtml(getUsername(effectiveSession));
            var avatarSrc = toRootPath(getStoredAvatar(getUsername(effectiveSession)));
            _userNav.innerHTML =
                '<li class="nav-item" style="position:relative;">' +
                  '<a class="nav-link" href="#" id="userDropdownToggle" role="button" aria-expanded="false">' +
                    '<img class="nav-user-avatar me-2" src="' + avatarSrc + '" alt="' + username + ' avatar">' +
                    'Welcome, ' + username +
                  '</a>' +
                  '<ul class="dropdown-menu dropdown-menu-end" id="userDropdownMenu" style="display:none;position:absolute;right:0;left:auto;">' +
                    '<li><button class="dropdown-item" type="button" id="viewProfileBtn"><i class="bi bi-person-badge me-2"></i>View Profile</button></li>' +
                    '<li><hr class="dropdown-divider"></li>' +
                    '<li><button class="dropdown-item text-danger" type="button" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Logout</button></li>' +
                  '</ul>' +
                '</li>';

            setupDropdown();

            var viewProfileBtn = document.getElementById('viewProfileBtn');
            var logoutBtn = document.getElementById('logoutBtn');
            if (viewProfileBtn) {
                viewProfileBtn.addEventListener('click', function () {
                    window.location.href = toRootPath('html/profile.html');
                });
            }
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function () {
                    window.location.href = toRootPath('html/logout.html');
                });
            }
        } else {
            _userNav.innerHTML =
                '<li class="nav-item nav-auth-item">' +
                  '<a class="nav-link nav-auth-link nav-auth-login" href="' + toRootPath('html/login.html') + '">' +
                    '<i class="bi bi-box-arrow-in-right me-1"></i>Login' +
                  '</a>' +
                '</li>';
        }
    }

    function setupNavbarFallback() {
        var toggler = document.querySelector('.navbar-toggler');
        var collapse = document.querySelector('#navbarNav');
        if (!toggler || !collapse || toggler.dataset.fallbackBound === 'true') return;
        toggler.addEventListener('click', function () {
            if (window.bootstrap && bootstrap.Collapse) return;
            var isExpanded = collapse.classList.toggle('show');
            toggler.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        });
        toggler.dataset.fallbackBound = 'true';
    }

    // ── Core init ────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        var sb = getSb();

        if (sb) {
            // onAuthStateChange fires INITIAL_SESSION immediately with current session
            sb.auth.onAuthStateChange(function (event, session) {
                syncSessionToLocalStorage(session);
                renderUserNav(session);

                if (event === 'SIGNED_IN' && session && session.user) {
                    window.dispatchEvent(new CustomEvent('userLoggedIn', {
                        detail: { username: getUsername(session) }
                    }));
                }
                if (event === 'SIGNED_OUT') {
                    window.dispatchEvent(new CustomEvent('userLoggedOut'));
                }
            });
        } else {
            renderUserNav(null);
        }

        // ── Login form (login.html) ──────────────────────────────────────────
        var loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                var emailInput = document.getElementById('loginEmail') || document.getElementById('loginUsername');
                var passwordInput = document.getElementById('loginPassword');
                if (!emailInput || !passwordInput) {
                    alert('Login form is missing required fields. Please refresh and try again.');
                    return;
                }

                var identifier = emailInput.value.trim();
                var password = passwordInput.value;

                var submitBtn = loginForm.querySelector('[type="submit"]');
                var originalText = submitBtn ? submitBtn.textContent : 'Login';
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Logging in\u2026'; }

                if (sameUser(identifier, defaultAdminUser.email) || sameUser(identifier, defaultAdminUser.username)) {
                    var ownerPasswordHash = await hashPassword(password);
                    if (ownerPasswordHash === defaultAdminUser.passwordHash) {
                        localStorage.setItem(OWNER_SESSION_KEY, 'true');
                        ensureOwnerUserRecord();
                        syncSessionToLocalStorage(getOwnerSession());
                        renderUserNav(getOwnerSession());
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
                        window.dispatchEvent(new CustomEvent('userLoggedIn', {
                            detail: { username: defaultAdminUser.username }
                        }));
                        return;
                    }
                }

                if (!sb) {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
                    alert('Login is not available right now. Supabase is not configured.');
                    return;
                }

                var result = await sb.auth.signInWithPassword({
                    email: identifier.toLowerCase(),
                    password: password
                });

                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }

                if (result.error) {
                    alert(result.error.message || 'Login failed. Check your email and password.');
                    return;
                }

                // Apply session immediately so UI is consistent even if auth-state callback lags.
                var session = result && result.data ? result.data.session : null;
                if (!session) {
                    var sessionResult = await sb.auth.getSession();
                    session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
                }

                if (!session || !session.user) {
                    alert('Login response was received, but no active session was found. Please try again.');
                    return;
                }

                syncSessionToLocalStorage(session);
                renderUserNav(session);
                window.dispatchEvent(new CustomEvent('userLoggedIn', {
                    detail: { username: getUsername(session) }
                }));
            });
        }

        // ── Register form (login.html) ───────────────────────────────────────
        var registerForm = document.getElementById('registerForm');
        if (registerForm && sb) {
            registerForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                var usernameInput = document.getElementById('registerUsername');
                var emailInput = document.getElementById('registerEmail');
                var passwordInput = document.getElementById('registerPassword');
                var confirmInput = document.getElementById('confirmPassword');
                if (!usernameInput || !emailInput || !passwordInput || !confirmInput) return;

                var username = usernameInput.value.trim();
                var email = emailInput.value.trim().toLowerCase();
                var password = passwordInput.value;
                var confirm = confirmInput.value;

                if (password !== confirm) { alert('Passwords do not match.'); return; }
                if (username.length < 3) { alert('Username must be at least 3 characters.'); return; }

                var submitBtn = registerForm.querySelector('[type="submit"]');
                var originalText = submitBtn ? submitBtn.textContent : 'Register';
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating account\u2026'; }

                var result = await sb.auth.signUp({
                    email: email,
                    password: password,
                    options: { data: { username: username } }
                });

                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }

                if (result.error) {
                    alert(result.error.message || 'Registration failed. Please try again.');
                    return;
                }

                registerForm.reset();
                window.dispatchEvent(new CustomEvent('userRegistered', {
                    detail: { username: username, verificationRequired: true, emailSent: true }
                }));
            });
        }

        // ── Global helpers for logout.html, profile pages, etc. ──────────────
        window.gmecodes_signOut = async function () {
            localStorage.removeItem(OWNER_SESSION_KEY);
            localStorage.removeItem('loggedIn');
            localStorage.removeItem('currentUser');
            var sb2 = getSb();
            if (sb2) await sb2.auth.signOut();
        };

        window.gmecodes_getSession = async function () {
            var sb2 = getSb();
            if (!sb2) return null;
            var result = await sb2.auth.getSession();
            return (result.data && result.data.session) || null;
        };

        window.gmecodes_getUser = async function () {
            var session = await window.gmecodes_getSession();
            return session ? session.user : null;
        };

        setupNavbarFallback();
    });
})();