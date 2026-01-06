// Client-side routing and navigation management

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.params = {};
        this.query = {};
        
        // Listen for popstate events (back/forward navigation)
        window.addEventListener('popstate', (e) => {
            this.handleRouteChange();
        });
        
        // Listen for link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('href') || link.dataset.route;
                this.navigate(route);
            }
        });
    }
    
    // Add a route
    addRoute(path, handler) {
        this.routes[path] = handler;
    }
    
    // Parse route parameters
    parseRoute(route) {
        // Clear previous params and query
        this.params = {};
        this.query = {};
        
        // Parse query string
        const [path, queryString] = route.split('?');
        if (queryString) {
            const params = new URLSearchParams(queryString);
            for (const [key, value] of params) {
                this.query[key] = value;
            }
        }
        
        return path;
    }
    
    // Handle route change
    handleRouteChange() {
        const path = this.parseRoute(window.location.pathname + window.location.search);
        
        // Find matching route
        for (const [route, handler] of Object.entries(this.routes)) {
            const pattern = this.routeToRegex(route);
            const match = path.match(pattern);
            
            if (match) {
                this.currentRoute = route;
                
                // Extract parameters
                const paramNames = this.getParamNames(route);
                paramNames.forEach((name, index) => {
                    this.params[name] = match[index + 1];
                });
                
                // Call route handler
                handler(this.params, this.query);
                return;
            }
        }
        
        // No route found - 404
        this.handleNotFound();
    }
    
    // Convert route pattern to regex
    routeToRegex(route) {
        return new RegExp('^' + route.replace(/:\w+/g, '([^/]+)') + '$');
    }
    
    // Get parameter names from route
    getParamNames(route) {
        const paramMatches = route.match(/:\w+/g);
        return paramMatches ? paramMatches.map(param => param.substring(1)) : [];
    }
    
    // Navigate to a route
    navigate(route, state = {}) {
        // Parse the route
        const path = this.parseRoute(route);
        
        // Update browser history
        window.history.pushState(state, '', route);
        
        // Handle route change
        this.handleRouteChange();
    }
    
    // Handle 404
    handleNotFound() {
        console.warn('Route not found:', window.location.pathname);
        
        // Check if we're in the app pages path
        if (window.location.pathname.includes('/pages/')) {
            // Redirect to dashboard if authenticated, otherwise to login
            if (AppState.isAuthenticated) {
                this.navigate('../dashboard/dashboard.html');
            } else {
                this.navigate('../auth/login.html');
            }
        }
    }
    
    // Get current route information
    getCurrentRoute() {
        return {
            path: this.currentRoute,
            params: this.params,
            query: this.query,
            fullPath: window.location.pathname + window.location.search
        };
    }
    
    // Go back in history
    goBack() {
        window.history.back();
    }
    
    // Go forward in history
    goForward() {
        window.history.forward();
    }
    
    // Replace current history entry
    replace(route, state = {}) {
        window.history.replaceState(state, '', route);
        this.handleRouteChange();
    }
    
    // Reload current route
    reload() {
        this.handleRouteChange();
    }
}

// Create and export router instance
const router = new Router();

// Initialize router when app is ready
document.addEventListener('app:initialized', () => {
    router.handleRouteChange();
});

// Export router
window.router = router;