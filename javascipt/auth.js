'use strict';

// Clean auth layer for Supabase + owner fallback.
(function () {
    var OWNER_SESSION_KEY = 'gmecodesOwnerSession';
    var OWNER = {
        username: 'Profka',
        email: 'potatus120@gmail.com',
        passwordHash: '45d1020b965b4277e0de3c43a8cc0c7236cef821eccfc1851fa6d562da11dbc4',
        role: 'admin'
    };

    var _sb = null;
    var _userNav = null;
    var _dropdownCloseHandler = null;

    function sameUser(a, b) {
        return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    }

    function getRootPrefix() {
        var path = String(window.location.pathname || '').replace(/\\/g, '/');
        return (path.indexOf('/games/') !== -1 || path.indexOf('/html/') !== -1) ? '../' : '';
    }

    function toRootPath(rel) {
        return getRootPrefix() + rel;
    }

    function getAuthRedirectUrl() {
        var origin = String(window.location.origin || '').trim();
        if (!origin || /localhost|127\.0\.0\.1/i.test(origin)) {
            origin = 'https://gmecodes.com';
        }
        return origin.replace(/\/$/, '') + '/html/login.html';
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function safeAvatarPath(path) {
        return /^(?:\.\.\/)?images\/avatars\/avatar-[1-6]\.svg$/i.test(String(path || '').trim());
    }

    function getStoredAvatar(username) {
        var key = 'avatar_' + String(username || '').toLowerCase();
        var stored = localStorage.getItem(key);
        return (stored && safeAvatarPath(stored)) ? stored : 'images/avatars/avatar-1.svg';
    }

    function getSupabaseClient() {
        if (_sb) {
            return _sb;
        }

        var url = window.SUPABASE_URL;
        var key = window.SUPABASE_ANON_KEY;
        var validKeys = Boolean(url && key && String(url).indexOf('YOUR_') === -1 && String(key).indexOf('YOUR_') === -1);
        if (!validKeys) {
            return null;
        }

        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            return null;
        }

        _sb = window.supabase.createClient(url, key);
        return _sb;
    }

    function getUsernameFromSession(session) {
        if (!session || !session.user) {
            return '';
        }

        var fromMeta = session.user.user_metadata && session.user.user_metadata.username;
        if (String(fromMeta || '').trim()) {
            return String(fromMeta).trim();
        }

        var email = String(session.user.email || '').trim();
        if (!email) {
            return '';
        }

        return email;
    }

    function ensureUserRecord(username, email, role, registeredDate) {
        var cleanUsername = String(username || '').trim();
        if (!cleanUsername) {
            return;
        }

        var users = JSON.parse(localStorage.getItem('users') || '[]');
        var idx = users.findIndex(function (u) {
            return sameUser(u.username, cleanUsername);
        });

        var record = {
            username: cleanUsername,
            email: String(email || '').trim().toLowerCase(),
            role: String(role || 'user').trim().toLowerCase() || 'user',
            emailVerified: true,
            registeredDate: registeredDate || new Date().toISOString()
        };

        if (idx === -1) {
            users.push(record);
        } else {
            users[idx].username = record.username;
            users[idx].email = record.email || users[idx].email;
            users[idx].role = record.role || users[idx].role || 'user';
            users[idx].emailVerified = true;
            if (!users[idx].registeredDate) {
                users[idx].registeredDate = record.registeredDate;
            }
        }

        localStorage.setItem('users', JSON.stringify(users));
    }

    function activateOwnerSession() {
        localStorage.setItem(OWNER_SESSION_KEY, 'true');
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('currentUser', OWNER.username);
        ensureUserRecord(OWNER.username, OWNER.email, OWNER.role, new Date().toISOString());
    }

    function clearOwnerSession() {
        localStorage.removeItem(OWNER_SESSION_KEY);
    }

    function isOwnerSessionActive() {
        return localStorage.getItem(OWNER_SESSION_KEY) === 'true';
    }

    function clearLocalAuth() {
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('currentUser');
    }

    function applySessionToLocal(session) {
        if (session && session.user) {
            clearOwnerSession();
            var username = getUsernameFromSession(session);
            var role = (session.user.user_metadata && session.user.user_metadata.role) || 'user';
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('currentUser', username);
            ensureUserRecord(username, session.user.email, role, session.user.created_at || new Date().toISOString());
            return;
        }

        if (isOwnerSessionActive()) {
            activateOwnerSession();
            return;
        }

        clearLocalAuth();
    }

    function getLocalLoggedInUsername() {
        var loggedIn = localStorage.getItem('loggedIn') === 'true';
        var username = String(localStorage.getItem('currentUser') || '').trim();
        return loggedIn && username ? username : '';
    }

    function setupDropdown() {
        var toggleBtn = document.getElementById('userDropdownToggle');
        var menu = document.getElementById('userDropdownMenu');
        if (!toggleBtn || !menu) {
            return;
        }

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

        menu.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        if (_dropdownCloseHandler) {
            document.removeEventListener('click', _dropdownCloseHandler);
        }
        _dropdownCloseHandler = closeMenu;
        document.addEventListener('click', _dropdownCloseHandler);
    }

    function renderUserNav() {
        if (!_userNav) {
            _userNav = document.getElementById('userNav');
        }
        if (!_userNav) {
            return;
        }

        var username = getLocalLoggedInUsername();
        if (!username) {
            _userNav.innerHTML =
                '<li class="nav-item nav-auth-item">' +
                    '<a class="nav-link nav-auth-link nav-auth-login" href="' + toRootPath('html/login.html') + '">' +
                        '<i class="bi bi-box-arrow-in-right me-1"></i>Login' +
                    '</a>' +
                '</li>';
            return;
        }

        var safeUsername = escapeHtml(username);
        var avatarSrc = toRootPath(getStoredAvatar(username));

        _userNav.innerHTML =
            '<li class="nav-item" style="position:relative;">' +
                '<a class="nav-link" href="#" id="userDropdownToggle" role="button" aria-expanded="false">' +
                    '<img class="nav-user-avatar me-2" src="' + avatarSrc + '" alt="' + safeUsername + ' avatar">' +
                    'Welcome, ' + safeUsername +
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
    }

    function setupNavbarFallback() {
        var toggler = document.querySelector('.navbar-toggler');
        var collapse = document.querySelector('#navbarNav');
        if (!toggler || !collapse || toggler.dataset.fallbackBound === 'true') {
            return;
        }

        toggler.addEventListener('click', function () {
            if (window.bootstrap && bootstrap.Collapse) {
                return;
            }
            var isExpanded = collapse.classList.toggle('show');
            toggler.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        });

        toggler.dataset.fallbackBound = 'true';
    }

    async function hashMatchesOwnerPassword(password) {
        var hash = await (async function (value) {
            var text = String(value || '');
            if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
                return text;
            }
            var data = new TextEncoder().encode(text);
            var digest = await window.crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(digest))
                .map(function (byte) { return byte.toString(16).padStart(2, '0'); })
                .join('');
        })(password);

        return hash === OWNER.passwordHash;
    }

    function emitLoggedIn(username) {
        window.dispatchEvent(new CustomEvent('userLoggedIn', {
            detail: { username: username }
        }));
    }

    function emitLoggedOut() {
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }

    async function handleLoginSubmit(e, sb) {
        e.preventDefault();

        var idInput = document.getElementById('loginEmail') || document.getElementById('loginUsername');
        var passwordInput = document.getElementById('loginPassword');
        if (!idInput || !passwordInput) {
            alert('Login form is missing required fields. Please refresh and try again.');
            return;
        }

        var identifier = String(idInput.value || '').trim();
        var password = String(passwordInput.value || '');
        if (!identifier || !password) {
            alert('Enter your login and password.');
            return;
        }

        var loginForm = document.getElementById('loginForm');
        var submitBtn = loginForm ? loginForm.querySelector('[type="submit"]') : null;
        var originalText = submitBtn ? submitBtn.textContent : 'Login';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
        }

        try {
            // Local owner fallback login (email or username)
            if (sameUser(identifier, OWNER.email) || sameUser(identifier, OWNER.username)) {
                var ownerOk = await hashMatchesOwnerPassword(password);
                if (ownerOk) {
                    activateOwnerSession();
                    renderUserNav();
                    emitLoggedIn(OWNER.username);
                    return;
                }
            }

            if (!sb) {
                throw new Error('Authentication service is not configured.');
            }

            // Supabase users must use email.
            if (identifier.indexOf('@') === -1) {
                throw new Error('Please use your email address to log in.');
            }

            var signIn = await sb.auth.signInWithPassword({
                email: identifier.toLowerCase(),
                password: password
            });

            if (signIn.error) {
                throw new Error(signIn.error.message || 'Login failed.');
            }

            var session = signIn.data && signIn.data.session ? signIn.data.session : null;
            if (!session) {
                var sessionResult = await sb.auth.getSession();
                session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
            }

            if (!session || !session.user) {
                throw new Error('Login succeeded but no session was created. Please try again.');
            }

            applySessionToLocal(session);
            renderUserNav();
            emitLoggedIn(getUsernameFromSession(session));
        } catch (error) {
            alert(error && error.message ? error.message : 'Login failed.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    async function handleRegisterSubmit(e, sb) {
        e.preventDefault();

        if (!sb) {
            alert('Registration is not available right now.');
            return;
        }

        var usernameInput = document.getElementById('registerUsername');
        var emailInput = document.getElementById('registerEmail');
        var passwordInput = document.getElementById('registerPassword');
        var confirmInput = document.getElementById('confirmPassword');
        if (!usernameInput || !emailInput || !passwordInput || !confirmInput) {
            alert('Registration form is missing required fields. Please refresh and try again.');
            return;
        }

        var username = String(usernameInput.value || '').trim();
        var email = String(emailInput.value || '').trim().toLowerCase();
        var password = String(passwordInput.value || '');
        var confirm = String(confirmInput.value || '');

        if (username.length < 3) {
            alert('Username must be at least 3 characters.');
            return;
        }
        if (password.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            alert('Passwords do not match.');
            return;
        }

        var registerForm = document.getElementById('registerForm');
        var submitBtn = registerForm ? registerForm.querySelector('[type="submit"]') : null;
        var originalText = submitBtn ? submitBtn.textContent : 'Register';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';
        }

        try {
            var signUp = await sb.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { username: username },
                    emailRedirectTo: getAuthRedirectUrl()
                }
            });

            if (signUp.error) {
                throw new Error(signUp.error.message || 'Registration failed.');
            }

            registerForm.reset();
            window.dispatchEvent(new CustomEvent('userRegistered', {
                detail: {
                    username: username,
                    verificationRequired: true,
                    emailSent: true
                }
            }));
        } catch (error) {
            alert(error && error.message ? error.message : 'Registration failed.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    async function hardSignOut() {
        clearOwnerSession();
        clearLocalAuth();

        var sb = getSupabaseClient();
        if (sb) {
            await sb.auth.signOut();
        }

        renderUserNav();
        emitLoggedOut();
    }

    function bindForms(sb) {
        var loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function (e) {
                handleLoginSubmit(e, sb);
            });
        }

        var registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', function (e) {
                handleRegisterSubmit(e, sb);
            });
        }
    }

    function exposeGlobals() {
        window.gmecodes_signOut = hardSignOut;

        window.gmecodes_getSession = async function () {
            var sb = getSupabaseClient();
            if (!sb) {
                return null;
            }
            var result = await sb.auth.getSession();
            return result && result.data ? result.data.session : null;
        };

        window.gmecodes_getUser = async function () {
            var session = await window.gmecodes_getSession();
            return session ? session.user : null;
        };
    }

    async function initializeAuth() {
        var sb = getSupabaseClient();

        applySessionToLocal(null);
        renderUserNav();

        if (sb) {
            var initial = await sb.auth.getSession();
            var initialSession = initial && initial.data ? initial.data.session : null;
            applySessionToLocal(initialSession);
            renderUserNav();

            sb.auth.onAuthStateChange(function (event, session) {
                applySessionToLocal(session);
                renderUserNav();

                if (event === 'SIGNED_IN' && session && session.user) {
                    emitLoggedIn(getUsernameFromSession(session));
                }

                if (event === 'SIGNED_OUT') {
                    emitLoggedOut();
                }
            });
        }

        bindForms(sb);
        setupNavbarFallback();
        exposeGlobals();
    }

    document.addEventListener('DOMContentLoaded', function () {
        initializeAuth();
    });
})();
