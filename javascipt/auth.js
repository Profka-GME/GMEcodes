// Global Authentication System
document.addEventListener('DOMContentLoaded', function() {
    const userNav = document.getElementById('userNav');
    const defaultAdminUser = {
        username: 'Profka',
        email: 'potatus120@gmail.com',
        passwordHash: '45d1020b965b4277e0de3c43a8cc0c7236cef821eccfc1851fa6d562da11dbc4',
        role: 'admin'
    };
    let dropdownCloseHandler = null;
    let verificationContext = null;
    let pendingRegistration = null;
    let emailJsLoadPromise = null;

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
        return ensureEmailJsLoaded().then(function(emailjs) {
            const config = getEmailJsConfig();
            return emailjs.send(config.serviceId, config.templateId, {
                to_email: user.email,
                to_name: user.username,
                verification_code: code,
                app_name: config.appName || 'GMEcodes',
                expires_minutes: String(getVerificationExpiryMinutes())
            });
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

            // Local admin bypasses email verification to avoid lockout from email provider issues.
            if (user.role === 'admin') {
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('currentUser', user.username);
                renderUserNav();
                window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { username: user.username } }));
                return;
            }

            const verificationState = assignVerificationState(user);
            saveStoredUsers(users);

            sendVerificationEmail(user, verificationState.code)
                .then(function() {
                    openVerificationModal({
                        username: user.username,
                        email: user.email,
                        code: verificationState.code,
                        loginAfterVerify: true,
                        sendSucceeded: true
                    });
                    window.dispatchEvent(new CustomEvent('verificationEmailSent', { detail: { username: user.username, email: user.email } }));
                })
                .catch(function(error) {
                    openVerificationModal({
                        username: user.username,
                        email: user.email,
                        code: verificationState.code,
                        loginAfterVerify: true,
                        sendSucceeded: false,
                        sendError: error.message || 'Verification email failed to send.'
                    });
                    alert(error.message || 'Verification email failed to send.');
                });
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

            if (!isEmailJsConfigured()) {
                alert('Email verification is not configured yet. Update javascipt/email-config.js with your EmailJS keys first.');
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
                submitBtn.textContent = 'Checking email...';
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
                    window.dispatchEvent(new CustomEvent('userRegistered', {
                        detail: {
                            username: username,
                            verificationRequired: true,
                            emailSent: true
                        }
                    }));
                    window.dispatchEvent(new CustomEvent('verificationEmailSent', { detail: { username: username, email: email } }));
                })
                .catch(function(error) {
                    pendingRegistration = null;
                    const details = error && (error.text || error.message) ? ' (' + (error.text || error.message) + ')' : '';
                    alert('Email does not exist or cannot receive messages. Please use a valid email address.' + details);
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