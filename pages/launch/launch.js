// Launch page specific functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Launch page loaded');
    
    // Get DOM elements
    const getStartedBtn = document.getElementById('getStartedBtn');
    const installAppBtn = document.getElementById('installAppBtn');
    
    // Function to update UI based on auth state
    const updateAuthUI = (isAuth) => {
        if (isAuth && getStartedBtn) {
            getStartedBtn.innerHTML = '<i class="fas fa-tachometer-alt"></i> Go to Dashboard';
        } else if (getStartedBtn) {
            getStartedBtn.innerHTML = '<i class="fas fa-rocket"></i> Get Started';
        }
    };

    // Check initial auth state
    updateAuthUI(localStorage.getItem('isAuthenticated') === 'true');
    
    // Listen for auth state changes
    document.addEventListener('auth:state-changed', (e) => {
        updateAuthUI(e.detail.isAuthenticated);
    });
    
    // Add event listeners
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function() {
            const isAuth = localStorage.getItem('isAuthenticated') === 'true';
            if (isAuth) {
                window.location.href = '../dashboard/dashboard.html';
            } else {
                window.location.href = '../auth/login.html';
            }
        });
    }
    
    if (installAppBtn) {
        installAppBtn.addEventListener('click', function() {
            if (AppState.deferredPrompt) {
                installPWA();
            } else {
                if (typeof showToast === 'function') {
                    showToast('To install the app, look for the "Add to Home Screen" option in your browser menu.', 'info');
                } else {
                    alert('To install the app, look for the "Add to Home Screen" option in your browser menu.');
                }
            }
        });
        
        // Hide install button if app is already installed
        const checkInstallState = () => {
            if (AppState.isAppInstalled) {
                installAppBtn.style.display = 'none';
            }
        };
        checkInstallState();
        document.addEventListener('app:initialized', checkInstallState);
    }
    
    // Simulate loading progress
    const loaderBar = document.querySelector('.loader-bar');
    if (loaderBar) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            loaderBar.style.width = progress + '%';
            
            if (progress >= 100) {
                clearInterval(interval);
                
                // Show buttons with animation
                setTimeout(() => {
                    const launchButtons = document.querySelector('.launch-buttons');
                    if (launchButtons) {
                        launchButtons.style.opacity = '1';
                        launchButtons.style.transform = 'translateY(0)';
                    }
                }, 500);
            }
        }, 200);
    }
    
    // Add animation to tagline
    const tagline = document.querySelector('.tagline');
    if (tagline) {
        setTimeout(() => {
            tagline.style.opacity = '1';
            tagline.style.transform = 'translateY(0)';
        }, 1000);
    }
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isAuthenticated) {
                window.location.href = '../dashboard/dashboard.html';
            } else {
                window.location.href = '../auth/login.html';
            }
        }
    });
});