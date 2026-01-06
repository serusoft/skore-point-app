// Launch page specific functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Launch page loaded');
    
    // Get DOM elements
    const getStartedBtn = document.getElementById('getStartedBtn');
    const installAppBtn = document.getElementById('installAppBtn');
    
    // Check if user is already authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    // Update button text if user is authenticated
    if (isAuthenticated && getStartedBtn) {
        getStartedBtn.innerHTML = '<i class="fas fa-tachometer-alt"></i> Go to Dashboard';
    }
    
    // Add event listeners
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function() {
                if (isAuthenticated) {
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
                ui.alert('To install the app, look for the "Add to Home Screen" option in your browser menu.', 'Install App');
            }
        });
        
        // Hide install button if app is already installed
        if (AppState.isAppInstalled) {
            installAppBtn.style.display = 'none';
        }
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