document.addEventListener('DOMContentLoaded', () => {
    console.log('Tutorials page: DOMContentLoaded');
    
    // Wait for app to initialize
    if (window.appInitialized) {
        initTutorialsPage();
    } else {
        document.addEventListener('app:initialized', initTutorialsPage);
    }
});

function initTutorialsPage() {
    console.log('Initializing Tutorials page');
    
    // Ensure navbar is injected
    if (window.UI && typeof window.UI.injectNavbar === 'function') {
        window.UI.injectNavbar();
    }
    
    // Setup back navigation
    setupTutorialsNavigation();
    
    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    console.log('Tutorials page initialized successfully');
}

function setupTutorialsNavigation() {
    // Add keyboard shortcut for back (Escape key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            goBack();
        }
    });
    
    // Add click handlers for tutorial cards if needed
    const tutorialCards = document.querySelectorAll('.tutorial-card');
    tutorialCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.cursor = 'pointer';
        });
    });
}

function goBack() {
    // Check if there's a previous page in history
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // Default to dashboard if no history
        if (window.navigateTo) {
            window.navigateTo('dashboard');
        } else {
            window.location.href = '../dashboard/dashboard.html';
        }
    }
}