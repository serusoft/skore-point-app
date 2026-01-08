// UI components and utilities

class AppUI {
    constructor() {
        this.modals = new Map();
        this.toasts = new Map();
        this.loaders = new Map();
        
        // Initialize UI components
        this.initializeModals();
        this.initializeToasts();
        this.initializeTooltips();
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
            const isAuthenticated = AppState.isAuthenticated;
            let navLinks = `
                <a href="../auth/login.html" class="nav-link" data-page="login"><i class="fas fa-sign-in-alt"></i> Sign In</a>
                <a href="../auth/register.html" class="nav-link" data-page="register"><i class="fas fa-user-plus"></i> Register</a>
            `;

            if (isAuthenticated) {
                navLinks = ''; // No links for authenticated users in the main navbar
            }

            const navHtml = `
                <nav class="navbar" id="main-navbar">
                    <div class="container">
                        <div class="navbar-brand">
                            <i class="fas fa-graduation-cap" aria-hidden="true"></i>
                            <span class="brand-title">SKORE POINT</span>
                        </div>

                        <button class="navbar-toggle desktop-hidden" id="navbar-toggle" aria-label="Open menu">
                            <i class="fas fa-bars"></i>
                        </button>

                        <div class="navbar-nav desktop-only" id="navbar-desktop-nav">
                            ${navLinks}
                        </div>

                        <div class="mobile-nav mobile-only" id="navbar-mobile-nav" aria-hidden="true">
                            ${navLinks}
                        </div>
                    </div>
                </nav>
            `;

            // If page provides a navbar container, use it
            const container = document.getElementById('navbar-container');
            if (container) {
                container.innerHTML = navHtml;
                document.body.classList.add('has-navbar');
                // Attach mobile toggle behavior when injected into a container
                const toggleBtn = container.querySelector('#navbar-toggle');
                const mobileNav = container.querySelector('#navbar-mobile-nav');
                if (toggleBtn && mobileNav) {
                    toggleBtn.addEventListener('click', () => {
                        const open = mobileNav.classList.toggle('active');
                        mobileNav.setAttribute('aria-hidden', !open);
                    });
                }
                return;
            }

            // Otherwise, ensure a single navbar is present at top of body
            if (!document.querySelector('nav.navbar')) {
                document.body.insertAdjacentHTML('afterbegin', navHtml);
                document.body.classList.add('has-navbar');

                // Attach mobile toggle behavior when inserted at top of body
                setTimeout(() => {
                    const inserted = document.getElementById('main-navbar');
                    if (!inserted) return;
                    const toggleBtn = inserted.querySelector('#navbar-toggle');
                    const mobileNav = inserted.querySelector('#navbar-mobile-nav');
                    if (toggleBtn && mobileNav) {
                        toggleBtn.addEventListener('click', () => {
                            const open = mobileNav.classList.toggle('active');
                            mobileNav.setAttribute('aria-hidden', !open);
                        });
                    }
                }, 20);
            }
        } catch (e) {
            console.error('Failed to inject navbar', e);
        }
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
    
    // Show loading indicator
    showLoading(loaderId = 'default', message = 'Loading...') {
        // Support calling showLoading(message) where first arg is a string message
        if (typeof loaderId === 'string' && typeof message === 'undefined') {
            message = loaderId;
            loaderId = 'default';
        }

        // Also support call showLoading(message) when only one string argument provided
        if (typeof loaderId === 'string' && typeof message !== 'string') {
            message = 'Loading...';
        }

        // Create loader if it doesn't exist
        let loader = this.loaders.get(loaderId);
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'loading-indicator';
            loader.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            `;
            document.body.appendChild(loader);
            this.loaders.set(loaderId, loader);
        } else {
            // Update existing message
            const msgEl = loader.querySelector('.loading-message');
            if (msgEl) msgEl.textContent = message;
        }

        loader.classList.add('active');
        return loaderId;
    }
    
    // Hide loading indicator
    hideLoading(loaderId = 'default') {
        const loader = this.loaders.get(loaderId);
        if (loader) {
            loader.classList.remove('active');
        }
    }
    
    // Update loading message
    updateLoadingMessage(loaderId, message) {
        const loader = this.loaders.get(loaderId);
        if (loader) {
            const messageEl = loader.querySelector('.loading-message');
            if (messageEl) messageEl.textContent = message;
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

// Bind commonly used methods to the `UI` object to avoid issues when `UI` identifier
// is also used as a class name in some environments.
window.UI.showLoading = ui.showLoading.bind(ui);
window.UI.hideLoading = ui.hideLoading.bind(ui);
window.UI.showToast = ui.showToast.bind(ui);
window.UI.showModal = ui.showModal.bind(ui);
window.UI.closeModal = ui.closeModal.bind(ui);
