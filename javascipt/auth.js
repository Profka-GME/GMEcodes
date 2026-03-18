// auth.js — Supabase-powered authentication with localStorage bridge
'use strict';

(function () {
    // ── Supabase client ──────────────────────────────────────────────────────
    var _sb = null;

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

    // ── LocalStorage bridge — keeps rivals.js, profile.js, game-codes.js working ──
    function syncSessionToLocalStorage(session) {
        if (session && session.user) {
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

        if (session && session.user) {
            var username = escapeHtml(getUsername(session));
            var avatarSrc = toRootPath(getStoredAvatar(getUsername(session)));
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

                if (event === 'SIGNED_IN') {
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
        if (loginForm && sb) {
            loginForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                var emailInput = document.getElementById('loginEmail');
                var passwordInput = document.getElementById('loginPassword');
                if (!emailInput || !passwordInput) return;

                var submitBtn = loginForm.querySelector('[type="submit"]');
                var originalText = submitBtn ? submitBtn.textContent : 'Login';
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Logging in\u2026'; }

                var result = await sb.auth.signInWithPassword({
                    email: emailInput.value.trim().toLowerCase(),
                    password: passwordInput.value
                });

                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }

                if (result.error) {
                    alert(result.error.message || 'Login failed. Check your email and password.');
                }
                // Success: onAuthStateChange fires SIGNED_IN which dispatches userLoggedIn
                // login.html listens for userLoggedIn and redirects to home
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

    function saveStoredUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    }

    function sameUser(a, b) {
        return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    }

    async function hashPassword(value) {
        const text = String(value || '');
        if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
            return text;
        }

        const data = new TextEncoder().encode(text);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest))
            .map(function(byte) { return byte.toString(16).padStart(2, '0'); })
            .join('');
    }

    function setupNavbarTogglerFallback() {
        const toggler = document.querySelector('.navbar-toggler');
        const collapse = document.querySelector('#navbarNav');
        if (!toggler || !collapse) {
            return;
        }

        if (toggler.dataset.fallbackBound === 'true') {
            return;
        }

        // Runtime fallback: only toggle manually when Bootstrap collapse is unavailable.
        toggler.addEventListener('click', function() {
            if (window.bootstrap && bootstrap.Collapse) {
                return;
            }

            const isExpanded = collapse.classList.toggle('show');
            toggler.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        });

        toggler.dataset.fallbackBound = 'true';
    }

    function getRootPrefix() {
        const path = window.location.pathname.replace(/\\/g, '/');
        return (path.includes('/games/') || path.includes('/html/')) ? '../' : '';
    }

    function toRootPath(relativePathFromRoot) {
        return getRootPrefix() + relativePathFromRoot;
    }

    function getStoredUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    function findUserByUsername(users, username) {
        return users.find(function(user) {
            return sameUser(user.username, username);
        });
    }

    async function verifyUserPassword(user, inputPassword) {
        if (!user) {
            return false;
        }

        if (user.passwordHash) {
            const inputHash = await hashPassword(inputPassword);
            return inputHash === String(user.passwordHash);
        }

        return user.password === inputPassword;
    }

    function ensureDefaultAdminAccount() {
        const users = getStoredUsers();
        let changed = false;
        let admin = findUserByUsername(users, defaultAdminUser.username);

        if (!admin) {
            admin = {
                username: defaultAdminUser.username,
                email: defaultAdminUser.email,
                passwordHash: defaultAdminUser.passwordHash,
                role: defaultAdminUser.role,
                emailVerified: true,
                registeredDate: new Date().toISOString()
            };
            users.push(admin);
            changed = true;
        } else {
            const normalizedEmail = String(admin.email || '').trim().toLowerCase();
            if (normalizedEmail !== defaultAdminUser.email.toLowerCase()) {
                admin.email = defaultAdminUser.email;
                changed = true;
            }

            if (admin.passwordHash !== defaultAdminUser.passwordHash) {
                admin.passwordHash = defaultAdminUser.passwordHash;
                changed = true;
            }

            if (admin.password) {
                delete admin.password;
                changed = true;
            }

            if (admin.role !== defaultAdminUser.role) {
                admin.role = defaultAdminUser.role;
                changed = true;
            }

            if (!admin.registeredDate) {
                admin.registeredDate = new Date().toISOString();
                changed = true;
            }
        }

        if (changed) {
            saveStoredUsers(users);
        }
    }

    function getEmailJsConfig() {
        if (!window.EMAILJS_CONFIG || typeof window.EMAILJS_CONFIG !== 'object') {
            return null;
        }

        return window.EMAILJS_CONFIG;
    }

    function hasConfiguredValue(value) {
        const normalized = String(value || '').trim();
        return normalized !== '' && normalized.indexOf('YOUR_') === -1;
    }

    function isEmailJsConfigured() {
        const config = getEmailJsConfig();
        if (!config) {
            return false;
        }

        return hasConfiguredValue(config.publicKey)
            && hasConfiguredValue(config.serviceId)
            && hasConfiguredValue(config.templateId);
    }

    function getVerificationExpiryMinutes() {
        const config = getEmailJsConfig();
        const minutes = Number(config && config.codeExpiresMinutes);
        if (Number.isFinite(minutes) && minutes > 0) {
            return minutes;
        }
        return 10;
    }

    function generateVerificationCode() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    function createVerificationState() {
        return {
            code: generateVerificationCode(),
            expiresAt: Date.now() + (getVerificationExpiryMinutes() * 60 * 1000)
        };
    }

    function assignVerificationState(user) {
        const verificationState = createVerificationState();
        user.emailVerified = false;
        user.verificationCode = verificationState.code;
        user.verificationExpiresAt = verificationState.expiresAt;
        return verificationState;
    }

    function clearVerificationState(user) {
        user.emailVerified = true;
        delete user.verificationCode;
        delete user.verificationExpiresAt;
    }

    function ensureEmailJsLoaded() {
        if (!isEmailJsConfigured()) {
            return Promise.reject(new Error('EmailJS is not configured yet. Update javascipt/email-config.js first.'));
        }

        if (window.emailjs && typeof window.emailjs.send === 'function') {
            if (!window.__emailJsInitialized) {
                window.emailjs.init({ publicKey: getEmailJsConfig().publicKey });
                window.__emailJsInitialized = true;
            }
            return Promise.resolve(window.emailjs);
        }

        if (emailJsLoadPromise) {
            return emailJsLoadPromise;
        }

        emailJsLoadPromise = new Promise(function(resolve, reject) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
            script.onload = function() {
                if (!window.emailjs || typeof window.emailjs.init !== 'function') {
                    reject(new Error('EmailJS SDK loaded incorrectly.'));
                    return;
                }

                window.emailjs.init({ publicKey: getEmailJsConfig().publicKey });
                window.__emailJsInitialized = true;
                resolve(window.emailjs);
            };
            script.onerror = function() {
                reject(new Error('Could not load the EmailJS SDK.'));
            };
            document.head.appendChild(script);
        });

        return emailJsLoadPromise;
    }

    function sendVerificationEmail(user, code) {
        return fetch('/api/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: user.email,
                username: user.username,
                code: code,
                expiresMinutes: getVerificationExpiryMinutes()
            })
        }).then(function(res) {
            if (!res.ok) {
                return res.json().then(function(body) {
                    throw new Error(body.error || 'Failed to send verification email.');
                });
            }
        });
    }

    function getVerificationModalElements() {
        return {
            modal: document.getElementById('emailVerificationModal'),
            email: document.getElementById('verificationEmail'),
            message: document.getElementById('verificationMessage'),
            form: document.getElementById('verificationForm'),
            input: document.getElementById('verificationCodeInput'),
            resendBtn: document.getElementById('resendVerificationCodeBtn')
        };
    }

    function updateVerificationMessage() {
        const elements = getVerificationModalElements();
        if (!verificationContext || !elements.email || !elements.message) {
            return;
        }

        elements.email.textContent = verificationContext.email;
        if (verificationContext.sendSucceeded) {
            elements.message.className = 'small text-info mb-3';
            elements.message.textContent = 'A verification code was sent to your email. Enter it below to continue.';
            return;
        }

        elements.message.className = 'small text-warning mb-3';
        elements.message.textContent = verificationContext.sendError || 'We could not send the verification email. Fix EmailJS setup and use Resend Code.';
    }

    function setResendButtonState(isSending) {
        const elements = getVerificationModalElements();
        if (!elements.resendBtn) {
            return;
        }

        elements.resendBtn.disabled = isSending;
        elements.resendBtn.textContent = isSending ? 'Sending...' : 'Resend Code';
    }

    function ensureVerificationModal() {
        if (document.getElementById('emailVerificationModal')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div class="modal fade" id="emailVerificationModal" tabindex="-1" aria-labelledby="emailVerificationModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered auth-modal-dialog">
                    <div class="modal-content auth-modal-content text-white">
                        <div class="modal-header auth-modal-header">
                            <h5 class="modal-title auth-modal-title" id="emailVerificationModalLabel"><i class="bi bi-envelope-check-fill me-2"></i>Verify Email</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body auth-modal-body">
                            <p class="auth-modal-subtitle mb-2">Enter the verification code sent to <strong id="verificationEmail"></strong>.</p>
                            <p class="small text-info mb-3" id="verificationMessage"></p>
                            <form id="verificationForm">
                                <div class="mb-3">
                                    <label for="verificationCodeInput" class="form-label">Verification code</label>
                                    <input type="text" class="form-control auth-input auth-code-input" id="verificationCodeInput" inputmode="numeric" autocomplete="one-time-code" placeholder="Enter 6-digit code" minlength="6" maxlength="6" required>
                                </div>
                                <div class="d-flex gap-2">
                                    <button type="submit" class="btn btn-success auth-primary-btn flex-grow-1">Verify Email</button>
                                    <button type="button" class="btn btn-outline-light auth-secondary-btn" id="resendVerificationCodeBtn">Resend Code</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(wrapper.firstElementChild);

        const modalEl = document.getElementById('emailVerificationModal');
        const closeBtn = modalEl ? modalEl.querySelector('.btn-close') : null;

        function resetVerificationModalState() {
            verificationContext = null;
            pendingRegistration = null;
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
            if (modalEl) {
                modalEl.classList.remove('show');
                modalEl.style.display = 'none';
                modalEl.setAttribute('aria-hidden', 'true');
            }
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                closeModalById('emailVerificationModal');
                resetVerificationModalState();
            });
        }

        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function() {
                verificationContext = null;
                pendingRegistration = null;
            });
        }

        const elements = getVerificationModalElements();
        if (!elements.form || !elements.input || !elements.resendBtn) {
            return;
        }

        elements.form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!verificationContext) {
                return;
            }

            const enteredCode = elements.input.value.trim();
            const users = getStoredUsers();
            const shouldLogin = verificationContext.loginAfterVerify;
            let user = findUserByUsername(users, verificationContext.username);

            // Registration flow keeps user pending until code is verified.
            if (!user && !shouldLogin && pendingRegistration && sameUser(pendingRegistration.username, verificationContext.username)) {
                user = pendingRegistration;
            }

            if (!user) {
                alert('Account not found anymore. Please register again.');
                return;
            }

            if (!user.verificationCode || !user.verificationExpiresAt || Date.now() > user.verificationExpiresAt) {
                alert('Your verification code expired. Use Resend Code to get a new one.');
                return;
            }

            if (enteredCode !== String(user.verificationCode)) {
                alert('Incorrect verification code.');
                return;
            }

            clearVerificationState(user);
            if (shouldLogin) {
                saveStoredUsers(users);
            } else {
                const latestUsers = getStoredUsers();
                if (latestUsers.some(function(u) { return sameUser(u.username, user.username); })) {
                    alert('Username already exists. Please register with a different username.');
                    pendingRegistration = null;
                    return;
                }
                if (latestUsers.some(function(u) { return String(u.email || '').trim().toLowerCase() === String(user.email || '').trim().toLowerCase(); })) {
                    alert('Email already registered. Please use another email.');
                    pendingRegistration = null;
                    return;
                }
                latestUsers.push(user);
                saveStoredUsers(latestUsers);
                pendingRegistration = null;
            }

            const verifiedUsername = user.username;
            verificationContext = null;
            elements.form.reset();
            closeModalById('emailVerificationModal');

            window.dispatchEvent(new CustomEvent('userVerified', { detail: { username: verifiedUsername } }));

            if (shouldLogin) {
                closeModalById('loginModal');
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('currentUser', verifiedUsername);
                renderUserNav();
                window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { username: verifiedUsername } }));
            }
        });

        elements.resendBtn.addEventListener('click', function() {
            if (!verificationContext) {
                return;
            }

            const users = getStoredUsers();
            const shouldLogin = verificationContext.loginAfterVerify;
            let user = findUserByUsername(users, verificationContext.username);
            let isStoredUser = true;

            if (!user && !shouldLogin && pendingRegistration && sameUser(pendingRegistration.username, verificationContext.username)) {
                user = pendingRegistration;
                isStoredUser = false;
            }

            if (!user) {
                alert('Account not found anymore.');
                return;
            }

            const verificationState = assignVerificationState(user);
            if (isStoredUser) {
                saveStoredUsers(users);
            } else {
                pendingRegistration = user;
            }
            verificationContext.code = verificationState.code;
            verificationContext.sendSucceeded = false;
            verificationContext.sendError = '';
            updateVerificationMessage();
            setResendButtonState(true);

            sendVerificationEmail(user, verificationState.code)
                .then(function() {
                    verificationContext.sendSucceeded = true;
                    verificationContext.sendError = '';
                    updateVerificationMessage();
                    window.dispatchEvent(new CustomEvent('verificationEmailSent', { detail: { username: user.username, email: user.email } }));
                })
                .catch(function(error) {
                    verificationContext.sendSucceeded = false;
                    verificationContext.sendError = error.message || 'Verification email failed to send.';
                    updateVerificationMessage();
                    alert(verificationContext.sendError);
                })
                .finally(function() {
                    setResendButtonState(false);
                });
        });
    }

    function openVerificationModal(config) {
        ensureVerificationModal();

        verificationContext = {
            username: config.username,
            email: config.email,
            code: config.code,
            loginAfterVerify: Boolean(config.loginAfterVerify),
            sendSucceeded: Boolean(config.sendSucceeded),
            sendError: config.sendError || ''
        };

        updateVerificationMessage();
        setResendButtonState(false);

        const elements = getVerificationModalElements();
        if (!elements.modal) {
            return;
        }

        if (window.bootstrap && bootstrap.Modal) {
            bootstrap.Modal.getOrCreateInstance(elements.modal).show();
        } else {
            elements.modal.classList.add('show');
            elements.modal.style.display = 'block';
            elements.modal.removeAttribute('aria-hidden');
        }

        if (elements.input) {
            elements.input.focus();
        }
    }

    function isSafeAvatarPath(path) {
        return /^(?:\.\.\/)?images\/avatars\/avatar-[1-6]\.svg$/i.test(String(path || '').trim());
    }

    function toPageAssetPath(path) {
        const cleaned = String(path || '').replace(/^(\.\.\/)+/, '');
        return toRootPath(cleaned);
    }

    function getUserAvatarPath(username) {
        const fallback = toRootPath('images/avatars/avatar-1.svg');
        const users = getStoredUsers();
        const user = users.find(function(u) {
            return sameUser(u.username, username);
        });

        if (!user || !isSafeAvatarPath(user.avatar)) {
            return fallback;
        }

        return toPageAssetPath(user.avatar);
    }

    function closeModalById(id) {
        const modalEl = document.getElementById(id);
        if (!modalEl || !window.bootstrap || !bootstrap.Modal) {
            return;
        }
        const instance = bootstrap.Modal.getInstance(modalEl);
        if (instance) {
            instance.hide();
        }
    }

    function logout() {
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('currentUser');
        renderUserNav();
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }

    function setupUserDropdown() {
        const toggleBtn = document.getElementById('userDropdownToggle');
        const menu = document.getElementById('userDropdownMenu');

        if (!toggleBtn || !menu) {
            return;
        }

        function closeMenu() {
            menu.classList.remove('show');
            menu.style.display = 'none';
            toggleBtn.setAttribute('aria-expanded', 'false');
        }

        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = menu.classList.contains('show');
            if (isOpen) {
                closeMenu();
            } else {
                menu.classList.add('show');
                menu.style.display = 'block';
                toggleBtn.setAttribute('aria-expanded', 'true');
            }
        });

        menu.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        if (dropdownCloseHandler) {
            document.removeEventListener('click', dropdownCloseHandler);
        }
        dropdownCloseHandler = closeMenu;
        document.addEventListener('click', dropdownCloseHandler);
    }

    function renderUserNav() {
        if (!userNav) {
            return;
        }

        const loggedIn = localStorage.getItem('loggedIn') === 'true';
        const username = localStorage.getItem('currentUser');

        if (loggedIn && username) {
            const avatarPath = getUserAvatarPath(username);
            userNav.innerHTML = `
                <li class="nav-item" style="position: relative;">
                    <a class="nav-link" href="#" id="userDropdownToggle" role="button" aria-expanded="false">
                        <img class="nav-user-avatar me-2" src="${avatarPath}" alt="${username} avatar">Welcome, ${username}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end" id="userDropdownMenu" style="display: none; position: absolute; right: 0; left: auto;">
                        <li>
                            <button class="dropdown-item" type="button" id="viewProfileBtn">
                                <i class="bi bi-person-badge me-2"></i>View Profile
                            </button>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <button class="dropdown-item text-danger" type="button" id="logoutBtn">
                                <i class="bi bi-box-arrow-right me-2"></i>Logout
                            </button>
                        </li>
                    </ul>
                </li>
            `;

            setupUserDropdown();

            const viewProfileBtn = document.getElementById('viewProfileBtn');
            const logoutBtn = document.getElementById('logoutBtn');

            if (viewProfileBtn) {
                viewProfileBtn.addEventListener('click', function() {
                    window.location.href = toRootPath('html/profile.html');
                });
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    window.location.href = toRootPath('html/logout.html');
                });
            }
        } else {
            const loginPath = toRootPath('html/login.html');
            userNav.innerHTML = `
                <li class="nav-item nav-auth-item">
                    <a class="nav-link nav-auth-link nav-auth-login" href="${loginPath}">
                        <i class="bi bi-box-arrow-in-right me-1"></i>Login
                    </a>
                </li>
            `;
        }
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('loginPassword');
            if (!usernameInput || !passwordInput) {
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const users = getStoredUsers();
            const user = findUserByUsername(users, username);

            const passwordMatches = await verifyUserPassword(user, password);

            if (!user || !passwordMatches) {
                alert('Invalid username or password');
                return;
            }

            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('currentUser', user.username);
            renderUserNav();
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { username: user.username } }));
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const usernameInput = document.getElementById('registerUsername');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            const confirmInput = document.getElementById('confirmPassword');
            if (!usernameInput || !emailInput || !passwordInput || !confirmInput) {
                return;
            }

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();
            const password = passwordInput.value;
            const confirmPassword = confirmInput.value;

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            const users = getStoredUsers();
            if (users.some(function(u) { return sameUser(u.username, username); })) {
                alert('Username already exists');
                return;
            }
            if (users.some(function(u) { return String(u.email || '').trim().toLowerCase() === email; })) {
                alert('Email already registered');
                return;
            }

            const newUser = {
                username: username,
                email: email,
                passwordHash: await hashPassword(password),
                registeredDate: new Date().toISOString()
            };
            const verificationState = assignVerificationState(newUser);
            pendingRegistration = newUser;

            const submitBtn = registerForm.querySelector('[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Register';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending code...';
            }

            sendVerificationEmail(newUser, verificationState.code)
                .then(function() {
                    registerForm.reset();
                    closeModalById('registerModal');
                    openVerificationModal({
                        username: username,
                        email: email,
                        code: verificationState.code,
                        loginAfterVerify: false,
                        sendSucceeded: true
                    });
                })
                .catch(function(error) {
                    pendingRegistration = null;
                    alert('Could not send verification email: ' + (error.message || 'Unknown error.'));
                })
                .finally(function() {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                });
        });
    }

    ensureDefaultAdminAccount();
    ensureVerificationModal();
    renderUserNav();
    setupNavbarTogglerFallback();

    window.addEventListener('storage', function(e) {
        if (e.key === 'loggedIn' || e.key === 'currentUser' || e.key === 'users') {
            renderUserNav();
        }
    });

    window.addEventListener('userProfileUpdated', function() {
        renderUserNav();
    });
});