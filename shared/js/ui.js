// shared/js/ui.js - Fixed version with proper loading state management

class AppUI {
    constructor() {
        this.modals = new Map();
        this.toasts = new Map();
        this.loaders = new Map();
        
        // Initialize UI components
        this.initializeModals();
        this.initializeToasts();
        this.initializeTooltips();
        
        // Listen for user data updates
        this.setupUserDataListeners();
        
        // Listen for auth state changes
        this.setupAuthStateListeners();
        
        // Inject global navbar if page expects it
        this.injectNavbar();
    }
    
    // Initialize modals
    initializeModals() {
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Close modals on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }
    
    // Initialize toasts
    initializeToasts() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }
    
    // Initialize tooltips
    initializeTooltips() {
        // Add tooltip data attributes
        document.addEventListener('mouseover', (e) => {
            const element = e.target;
            const tooltip = element.getAttribute('data-tooltip');
            
            if (tooltip && !element.querySelector('.tooltip')) {
                this.createTooltip(element, tooltip);
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            const element = e.target;
            const tooltip = element.querySelector('.tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
    }
    
    // Setup user data listeners
    setupUserDataListeners() {
        // Listen for user data loaded
        document.addEventListener('user:loaded', () => {
            this.populateGlobalUserInfo();
        });
        
        // Listen for user info updates
        document.addEventListener('user-info:updated', (e) => {
            this.populateGlobalUserInfo();
        });
    }
    
    // Setup auth state listeners
    setupAuthStateListeners() {
        // Listen for authentication state changes
        document.addEventListener('auth:state-changed', (e) => {
            console.log('Auth state changed in UI:', e.detail.isAuthenticated);
            // Re-inject navbar to reflect authentication state change
            this.injectNavbar();
            
            // If authenticated, also populate user info
            if (e.detail.isAuthenticated && e.detail.userData) {
                setTimeout(() => this.populateGlobalUserInfo(), 100);
            }
        });
        
        // Also listen for navigation events
        document.addEventListener('app:navigated', () => {
            setTimeout(() => this.injectNavbar(), 50);
        });
    }
    
    // Create tooltip
    createTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.top = `${rect.top - 30}px`;
        tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
        tooltip.style.transform = 'translateX(-50%)';
        
        element.appendChild(tooltip);
    }

    // Inject a global navbar into pages that include #navbar-container
    injectNavbar() {
        try {
            // Always check current auth state from AppState
            const isAuthenticated = AppState && AppState.isAuthenticated;
            let navHtml = '';
            
            console.log('Injecting navbar, authenticated:', isAuthenticated);

            if (isAuthenticated) {
                navHtml = this.createAuthenticatedNavbar();
            } else {
                navHtml = this.createUnauthenticatedNavbar();
            }

            // If page provides a navbar container, use it
            const container = document.getElementById('navbar-container');
            if (container) {
                container.innerHTML = navHtml;
                document.body.classList.add('has-navbar');
                // Setup event listeners when injected into a container
                this.setupGlobalNavbarEvents();
                
                // Populate user info if authenticated
                if (isAuthenticated && AppState.currentUser) {
                    setTimeout(() => {
                        this.loadUserProfileInNavbar();
                    }, 100);
                }
                return;
            }

            // Otherwise, ensure a single navbar is present at top of body
            let existingNavbar = document.querySelector('nav.navbar');
            if (existingNavbar) {
                // Replace existing navbar
                existingNavbar.outerHTML = navHtml;
            } else {
                // Insert new navbar at top
                document.body.insertAdjacentHTML('afterbegin', navHtml);
            }
            
            document.body.classList.add('has-navbar');

            // Setup event listeners
            setTimeout(() => {
                this.setupGlobalNavbarEvents();
                // Populate user info if authenticated
                if (isAuthenticated && AppState.currentUser) {
                    this.loadUserProfileInNavbar();
                }
            }, 50);
            
        } catch (e) {
            console.error('Failed to inject navbar', e);
        }
    }

    createAuthenticatedNavbar() {
        // Check if on school page to clean up nav
        const isSchoolPage = window.location.pathname.includes('school.html');
        
        const desktopLinks = isSchoolPage ? '' : `
                    <a href="#dashboard" data-page="dashboard" class="nav-link">
                        <i class="fas fa-home"></i> Dashboard
                    </a>
                    <a href="#school" data-page="school" class="nav-link">
                        <i class="fas fa-school"></i> School
                    </a>`;
                        
        // Mobile links: Eliminated as requested for a cleaner look
        const mobileLinks = '';

        return `
            <nav class="navbar" id="main-navbar" role="navigation" aria-label="Main navigation">
                <a href="#dashboard" class="navbar-brand">
                    <i class="fas fa-graduation-cap" aria-hidden="true"></i> Skore Point
                </a>

                <div class="navbar-nav desktop-only">
                    ${desktopLinks}
                    <div class="navbar-user" id="navbarUser">
                        <div class="profile-placeholder"></div>
                    </div>
                    <button class="logout-btn" id="desktop-logout" title="Logout">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>

                <button class="navbar-toggle mobile-only" id="navbar-toggle" aria-label="Open menu">
                    <i class="fas fa-bars" aria-hidden="true"></i>
                </button>
            </nav>

            <div class="mobile-nav" id="navbar-mobile-nav" aria-hidden="true">
                <a href="#profile" class="nav-link">My Profile</a>
                <a href="#settings" class="nav-link">Settings</a>
                <a href="#" class="nav-link logout-btn-mobile">Logout</a>
            </div>
        `;
    }

    createUnauthenticatedNavbar() {
        return `
            <nav class="navbar" id="main-navbar" role="navigation" aria-label="Main navigation">
                <div class="container">
                    <a href="../" class="navbar-brand">
                        <span class="brand-mark"><i class="fas fa-graduation-cap" aria-hidden="true"></i></span>
                        <span class="brand-title">Skore Point</span>
                    </a>

                    <div class="navbar-nav desktop-only" id="navbar-desktop-nav">
                        <a href="../auth/login.html" class="nav-link" data-page="login">Sign In</a>
                        <a href="../auth/register.html" class="nav-link" data-page="register">Register</a>
                    </div>

                    <button class="navbar-toggle desktop-hidden" id="navbar-toggle" aria-label="Open menu">
                        <i class="fas fa-bars" aria-hidden="true"></i>
                    </button>

                    <div class="mobile-nav mobile-only" id="navbar-mobile-nav" aria-hidden="true">
                        <a href="../auth/login.html" class="nav-link" data-page="login">Sign In</a>
                        <a href="../auth/register.html" class="nav-link" data-page="register">Register</a>
                    </div>
                </div>
            </nav>
        `;
    }

    setupGlobalNavbarEvents() {
        const navbar = document.getElementById('main-navbar');
        if (!navbar) return;

        // Mobile menu toggle
        const toggleBtn = navbar.querySelector('#navbar-toggle');
        const mobileNav = navbar.querySelector('#navbar-mobile-nav') || navbar.querySelector('.mobile-nav');
        
        if (toggleBtn && mobileNav) {
            // Clone to remove old listeners
            const newToggle = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(newToggle, toggleBtn);
            
            newToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isActive = mobileNav.classList.toggle('active');
                mobileNav.setAttribute('aria-hidden', !isActive);

                const icon = newToggle.querySelector('i');
                if (icon) {
                    icon.className = isActive ? 'fas fa-times' : 'fas fa-bars';
                }
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (mobileNav.classList.contains('active') && 
                    !mobileNav.contains(e.target) && 
                    !newToggle.contains(e.target)) {
                    mobileNav.classList.remove('active');
                    mobileNav.setAttribute('aria-hidden', 'true');
                    const icon = newToggle.querySelector('i');
                    if (icon) icon.className = 'fas fa-bars';
                }
            });
            
            // Handle mobile logout
            mobileNav.querySelector('.logout-btn-mobile')?.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await Firebase.auth.signOut();
                    AppState.clear();
                    navigateTo('login');
                } catch (error) {
                    console.error('Logout error:', error);
                    this.showToast('Error logging out', 'error');
                }
            });
        }

        // Handle desktop logout button
        const desktopLogoutBtn = document.getElementById('desktop-logout');
        if (desktopLogoutBtn) {
            desktopLogoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await Firebase.auth.signOut();
                    AppState.clear();
                    navigateTo('login');
                } catch (error) {
                    console.error('Logout error:', error);
                    this.showToast('Error logging out', 'error');
                }
            });
        }

        // The authenticated user profile menu dropdown logic is handled by loadUserProfileInNavbar
        // No specific event listeners needed here anymore for globalUserProfileMenu
    }

    // Load user profile in navbar (replaces the global function)
    async loadUserProfileInNavbar() {
        const navbarUser = document.getElementById('navbarUser');
        if (!navbarUser || !AppState.currentUser) {
            console.log('No navbarUser element or no current user');
            return;
        }
        
        try {
            const user = AppState.currentUser;
            const userData = AppState.currentUserData || {};
            
            console.log('Loading user profile for navbar:', user.email);
            
            // Create user profile element
            navbarUser.innerHTML = `
                <div class="user-profile" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <div class="profile-image" id="profileImage" style="width: 44px; height: 44px; border-radius: 50%; overflow: hidden; background: #4361ee; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.95rem;">
                        ${userData.profileUrl 
                            ? `<img src="${userData.profileUrl}" alt="${userData.name || 'User'}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML=getInitials('${userData.name || ''}')">`
                            : getInitials(userData.name || '')
                        }
                    </div>
                    <div class="user-info desktop-only" style="display: flex; flex-direction: column;">
                        <span class="user-name" style="font-size: 0.9rem; font-weight: 600;">${userData.name || user.email || 'User'}</span>
                    </div>
                    
                    <!-- Desktop Dropdown -->
                    <div class="dropdown-menu desktop-only" id="userDropdownMenu">
                        <a href="#profile" class="dropdown-item" data-page="profile">
                            <i class="fas fa-user"></i> My Profile
                        </a>
                        <a href="#settings" class="dropdown-item" data-page="settings">
                            <i class="fas fa-cog"></i> Settings
                        </a>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item logout-btn">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            `;
            
            // Add dropdown functionality
            const profileImage = document.getElementById('profileImage');
            const dropdownMenu = document.getElementById('userDropdownMenu');
            
            if (profileImage && dropdownMenu) {
                profileImage.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownMenu.classList.toggle('show');
                });
                
                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!profileImage.contains(e.target) && !dropdownMenu.contains(e.target)) {
                        dropdownMenu.classList.remove('show');
                    }
                });
            }
            
            // Handle logout
            const logoutBtn = navbarUser.querySelector('.logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    try {
                        await Firebase.auth.signOut();
                        AppState.clear();
                        navigateTo('login');
                    } catch (error) {
                        console.error('Logout error:', error);
                        this.showToast('Error logging out', 'error');
                    }
                });
            }

            // Also populate independent user profile card on pages (e.g., dashboard)
            const userInfoCard = document.getElementById('userInfoCard');
            if (userInfoCard) {
                const initials = getInitials(userData.name || 'U');
                const profileUrl = userData.profileUrl || '';
                const name = userData.name || user.email || 'User';
                const email = user.email || '';
                const role = (userData.role || 'teacher');

                userInfoCard.innerHTML = `
                    <div class="user-profile-img">
                        ${profileUrl && profileUrl.startsWith('data:image')
                            ? `<img src="${profileUrl}" alt="${name}" onerror="this.parentElement.innerHTML='${initials}'">`
                            : `${profileUrl ? `<img src="${profileUrl}" alt="${name}" onerror="this.parentElement.innerHTML='${initials}'">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">${initials}</div>`}`
                        }
                    </div>
                    <div class="user-details">
                        <span class="user-role ${role}">${role.toUpperCase()}</span>
                        <span class="user-name">${name}</span>
                        <span class="user-email">${email}</span>
                        <button class="logout-btn mobile-only" id="mobileLogoutBtn">
                          <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                `;

                const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
                if (mobileLogoutBtn) {
                    mobileLogoutBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        try {
                            await Firebase.auth.signOut();
                            AppState.clear();
                            navigateTo('login');
                        } catch (error) {
                            console.error('Logout error:', error);
                            this.showToast('Error logging out', 'error');
                        }
                    });
                }
            }
            
        } catch (error) {
            console.error('Error loading user profile in navbar:', error);
            // Fallback to basic user info
            if (navbarUser) {
                navbarUser.innerHTML = `
                    <div class="user-profile">
                        <div class="profile-image">${getInitials('User')}</div>
                        <div class="user-info">
                            <span class="user-name">User</span>
                            <span class="user-role">Teacher</span>
                        </div>
                        <button class="dropdown-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                `;
            }
        }
    }
    
    // populateGlobalUserInfo will now simply call loadUserProfileInNavbar
    populateGlobalUserInfo() {
        this.loadUserProfileInNavbar();
    }
    
    // Show modal
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} not found`);
            return;
        }
        
        // Set modal options
        if (options.title) {
            const titleEl = modal.querySelector('.modal-title');
            if (titleEl) titleEl.textContent = options.title;
        }
        
        if (options.content) {
            const contentEl = modal.querySelector('.modal-content-inner');
            if (contentEl) contentEl.innerHTML = options.content;
        }
        
        // Store modal reference
        this.modals.set(modalId, modal);
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus first input if any
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, textarea, button');
            if (firstInput) firstInput.focus();
        }, 100);
        
        return modal;
    }
    
    // Close modal
    closeModal(modalId) {
        const modal = this.modals.get(modalId) || document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            this.modals.delete(modalId);
        }
    }
    
    // Close all modals
    closeAllModals() {
        this.modals.forEach(modal => {
            modal.classList.remove('active');
        });
        this.modals.clear();
        document.body.style.overflow = '';
    }
    
    // Show toast
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="ui.closeToast('${toastId}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        this.toasts.set(toastId, toast);
        
        // Auto-remove after duration
        setTimeout(() => {
            this.closeToast(toastId);
        }, duration);
        
        return toastId;
    }
    
    // Close toast
    closeToast(toastId) {
        const toast = this.toasts.get(toastId);
        if (toast) {
            toast.remove();
            this.toasts.delete(toastId);
        }
    }
    
    // Get toast icon
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    // Show loading indicator - FIXED VERSION
    showLoading(loaderId = 'default', message = 'Loading...') {
        // Handle different calling patterns
        if (typeof loaderId === 'string' && loaderId.includes(' ')) {
            // Called as showLoading(message) - loaderId is actually a message
            message = loaderId;
            loaderId = 'default';
        }
        
        // Create or get loader
        let loader = this.loaders.get(loaderId);
        
        if (!loader) {
            // Create new loader
            loader = document.createElement('div');
            loader.id = `loader-${loaderId}`;
            loader.className = 'loading-indicator';
            loader.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            `;
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            // Add styles for spinner and message if not already present
            if (!document.querySelector('#loader-styles')) {
                const style = document.createElement('style');
                style.id = 'loader-styles';
                style.textContent = `
                    .loading-spinner {
                        width: 50px;
                        height: 50px;
                        border: 5px solid #f3f3f3;
                        border-top: 5px solid #3498db;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 15px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .loading-message {
                        color: white;
                        font-size: 16px;
                        text-align: center;
                        max-width: 80%;
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(loader);
            this.loaders.set(loaderId, loader);
            
            // Fade in after a brief delay to ensure DOM is ready
            setTimeout(() => {
                loader.style.opacity = '1';
            }, 10);
        } else {
            // Update existing loader
            const messageEl = loader.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
            loader.style.display = 'flex';
            loader.style.opacity = '1';
        }
        
        console.log(`UI: Show loading for '${loaderId}': ${message}`);
        return loaderId;
    }
    
    // Hide loading indicator - FIXED VERSION
    hideLoading(loaderId = 'default') {
        const loader = this.loaders.get(loaderId);
        
        if (loader) {
            // Fade out and then remove from display
            loader.style.opacity = '0';
            
            setTimeout(() => {
                loader.style.display = 'none';
                console.log(`UI: Hide loading for '${loaderId}'`);
            }, 300);
        } else {
            console.warn(`UI: No loader found with ID '${loaderId}' to hide`);
        }
    }
    
    // Hide all loading indicators
    hideAllLoading() {
        this.loaders.forEach((loader, loaderId) => {
            this.hideLoading(loaderId);
        });
    }
    
    // Update loading message
    updateLoadingMessage(loaderId, message) {
        const loader = this.loaders.get(loaderId);
        if (loader) {
            const messageEl = loader.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }
    
    // Create confirmation dialog
    async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const modalId = 'confirm-modal-' + Date.now();
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="ui.closeModal('${modalId}'); resolve(false)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="ui.closeModal('${modalId}'); resolve(false)">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="ui.closeModal('${modalId}'); resolve(true)">
                            Confirm
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.showModal(modalId);
        });
    }
    
    // Create alert dialog
    async alert(message, title = 'Alert') {
        return new Promise((resolve) => {
            const modalId = 'alert-modal-' + Date.now();
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="ui.closeModal('${modalId}'); resolve()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="ui.closeModal('${modalId}'); resolve()">
                            OK
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.showModal(modalId);
        });
    }
    
    // Create input dialog
    async prompt(message, title = 'Input', defaultValue = '') {
        return new Promise((resolve) => {
            const modalId = 'prompt-modal-' + Date.now();
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="ui.closeModal('${modalId}'); resolve(null)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                        <input type="text" class="form-control" id="${modalId}-input" value="${defaultValue}">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="ui.closeModal('${modalId}'); resolve(null)">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="ui.closeModal('${modalId}'); resolve(document.getElementById('${modalId}-input').value)">
                            OK
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.showModal(modalId);
            
            // Focus input
            setTimeout(() => {
                const input = document.getElementById(`${modalId}-input`);
                if (input) {
                    input.focus();
                    input.select();
                }
            }, 100);
        });
    }
    
    // Create select dialog
    async select(message, title = 'Select', options = [], selectedValue = '') {
        return new Promise((resolve) => {
            const modalId = 'select-modal-' + Date.now();
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="ui.closeModal('${modalId}'); resolve(null)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                        <select class="form-control" id="${modalId}-select">
                            ${options.map(opt => `
                                <option value="${opt.value}" ${opt.value === selectedValue ? 'selected' : ''}>
                                    ${opt.label}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="ui.closeModal('${modalId}'); resolve(null)">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="ui.closeModal('${modalId}'); resolve(document.getElementById('${modalId}-select').value)">
                            OK
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.showModal(modalId);
        });
    }
    
    // Create form dialog
    async form(fields, title = 'Form', buttonText = 'Submit', submitCallback = null) {
        return new Promise((resolve) => {
            const modalId = 'form-modal-' + Date.now();
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            
            const formHtml = fields.map(field => {
                const fieldId = `${modalId}-${field.name}`;
                let inputHtml;
                
                if (field.type === 'select') {
                    inputHtml = `
                        <select class="form-control" id="${fieldId}" name="${field.name}" ${field.required ? 'required' : ''}>
                            ${field.options.map(opt => `
                                <option value="${opt.value}" ${opt.value === field.value ? 'selected' : ''}>
                                    ${opt.label}
                                </option>
                            `).join('')}
                        </select>
                    `;
                } else if (field.type === 'textarea') {
                    inputHtml = `
                        <textarea class="form-control" id="${fieldId}" name="${field.name}" ${field.required ? 'required' : ''}>${field.value || ''}</textarea>
                    `;
                } else if (field.type === 'display') {
                    inputHtml = `
                        <div class="form-control-static" id="${fieldId}">${field.value || ''}</div>
                    `;
                } else {
                    inputHtml = `
                        <input type="${field.type || 'text'}" class="form-control" id="${fieldId}" name="${field.name}" 
                               value="${field.value || ''}" ${field.required ? 'required' : ''}
                               ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
                               ${field.readOnly ? 'readonly' : ''}>
                    `;
                }
                
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${field.label}</label>
                        ${inputHtml}
                        ${field.helpText ? `<small class="form-text text-muted">${field.helpText}</small>` : ''}
                    </div>
                `;
            }).join('');
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button type="button" class="modal-close" data-dismiss="modal" aria-label="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="${modalId}-form" class="modal-body">
                        ${formHtml}
                    </form>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                            Cancel
                        </button>
                        <button type="submit" form="${modalId}-form" class="btn btn-primary">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.showModal(modalId);

            // Add event listener for form submission
            const formElement = modal.querySelector(`#${modalId}-form`);
            formElement.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (!formElement.checkValidity()) {
                    formElement.reportValidity();
                    return;
                }
                
                const formData = {};
                fields.forEach(field => {
                    const element = modal.querySelector(`#${modalId}-${field.name}`);
                    if (element && field.type !== 'display') { // Don't include display fields in formData
                        formData[field.name] = element.value;
                    }
                });

                if (submitCallback) {
                    try {
                        const result = await submitCallback(formData);
                        this.closeModal(modalId);
                        resolve(result); // Resolve with the result of the callback
                    } catch (error) {
                        console.error("Form submission callback error:", error);
                        this.showToast('Error processing form: ' + error.message, 'error');
                        resolve(null); // Indicate failure
                    }
                } else {
                    this.closeModal(modalId);
                    resolve(formData); // Resolve with form data if no callback
                }
            });

            // Add event listener for modal close button
            modal.querySelectorAll('[data-dismiss="modal"]').forEach(button => {
                button.addEventListener('click', () => {
                    this.closeModal(modalId);
                    resolve(null); // Resolve with null on cancel/close
                });
            });
        });
    }

    
    // Create tabs
    createTabs(containerId, tabs) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const tabsHtml = `
            <div class="tabs">
                <div class="tabs-header">
                    ${tabs.map((tab, index) => `
                        <button class="tab-btn ${index === 0 ? 'active' : ''}" data-tab="${tab.id}">
                            ${tab.icon ? `<i class="${tab.icon}"></i>` : ''}
                            <span>${tab.label}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="tabs-content">
                    ${tabs.map((tab, index) => `
                        <div class="tab-pane ${index === 0 ? 'active' : ''}" id="tab-${tab.id}">
                            ${tab.content || ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = tabsHtml;
        
        // Add tab switching
        const tabButtons = container.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Update active tab button
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active tab pane
                const panes = container.querySelectorAll('.tab-pane');
                panes.forEach(pane => pane.classList.remove('active'));
                const activePane = container.querySelector(`#tab-${tabId}`);
                if (activePane) activePane.classList.add('active');
            });
        });
    }
    
    // Create accordion
    createAccordion(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const accordionHtml = `
            <div class="accordion">
                ${items.map((item, index) => `
                    <div class="accordion-item">
                        <button class="accordion-header ${index === 0 ? 'active' : ''}" data-item="${item.id}">
                            <span>${item.title}</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="accordion-content ${index === 0 ? 'active' : ''}">
                            ${item.content}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = accordionHtml;
        
        // Add accordion toggle
        const headers = container.querySelectorAll('.accordion-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const item = header.closest('.accordion-item');
                const content = item.querySelector('.accordion-content');
                const isActive = header.classList.contains('active');
                
                // Close all other items
                if (!item.classList.contains('allow-multiple')) {
                    const allItems = container.querySelectorAll('.accordion-item');
                    allItems.forEach(i => {
                        i.querySelector('.accordion-header').classList.remove('active');
                        i.querySelector('.accordion-content').classList.remove('active');
                    });
                }
                
                // Toggle current item
                if (!isActive) {
                    header.classList.add('active');
                    content.classList.add('active');
                } else {
                    header.classList.remove('active');
                    content.classList.remove('active');
                }
            });
        });
    }
}

// Create and export UI instance
const ui = new AppUI();

// Export UI instance under both names expected by pages
window.ui = ui;
window.UI = ui;

// Helper function to get initials
function getInitials(name) {
    if (!name || typeof name !== 'string') return 'U';
    const initials = name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase();
    return initials.substring(0, 2);
}

// Global function for backward compatibility
window.loadUserProfileInNavbar = function() {
    return ui.loadUserProfileInNavbar();
};