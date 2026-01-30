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
            
            console.log('UI.injectNavbar() - Injecting navbar, authenticated:', isAuthenticated);

            if (isAuthenticated) {
                navHtml = this.createAuthenticatedNavbar();
            } else {
                navHtml = this.createUnauthenticatedNavbar();
            }

            // If page provides a navbar container, use it
            const container = document.getElementById('navbar-container');
            if (container) {
                console.log('UI.injectNavbar() - Found navbar-container, injecting navbar');
                container.innerHTML = navHtml;
                document.body.classList.add('has-navbar');
                console.log('UI.injectNavbar() - Added has-navbar class to body');
                
                // Setup event listeners when injected into a container
                


                // Populate user info if authenticated
                if (isAuthenticated && AppState.currentUser) {
                    setTimeout(() => {
                        console.log('UI.injectNavbar() - Loading user profile in navbar');
                        this.loadUserProfileInNavbar();
                    }, 100);
                }
                return;
            }

            // Otherwise, ensure a single navbar is present at top of body
            console.log('UI.injectNavbar() - No navbar-container found, injecting navbar at body start');
            let existingNavbar = document.querySelector('nav.navbar');
            if (existingNavbar) {
                // Replace existing navbar
                console.log('UI.injectNavbar() - Replacing existing navbar');
                existingNavbar.outerHTML = navHtml;
            } else {
                // Insert new navbar at top
                console.log('UI.injectNavbar() - Inserting new navbar at top of body');
                document.body.insertAdjacentHTML('afterbegin', navHtml);
            }
            
            document.body.classList.add('has-navbar');
            console.log('UI.injectNavbar() - Added has-navbar class to body');



            // Setup event listeners
            setTimeout(() => {
                this.setupGlobalNavbarEvents();
                // Populate user info if authenticated
                if (isAuthenticated && AppState.currentUser) {
                    console.log('UI.injectNavbar() - Loading user profile in navbar');
                    this.loadUserProfileInNavbar();
                }
            }, 50);
            
        } catch (e) {
            console.error('UI.injectNavbar() - Failed to inject navbar', e);
        }
    }
    


    createAuthenticatedNavbar() {
        // Determine if the "How to Use" button should be shown
        const currentPageFromHash = window.location.hash.substring(1).split('/')[0];
        const currentPageFromPath = window.location.pathname.split('/').pop().replace('.html', '');
        const currentPage = currentPageFromHash || currentPageFromPath;
        const showHowToUse = ['dashboard', 'school'].includes(currentPage);
        const howToUseButtonDesktop = `
            <a href="../marks/tutorials.html" data-page="tutorials" class="btn btn-outline-primary how-to-use-link-desktop desktop-only ${showHowToUse ? '' : 'd-none'}">
                <i class="fas fa-play-circle"></i> Learn how to use Skore Point
            </a>
        `;

        return `
            <nav class="navbar" id="main-navbar" role="navigation" aria-label="Main navigation">
                <a href="#dashboard" class="navbar-brand">
                    <span class="brand-mark"><i class="fas fa-graduation-cap"></i></span>
                    <span class="brand-title">Skore Point</span>
                </a>

                <div class="navbar-right-menu desktop-only">
                    ${howToUseButtonDesktop}
                </div>

                <!-- Hamburger menu removed for mobile -->
            </nav>

            <div class="bottom-tab-bar mobile-only">
                <a href="#dashboard" data-page="dashboard" class="tab-link">
                    <i class="fas fa-home"></i>
                    <span>Dashboard</span>
                </a>
                <a href="#profile" data-page="profile" class="tab-link">
                    <i class="fas fa-user"></i>
                    <span>Profile</span>
                </a>
                <a href="../marks/tutorials.html" data-page="tutorials" class="tab-link how-to-use-link">
                    <i class="fas fa-play-circle"></i>
                    <span>How to Use Skore Point</span>
                </a>
            </div>
        `;
    }

    createUnauthenticatedNavbar() {
        return `
            <nav class="navbar" id="main-navbar" role="navigation" aria-label="Main navigation">
                <a href="../" class="navbar-brand">
                    <span class="brand-mark"><i class="fas fa-graduation-cap"></i></span>
                    <span class="brand-title">Skore Point</span>
                </a>

                <div class="navbar-nav desktop-only">
                    <a href="../auth/login.html" data-page="login" class="nav-link">Sign In</a>
                    <a href="../auth/register.html" data-page="register" class="nav-link btn btn-primary">Register</a>
                </div>

                <button class="navbar-toggle mobile-only" id="navbar-toggle" aria-label="Open menu">
                    <i class="fas fa-bars"></i>
                </button>

                <div class="mobile-nav" id="navbar-mobile-nav" aria-hidden="true">
                    <a href="../auth/login.html" data-page="login" class="nav-link">Sign In</a>
                    <a href="../auth/register.html" data-page="register" class="nav-link">Register</a>
                </div>
            </nav>
        `;
    }

    // loadUserProfileInNavbar - FIXED VERSION (removed inline styles)
    async loadUserProfileInNavbar() {
        return; // Disabled as per user request to move profile below nav
    }

    // populateGlobalUserInfo will now simply call loadUserProfileInNavbar
    
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
                        <button class="modal-close" id="${modalId}-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="${modalId}-cancel">
                            Cancel
                        </button>
                        <button class="btn btn-primary" id="${modalId}-confirm">
                            Confirm
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.showModal(modalId);

            const cleanup = () => {
                this.closeModal(modalId);
                setTimeout(() => modal.remove(), 300);
            };

            modal.querySelector(`#${modalId}-close`).addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            modal.querySelector(`#${modalId}-cancel`).addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            modal.querySelector(`#${modalId}-confirm`).addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
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
                        <button class="modal-close" id="${modalId}-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="${modalId}-ok">
                            OK
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.showModal(modalId);

            const cleanup = () => {
                this.closeModal(modalId);
                setTimeout(() => modal.remove(), 300);
            };

            modal.querySelector(`#${modalId}-close`).addEventListener('click', () => {
                cleanup();
                resolve();
            });
            modal.querySelector(`#${modalId}-ok`).addEventListener('click', () => {
                cleanup();
                resolve();
            });
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
                        <button class="modal-close" id="${modalId}-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                        <input type="text" class="form-control" id="${modalId}-input" value="${defaultValue}">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="${modalId}-cancel">
                            Cancel
                        </button>
                        <button class="btn btn-primary" id="${modalId}-ok">
                            OK
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.showModal(modalId);

            const cleanup = () => {
                this.closeModal(modalId);
                setTimeout(() => modal.remove(), 300);
            };

            modal.querySelector(`#${modalId}-close`).addEventListener('click', () => {
                cleanup();
                resolve(null);
            });
            modal.querySelector(`#${modalId}-cancel`).addEventListener('click', () => {
                cleanup();
                resolve(null);
            });
            modal.querySelector(`#${modalId}-ok`).addEventListener('click', () => {
                const val = document.getElementById(`${modalId}-input`).value;
                cleanup();
                resolve(val);
            });
            
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
                        <button class="modal-close" id="${modalId}-close">
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
                        <button class="btn btn-secondary" id="${modalId}-cancel">
                            Cancel
                        </button>
                        <button class="btn btn-primary" id="${modalId}-ok">
                            OK
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.showModal(modalId);

            const cleanup = () => {
                this.closeModal(modalId);
                setTimeout(() => modal.remove(), 300);
            };

            modal.querySelector(`#${modalId}-close`).addEventListener('click', () => {
                cleanup();
                resolve(null);
            });
            modal.querySelector(`#${modalId}-cancel`).addEventListener('click', () => {
                cleanup();
                resolve(null);
            });
            modal.querySelector(`#${modalId}-ok`).addEventListener('click', () => {
                const val = document.getElementById(`${modalId}-select`).value;
                cleanup();
                resolve(val);
            });
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
                } else if (field.type === 'multiselect') {
                    inputHtml = `
                        <div class="multiselect-container" id="${fieldId}-container" style="max-height: 200px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; background: rgba(0,0,0,0.2);">
                            ${field.options.map(opt => `
                                <div class="checkbox-item" style="margin-bottom: 8px; display: flex; align-items: center;">
                                    <input type="checkbox" id="${fieldId}-${opt.value}" name="${field.name}[]" value="${opt.value}" 
                                           ${(Array.isArray(field.value) && field.value.includes(opt.value)) || opt.selected ? 'checked' : ''}
                                           style="margin-right: 10px; width: auto; height: 16px;">
                                    <label for="${fieldId}-${opt.value}" style="margin-bottom: 0; cursor: pointer;">${opt.label}</label>
                                </div>
                            `).join('')}
                        </div>
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
                    if (field.type === 'multiselect') {
                        const checkboxes = modal.querySelectorAll(`input[name="${field.name}[]"]:checked`);
                        formData[field.name] = Array.from(checkboxes).map(cb => cb.value);
                    } else if (field.type !== 'display') {
                        const element = modal.querySelector(`#${modalId}-${field.name}`);
                        if (element) {
                            formData[field.name] = element.value;
                        }
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