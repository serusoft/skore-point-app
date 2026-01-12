// pages/school/school.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('School Page: DOMContentLoaded - Starting initialization process.');
    
    // Track if we've already initialized to prevent duplicate calls
    let pageInitialized = false;
    let schoolDataLoaded = false;
    
    // Single source of truth for page loading state
    const pageLoadingState = {
        isShowing: false,
    };
    
    // Show loading with specific ID for school page
    function showPageLoading(message = 'Loading school portal...') {
        if (!pageLoadingState.isShowing) {
            if (typeof showLoading === 'function') {
                showLoading(message);
                pageLoadingState.isShowing = true;
            }
        }
    }
    
    // Hide loading for school page
    function hidePageLoading() {
        if (pageLoadingState.isShowing) {
            if (typeof hideLoading === 'function') {
                hideLoading();
                pageLoadingState.isShowing = false;
            }
        }
    }
    
    // Show loading immediately as the page starts to initialize
    showPageLoading('Preparing school portal...');
    
    // Listen for the app to be initialized, which means AppState is ready
    document.addEventListener('app:initialized', async () => {
        console.log('School Page: app:initialized event received.');
        
        // Prevent duplicate initialization
        if (pageInitialized) {
            console.log('School Page: Already initialized, skipping.');
            return;
        }
        
        // Now AppState should be populated
        if (window.AppState && window.AppState.currentSchool) {
            console.log('School Page: app:initialized - AppState.currentSchool is available. Calling initializeAndLoad().');
            pageInitialized = true;
            await initializeAndLoad();
        } else {
            // If app is initialized but no currentSchool, it means user likely has no schools
            console.warn('School Page: app:initialized - AppState.currentSchool is NOT available. Hiding loading.');
            hidePageLoading();
            if (typeof showToast === 'function') showToast('No school assigned or loaded. Please contact support.', 'warning');
            // Optionally redirect or show setup UI
        }
    });
    
    // Also listen for school changes in case it's set later or changed
    document.addEventListener('school:changed', async () => {
        console.log('School Page: school:changed event received.');
        if (pageInitialized && !schoolDataLoaded) {
            console.log('School Page: Re-initializing page with new school.');
            await initializeAndLoad();
        }
    });
    
    document.addEventListener('academic-level:changed', (e) => {
        console.log(`School Page: academic-level:changed event received. Loading data for level: ${e.detail.level}.`);
        if (pageInitialized && schoolDataLoaded) {
            loadDataForLevel(e.detail.level);
        }
    });
    
    // If app was already initialized (e.g., navigating back to page without full reload)
    if (window.appInitialized) {
        console.log('School Page: DOMContentLoaded - window.appInitialized is true.');
        if (window.AppState && window.AppState.currentSchool) {
            console.log('School Page: DOMContentLoaded - AppState.currentSchool available (app already initialized).');
            if (!pageInitialized) {
                pageInitialized = true;
                await initializeAndLoad();
            }
        } else {
            console.warn('School Page: DOMContentLoaded - App already initialized but no current school found for user.');
            hidePageLoading();
            if (typeof showToast === 'function') showToast('No school assigned or loaded. Please contact support.', 'warning');
        }
    } else {
        console.log('School Page: DOMContentLoaded - window.appInitialized is false. Waiting for app:initialized event.');
    }
    
    // Safety timeout to ensure loading doesn't get stuck
    setTimeout(() => {
        if (pageLoadingState.isShowing) {
            console.warn('School Page: Safety timeout - hiding loading indicator.');
            hidePageLoading();
            if (!pageInitialized) {
                if (typeof showToast === 'function') showToast('Page initialization taking longer than expected.', 'warning');
            }
        }
    }, 10000); // 10 second safety timeout

    /**
     * Main function to set up the page once school data is available.
     */
    async function initializeAndLoad() {
        console.log('School Page: initializeAndLoad() - Starting initialization...');
        
        // Ensure loading is showing during initialization
        showPageLoading('Loading school data...');
        
        try {
            await initializePage();
            setupEventListeners();
            await loadInitialData();
            setupSchoolSettings();
            schoolDataLoaded = true;
            
            console.log('School Page: initializeAndLoad() - Initialization completed successfully.');
            
        } catch (error) {
            console.error("School Page: initializeAndLoad() - Error during school page initialization:", error);
            if (typeof showToast === 'function') showToast("Failed to initialize school portal. Please refresh the page.", "error");
        } finally {
            // Always hide loading when done
            hidePageLoading();
            console.log('School Page: initializeAndLoad() - Hiding loading indicator.');
        }
    }
    
    /**
     * Initialize page elements with school data
     */
    async function initializePage() {
        console.log('School Page: initializePage() - Initializing page elements...');
        
        const school = AppState.currentSchool;
        if (!school) {
            throw new Error('No school data available');
        }
        
        // Update page title and school info
        document.getElementById('schoolPortalTitle').textContent = `${school.name} Portal`;
        document.getElementById('currentSchoolCode').textContent = school.code || 'N/A';
        
        // Update school level badge
        const levelBadge = document.getElementById('schoolLevelBadge');
        if (levelBadge) {
            levelBadge.textContent = school.level === 'primary' ? 'Primary School' : 'Secondary School';
            levelBadge.className = `school-level-badge ${school.level}`;
        }
        
        // Initialize level navigation
        await initializeLevelNavigation();
        
        console.log('School Page: initializePage() - Page elements initialized.');
    }
    
    /**
     * Initialize level navigation based on school type
     */
    async function initializeLevelNavigation() {
        const school = AppState.currentSchool;
        const levelNav = document.getElementById('levelNavigation');
        
        if (!school || !levelNav) return;
        
        if (school.level === 'primary') {
            levelNav.innerHTML = `
                <button class="level-nav-btn ${AppState.currentAcademicLevel === 'lower-primary' ? 'active' : ''}" 
                        data-level="lower-primary">
                    Lower Primary (P1-P3)
                </button>
                <button class="level-nav-btn ${AppState.currentAcademicLevel === 'upper-primary' ? 'active' : ''}" 
                        data-level="upper-primary">
                    Upper Primary (P4-P7)
                </button>
            `;
        } else {
            levelNav.innerHTML = `
                <button class="level-nav-btn ${AppState.currentAcademicLevel === 'olevel' ? 'active' : ''}" 
                        data-level="olevel">
                    O-Level (S1-S4)
                </button>
                <button class="level-nav-btn ${AppState.currentAcademicLevel === 'alevel' ? 'active' : ''}" 
                        data-level="alevel">
                    A-Level (S5-S6)
                </button>
            `;
        }
        
        // Set default academic level if not set
        if (!AppState.currentAcademicLevel) {
            const defaultLevel = school.level === 'primary' ? 'lower-primary' : 'olevel';
            AppState.currentAcademicLevel = defaultLevel;
            
            // Update UI to show active level
            const defaultBtn = levelNav.querySelector(`[data-level="${defaultLevel}"]`);
            if (defaultBtn) defaultBtn.classList.add('active');
        }
    }
    
    /**
     * Setup all event listeners for the page
     */
    function setupEventListeners() {
        console.log('School Page: setupEventListeners() - Setting up event listeners...');
        
        // Content tabs
        const tabs = document.querySelectorAll('.content-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const section = tab.dataset.section;
                switchTab(section);
            });
        });
        
        // Level navigation
        const levelNav = document.getElementById('levelNavigation');
        if (levelNav) {
            levelNav.addEventListener('click', (e) => {
                const btn = e.target.closest('.level-nav-btn');
                if (btn && btn.dataset.level) {
                    const level = btn.dataset.level;
                    
                    // Update UI
                    document.querySelectorAll('.level-nav-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Update AppState and load data
                    AppState.currentAcademicLevel = level;
                    loadDataForLevel(level);
                    
                    // Dispatch event
                    document.dispatchEvent(new CustomEvent('academic-level:changed', {
                        detail: { level }
                    }));
                }
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshSchoolData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                if (typeof showToast === 'function') showToast('Refreshing school data...', 'info');
                await loadInitialData();
            });
        }
        
        // Switch level button
        const switchLevelBtn = document.getElementById('switchLevelBtn');
        if (switchLevelBtn) {
            switchLevelBtn.addEventListener('click', async () => {
                try {
                    const selectedLevel = await showLevelSelection(AppState.currentSchool.level);
                    if (selectedLevel) {
                        setAcademicLevel(selectedLevel);
                        loadDataForLevel(selectedLevel);
                    }
                } catch (error) {
                    console.error('Error switching level:', error);
                    if (typeof showToast === 'function') showToast('Failed to switch level', 'error');
                }
            });
        }
        
        // Settings tab button
        const settingsBtn = document.getElementById('settingsTabBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                switchTab('settings');
            });
        }
        
        console.log('School Page: setupEventListeners() - Event listeners set up.');
    }
    
    /**
     * Switch between content tabs
     */
    function switchTab(section) {
        // Update tab buttons
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.section === section);
        });
        
        // Update content sections
        document.querySelectorAll('.content-section').forEach(sectionEl => {
            sectionEl.classList.toggle('active', sectionEl.id === `${section}Section`);
        });
    }
    
    /**
     * Load initial data for the current school and level
     */
    async function loadInitialData() {
        console.log('School Page: loadInitialData() - Loading initial data...');
        
        if (!AppState.currentAcademicLevel) {
            const defaultLevel = AppState.currentSchool.level === 'primary' ? 'lower-primary' : 'olevel';
            AppState.currentAcademicLevel = defaultLevel;
        }
        
        await loadDataForLevel(AppState.currentAcademicLevel);
        
        console.log('School Page: loadInitialData() - Initial data loaded.');
    }
    
    /**
     * Load data for specific academic level
     */
    async function loadDataForLevel(level) {
        console.log(`School Page: loadDataForLevel() - Loading data for academic level: ${level}`);
        
        if (!level || !AppState.currentSchool) return;
        
        // Show loading for data fetch
        showPageLoading(`Loading ${level.replace('-', ' ')} data...`);
        
        try {
            // Load classes, students, subjects, teachers for this level
            await Promise.all([
                loadClasses(level),
                loadStudents(level),
                loadSubjects(level),
                loadTeachers()
            ]);
            
            console.log(`School Page: loadDataForLevel() - Data loaded for level: ${level}`);
            
        } catch (error) {
            console.error(`School Page: loadDataForLevel() - Error loading data for level ${level}:`, error);
            if (typeof showToast === 'function') showToast(`Failed to load data for ${level}`, 'error');
        } finally {
            hidePageLoading();
        }
    }
    
    /**
     * Load classes for the current level
     */
    async function loadClasses(level) {
        // Implementation would go here
        console.log(`Loading classes for level: ${level}`);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    /**
     * Load students for the current level
     */
    async function loadStudents(level) {
        // Implementation would go here
        console.log(`Loading students for level: ${level}`);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    /**
     * Load subjects for the current level
     */
    async function loadSubjects(level) {
        // Implementation would go here
        console.log(`Loading subjects for level: ${level}`);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    /**
     * Load teachers (not level-specific)
     */
    async function loadTeachers() {
        // Implementation would go here
        console.log('Loading teachers');
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    /**
     * Setup school settings section
     */
    function setupSchoolSettings() {
        console.log('School Page: setupSchoolSettings() - Setting up school settings...');
        
        // School badge upload
        const badgeInput = document.getElementById('schoolBadgeInput');
        const uploadBtn = document.getElementById('uploadSchoolBadgeBtn');
        const badgePreview = document.getElementById('schoolBadgePreview');
        
        if (badgeInput && uploadBtn && badgePreview) {
            // Update preview when file is selected
            badgeInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        badgePreview.src = event.target.result;
                        uploadBtn.disabled = false;
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Handle upload
            uploadBtn.addEventListener('click', async () => {
                const file = badgeInput.files[0];
                if (!file) return;
                
                // Implementation for uploading badge would go here
                if (typeof showToast === 'function') showToast('Uploading school badge...', 'info');
                
                // Simulate upload
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (typeof showToast === 'function') showToast('School badge uploaded successfully!', 'success');
                uploadBtn.disabled = true;
                badgeInput.value = '';
            });
        }
        
        console.log('School Page: setupSchoolSettings() - School settings set up.');
    }
});