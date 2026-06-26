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
            if (typeof window.installPWA === 'function') {
                window.installPWA();
            } else {
                // Fallback: show instructions
                alert('To install this app, open the browser menu and choose "Install" or "Add to Home screen".');
            }
        });
    }
    
    // Initial check for PWA button state (handled by app.js, but trigger update here to be safe)
    if (typeof window.updatePWAButtonUI === 'function') {
        window.updatePWAButtonUI();
    }
    
    // The animation is now handled by CSS. We just need to show the buttons after a delay.
    setTimeout(() => {
        // Update PWA button state right before showing to catch late events
        if (typeof window.updatePWAButtonUI === 'function') {
            window.updatePWAButtonUI();
        }

        const launchButtons = document.querySelector('.launch-buttons');
        if (launchButtons) {
            launchButtons.style.opacity = '1';
            launchButtons.style.transform = 'translateY(0)';
            console.log('Launch buttons displayed.');
        }
    }, 1500); // Delay to allow animations to play
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const isAuthNow = localStorage.getItem('isAuthenticated') === 'true';
            if (isAuthNow) {
                window.location.href = '../dashboard/dashboard.html';
            } else {
                window.location.href = '../auth/login.html';
            }
        }
    });
});