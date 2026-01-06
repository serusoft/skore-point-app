// Helper Utility Functions
// General purpose helper functions for the application

const Helpers = {
    // Format date
    formatDate(date, format = 'short') {
        if (!date) return 'N/A';
        
        const d = new Date(date);
        
        if (format === 'short') {
            return d.toLocaleDateString();
        } else if (format === 'long') {
            return d.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (format === 'iso') {
            return d.toISOString().split('T')[0];
        }
        
        return d.toLocaleDateString();
    },
    
    // Format time
    formatTime(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },
    
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Generate random ID
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    
    // Generate school code (6 characters)
    generateSchoolCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
    
    // Get initials from name
    getInitials(name) {
        if (!name) return 'U';
        
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },
    
    // Debounce function for search inputs
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function for scroll/resize events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Merge objects
    mergeObjects(...objects) {
        return Object.assign({}, ...objects);
    },
    
    // Capitalize first letter
    capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },
    
    // Truncate text with ellipsis
    truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    // Parse CSV/Excel data
    parseTableData(data) {
        try {
            const rows = data.trim().split('\n');
            return rows.map(row => row.split(',').map(cell => cell.trim()));
        } catch (error) {
            console.error('Error parsing table data:', error);
            return [];
        }
    },
    
    // Convert to CSV
    toCSV(data) {
        if (!Array.isArray(data)) return '';
        
        const headers = Object.keys(data[0] || {});
        const rows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Handle values that contain commas or quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        );
        
        return [headers.join(','), ...rows].join('\n');
    },
    
    // Download file
    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },
    
    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return { success: true };
        } catch (error) {
            console.error('Failed to copy:', error);
            return { success: false, error };
        }
    },
    
    // Check if device is mobile
    isMobile() {
        return window.innerWidth <= 768;
    },
    
    // Check if online
    isOnline() {
        return navigator.onLine;
    },
    
    // Get query parameters
    getQueryParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
        
        return params;
    },
    
    // Set query parameters
    setQueryParams(params) {
        const queryString = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        
        const newUrl = window.location.pathname + (queryString ? `?${queryString}` : '');
        window.history.pushState({}, '', newUrl);
    },
    
    // Show loading indicator
    showLoading(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = `
            <div class="spinner"></div>
            <p>${message}</p>
        `;
        loadingDiv.style.cssText = `
            text-align: center;
            padding: 40px;
            color: var(--gray-light);
        `;
        
        container.innerHTML = '';
        container.appendChild(loadingDiv);
    },
    
    // Hide loading indicator
    hideLoading(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const loadingDiv = container.querySelector('.loading-indicator');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    },
    
    // Show toast notification
    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Style toast
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--info)'};
            color: white;
            padding: 15px 20px;
            border-radius: var(--border-radius-sm);
            box-shadow: var(--shadow);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Add animation styles if not present
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    // Confirm dialog
    async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'confirm-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
                        <button class="btn btn-primary" id="confirm-ok">OK</button>
                    </div>
                </div>
            `;
            
            // Style modal
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            modal.querySelector('.modal-content').style.cssText = `
                background: var(--darker);
                padding: 30px;
                border-radius: var(--border-radius);
                max-width: 400px;
                width: 90%;
            `;
            
            modal.querySelector('.modal-actions').style.cssText = `
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 20px;
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners
            modal.querySelector('#confirm-cancel').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            modal.querySelector('#confirm-ok').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
            
            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }
};

export default Helpers;