// Authentication guard for protected pages

class AuthGuard {
    constructor() {
        this.publicPages = [
            'launch.html',
            'login.html',
            'register.html'
        ];

        this.protectedPages = [
            'dashboard.html',
            'school.html',
            'marks.html',
            'reports.html',
            'analytics.html'
        ];
        
        // Listen for auth state changes
        document.addEventListener('app:initialized', () => {
            this.checkCurrentPage();
        });
        
        // Listen for auth changes
        document.addEventListener('user:loaded', () => {
            this.checkCurrentPage();
        });
    }
    
    // Check if current page requires authentication
    checkCurrentPage() {
        const currentPath = window.location.pathname;
        
        // Check if current page is protected
        const isProtected = this.protectedPages.some(page => 
            currentPath.endsWith(page) || currentPath.includes(page)
        );
        
        // Check if current page is public
        const isPublic = this.publicPages.some(page => 
            currentPath.endsWith(page) || currentPath.includes(page)
        );
        
        // If page is protected and user is not authenticated, redirect to login
            if (isProtected && !AppState.isAuthenticated) {
            console.log('Auth guard: Redirecting to login');
            window.location.href = '../auth/login.html';
            return false;
        }
        
        // If user is authenticated and trying to access public pages (except launch), redirect to dashboard
        if (AppState.isAuthenticated && isPublic && !currentPath.includes('launch.html')) {
            console.log('Auth guard: Redirecting to dashboard');
            window.location.href = '../dashboard/dashboard.html';
            return false;
        }
        
        return true;
    }
    
    // Check if user has required role
    hasRole(requiredRole) {
        if (!AppState.currentUserData) {
            return false;
        }
        
        const userRole = AppState.currentUserData.role || 'teacher';
        
        // Role hierarchy: admin > teacher
        const roleHierarchy = {
            'admin': 2,
            'teacher': 1
        };
        
        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }
    
    // Check if user is admin
    isAdmin() {
        return this.hasRole('admin');
    }
    
    // Check if user is teacher
    isTeacher() {
        return this.hasRole('teacher');
    }
    
    // Check if user has permission for specific action
    hasPermission(action, resource) {
        if (this.isAdmin()) {
            return true; // Admin has all permissions
        }
        
        // Teacher permissions
        const teacherPermissions = {
            'view': ['dashboard', 'marks', 'reports', 'analytics'],
            'create': ['marks'],
            'update': ['marks'],
            'delete': []
        };
        
        if (teacherPermissions[action] && teacherPermissions[action].includes(resource)) {
            return true;
        }
        
        return false;
    }
    
    // Require authentication
    requireAuth() {
        if (!AppState.isAuthenticated) {
            throw new Error('Authentication required');
        }
        return true;
    }
    
    // Require specific role
    requireRole(role) {
        this.requireAuth();
        
        if (!this.hasRole(role)) {
            throw new Error(`Role ${role} required`);
        }
        
        return true;
    }
    
    // Require permission
    requirePermission(action, resource) {
        this.requireAuth();
        
        if (!this.hasPermission(action, resource)) {
            throw new Error(`Permission ${action} on ${resource} required`);
        }
        
        return true;
    }
    
    // Middleware for protected routes
    middleware(next) {
        return (params, query) => {
            try {
                this.requireAuth();
                next(params, query);
            } catch (error) {
                console.error('Auth guard middleware error:', error);
                window.location.href = '../auth/login.html';
            }
        };
    }
    
    // Role-based middleware
    roleMiddleware(role, next) {
        return (params, query) => {
            try {
                this.requireRole(role);
                next(params, query);
            } catch (error) {
                console.error(`Role middleware error (${role}):`, error);
                showError(`You need ${role} privileges to access this page.`);
                router.navigate('../dashboard/dashboard.html');
            }
        };
    }
}

// Create and export auth guard instance
const authGuard = new AuthGuard();

// Export auth guard
window.authGuard = authGuard;