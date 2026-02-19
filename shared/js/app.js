// shared/js/app.js - Complete fixed version

// Application Initialization and Core Functions

// Global State Management
const AppState = {
    currentUser: null,
    currentUserData: null,
    currentSchool: null,
    currentSchoolLevel: null, // 'primary' or 'secondary'
    currentAcademicLevel: null, // 'lower-primary', 'upper-primary', 'olevel', 'alevel'
    userSchools: [],
    isAuthenticated: false,
    deferredPrompt: null,
    isAppInstalled: false,
    installInProgress: false,
    authListenerRegistered: false
};

// --- PUSH NOTIFICATION CONFIG ---
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY'; // <-- REPLACE WITH YOUR GENERATED PUBLIC KEY

// Firebase Modules (lazy loaded)
let firebaseApp, firebaseAuth, firestoreDB;
let authModule, firestoreModule, storageModule;

// DOM Elements Cache
const DOM = {
    modals: {},
    alerts: {},
    containers: {},
    // Will be populated on page load
};

// Initialize application
async function initializeApp() {
    const startTime = performance.now();
    console.log('App: initializeApp() - Start');
    console.log('App: Version 1.4.2');
    
    try {
        // Initialize PWA
        initializePWA();

        // Initialize Firebase
        console.log('App: initializeApp() - Initializing Firebase...');
        const firebaseInitialized = await initializeFirebase();
        if (!firebaseInitialized) {
            console.error('App: initializeApp() - Firebase initialization failed. Aborting app initialization.');
            throw new Error('Firebase initialization failed');
        }
        console.log('App: initializeApp() - Firebase initialized successfully.');
        
        // Check authentication state
        console.log('App: initializeApp() - Checking auth state...');
        await checkAuthState();
        console.log('App: initializeApp() - Auth state check completed.');
        
        // Initialize offline detection
        initializeOfflineDetection();
        
        // Cache DOM elements
        cacheDOMElements();
        
        console.log('App: initializeApp() - Application initialized successfully.');
        
        // Dispatch app initialized event
        window.appInitialized = true;
        document.dispatchEvent(new CustomEvent('app:initialized'));
        console.log('App: initializeApp() - Dispatched app:initialized event.');

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);
        console.log(`%c[Performance] App initialized in ${duration} ms`, 'color: #4361ee; font-weight: bold;');

    } catch (error) {
        console.error('App: initializeApp() - App initialization error:', error);
        hideInitialLoadingScreen();
        hideLoading();
        showError('Application failed to initialize. Please refresh the page.');
    }
}

// Initialize Firebase
async function initializeFirebase() {
    try {
        // Dynamic imports for Firebase modules
        const appModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
        authModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
        firestoreModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        storageModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');

        // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyASIdYdW94ZJQXsc6BN9Bc28eou0yjPE1U",
            authDomain: "upgrade-16092.firebaseapp.com",
            projectId: "upgrade-16092",
            storageBucket: "upgrade-16092.firebasestorage.app",
            messagingSenderId: "466381827996",
            appId: "1:466381827996:web:6f030e68c526e734a26259",
            measurementId: "G-RGCH68RJ8H"
        };

        // Initialize Firebase
        firebaseApp = appModule.initializeApp(firebaseConfig);
        firebaseAuth = authModule.getAuth(firebaseApp);
        firestoreDB = firestoreModule.getFirestore(firebaseApp);
        
        // Expose Firebase global for page scripts
        window.Firebase = {
            auth: {
                signInWithEmailAndPassword: (email, password) => authModule.signInWithEmailAndPassword(firebaseAuth, email, password),
                createUserWithEmailAndPassword: (email, password) => authModule.createUserWithEmailAndPassword(firebaseAuth, email, password),
                signOut: () => authModule.signOut(firebaseAuth),
                updateProfile: (user, profile) => authModule.updateProfile(user, profile),
                sendPasswordResetEmail: (email) => authModule.sendPasswordResetEmail(firebaseAuth, email),
                onAuthStateChanged: (callback) => authModule.onAuthStateChanged(firebaseAuth, callback)
            },
            db: {
                collection: (name) => firestoreModule.collection(firestoreDB, name),
                doc: (col, id) => firestoreModule.doc(firestoreDB, col, id),
                getDoc: async (col, id) => {
                    const snap = await firestoreModule.getDoc(firestoreModule.doc(firestoreDB, col, id));
                    return { exists: () => snap.exists(), data: () => snap.data(), id: snap.id };
                },
                setDoc: (col, id, data) => firestoreModule.setDoc(firestoreModule.doc(firestoreDB, col, id), data),
                addDoc: (col, data) => firestoreModule.addDoc(firestoreModule.collection(firestoreDB, col), data),
                updateDoc: (col, id, data) => firestoreModule.updateDoc(firestoreModule.doc(firestoreDB, col, id), data),
                deleteDoc: (col, id) => firestoreModule.deleteDoc(firestoreModule.doc(firestoreDB, col, id)),
                query: async (col, constraints) => {
                    if (!constraints) constraints = [];
                    if (!Array.isArray(constraints)) constraints = [constraints];
                    
                    // Ensure schoolId is included for school collections if we have a current school
                    // This fixes "Missing permissions" errors where security rules require schoolId
                    const schoolCollections = ['students', 'classes', 'subjects', 'marks'];
                    if (schoolCollections.includes(col) && AppState.currentSchool && AppState.currentSchool.id) {
                        const hasSchoolId = constraints.some(c => c.field === 'schoolId');
                        if (!hasSchoolId) {
                            constraints.push({ field: 'schoolId', op: '==', value: AppState.currentSchool.id });
                        }
                    }

                    // SMART QUERY: Handle composite index/permission issues for school data
                    // If querying school-related collections and we have a current school
                    // Enable for all school collections (including marks) to avoid missing index/permission errors
                    if (schoolCollections.includes(col) && AppState.currentSchool && AppState.currentSchool.id) {
                        
                        // Check if we need to optimize:
                        // 1. If we have filters other than schoolId (would require composite index)
                        // 2. OR if we are missing schoolId (would cause permission error)
                        const hasOtherFilters = constraints.some(c => c.field !== 'schoolId');
                        
                        if (hasOtherFilters) {
                            // console.log(`[App] Optimizing query for ${col} to avoid composite index/permission issues.`);
                            
                            // 1. Query by schoolId only (indexed by default, satisfies security rules)
                            const schoolQuery = firestoreModule.query(
                                firestoreModule.collection(firestoreDB, col), 
                                firestoreModule.where('schoolId', '==', AppState.currentSchool.id)
                            );
                            
                            const snap = await firestoreModule.getDocs(schoolQuery);
                            let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                            
                            // 2. Apply original constraints in memory
                            results = results.filter(item => {
                                return constraints.every(c => {
                                    const val = item[c.field];
                                    if (c.op === '==') return val === c.value;
                                    if (c.op === 'array-contains') return Array.isArray(val) && val.includes(c.value);
                                    return true; // Fallback for other ops
                                });
                            });
                            
                            return results;
                        }
                    }

                    const queryConstraints = constraints.map(c => firestoreModule.where(c.field, c.op, c.value));
                    const q = firestoreModule.query(firestoreModule.collection(firestoreDB, col), ...queryConstraints);
                    const snap = await firestoreModule.getDocs(q);
                    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
                },
                getAll: async (col) => {
                     const snap = await firestoreModule.getDocs(firestoreModule.collection(firestoreDB, col));
                     return snap.docs.map(d => ({ id: d.id, ...d.data() }));
                },
                serverTimestamp: () => firestoreModule.serverTimestamp(),
                arrayUnion: (val) => firestoreModule.arrayUnion(val),
                arrayRemove: (val) => firestoreModule.arrayRemove(val)
            }
        };

        return true;
        
    } catch (error) {
        console.error('App: initializeFirebase() - Firebase initialization error:', error);
        showError('Failed to load core application services (Firebase). Please check your internet connection and try again.', 'Connection Error');
        return false;
    }
}

// Check authentication state
let initialAuthCheckDone = false;
async function checkAuthState() {
    console.log('App: checkAuthState() - Registering auth state listener.');
    return new Promise((resolve) => {
        // Only register auth listener once
        if (AppState.authListenerRegistered) {
            console.log('App: checkAuthState() - Auth listener already registered, resolving.');
            return resolve();
        }

        authModule.onAuthStateChanged(firebaseAuth, async (user) => {
            console.log('App: onAuthStateChanged() - Auth state changed. User:', user ? user.email : 'null (signed out)');
            
            if (user) {
                AppState.currentUser = user;
                AppState.isAuthenticated = true;
                console.log('App: onAuthStateChanged() - User authenticated. Loading user data and schools...');
                
                try {
                    // Load user data from Firestore
                    console.log('App: onAuthStateChanged() - Loading user data...');
                    await loadUserData(user.uid);
                    console.log('App: onAuthStateChanged() - User data loaded.');
                    
                    // Load user's schools
                    console.log('App: onAuthStateChanged() - Loading user schools...');
                    await loadUserSchools();
                    console.log('App: onAuthStateChanged() - User schools loaded. Count:', AppState.userSchools.length);

                    // Automatically set current school to prevent race conditions
                    if (AppState.userSchools.length > 0) {
                        const preferredSchoolId = AppState.currentUserData?.schoolId;
                        const schoolExists = AppState.userSchools.some(s => s.id === preferredSchoolId);

                        if (preferredSchoolId && schoolExists) {
                            console.log(`App: onAuthStateChanged() - Setting current school to preferred ID: ${preferredSchoolId}`);
                            await setCurrentSchool(preferredSchoolId);
                        } else {
                            console.log('App: onAuthStateChanged() - No preferred school or invalid. Defaulting to first available school.');
                            // Default to the first school if no preference is set or is invalid
                            await setCurrentSchool(AppState.userSchools[0].id);
                        }
                    } else {
                        console.warn('App: onAuthStateChanged() - No schools found for user. AppState.currentSchool will be null.');
                        // Ensure current school is cleared if no schools found
                        AppState.currentSchool = null;
                        AppState.currentSchoolLevel = null;
                        AppState.currentAcademicLevel = null;
                        document.dispatchEvent(new CustomEvent('school:changed', {
                            detail: { school: null }
                        }));
                    }
                    console.log('App: onAuthStateChanged() - Current school status:', AppState.currentSchool ? AppState.currentSchool.name : 'None');
                    
                    localStorage.setItem('isAuthenticated', 'true');
                    
                    // Force navbar update with user info
                    updateNavbarUserInfo();
                    
                    document.dispatchEvent(new CustomEvent('auth:state-changed', {
                        detail: { 
                            isAuthenticated: true,
                            user: user,
                            userData: AppState.currentUserData
                        }
                    }));
                    console.log('App: onAuthStateChanged() - Dispatched auth:state-changed (authenticated).');

                    // Handle initial navigation now that data is loaded
                    const path = window.location.pathname;
                    const isNotInPages = !path.includes('/pages/');
                    if (isNotInPages) {
                        console.log('App: onAuthStateChanged() - Redirecting authenticated user from root to launch page.');
                        window.location.href = 'pages/launch/launch.html';
                    }
                    
                } catch (error) {
                    console.error('App: onAuthStateChanged() - Error during authenticated user setup:', error);
                    // --- FIX: Redirect on error to prevent getting stuck ---
                    showError('Failed to load your profile. Please try logging in again.', 'Loading Error');
                    // Give user time to see the error before redirecting
                    setTimeout(() => {
                        window.location.href = 'pages/auth/login.html';
                    }, 2000);
                }
            } else {
                AppState.clear(); // Use the clear method for a clean logout
                console.log('App: onAuthStateChanged() - User not authenticated.');
                
                document.dispatchEvent(new CustomEvent('auth:state-changed', {
                    detail: { isAuthenticated: false }
                }));
                console.log('App: onAuthStateChanged() - Dispatched auth:state-changed (unauthenticated).');
            }
            
            // This now resolves only AFTER the async logic for a user is complete.
            if (!initialAuthCheckDone) {
                initialAuthCheckDone = true;
                
                // Handle initial navigation for unauthenticated user from the root page
                const path = window.location.pathname;
                const isNotInPages = !path.includes('/pages/');
                if (!user && isNotInPages) {
                    console.log('App: onAuthStateChanged() - Redirecting unauthenticated user from root to launch page.');
                    window.location.href = 'pages/launch/launch.html';
                    return; // Stop execution to prevent handlePostAuthNavigation from overriding
                }
                
                resolve(); // Resolve the promise here, ensuring app initialization waits.
                console.log('App: onAuthStateChanged() - checkAuthState promise resolved.');
            }
            
            handlePostAuthNavigation(user);
        });
        
        AppState.authListenerRegistered = true;
    });
}

// Handle navigation after auth state change
function handlePostAuthNavigation(user) {
    const currentPage = window.location.pathname;
    const isAuthPage = currentPage.includes('login.html') || currentPage.includes('register.html');
    const isLaunchPage = currentPage.includes('launch.html');

    if (user && isAuthPage) {
        window.location.href = '../dashboard/dashboard.html';
    } else if (!user && !isAuthPage && !isLaunchPage) {
        const path = window.location.pathname;
        const isNotInPages = !path.includes('/pages/');

        if (isNotInPages) {
            // If not in pages directory (e.g. root or index.html), go to launch page
            window.location.href = 'pages/launch/launch.html';
        } else {
            // If inside pages directory but unauthorized, go to login
            window.location.href = '../auth/login.html';
        }
    }
}

// Update navbar with user info
function updateNavbarUserInfo() {
    // This function is disabled as user profile info is now handled by the user-info-card on the dashboard
    return;
}

// Load user data from Firestore
async function loadUserData(userId) {
    try {
        const userDocRef = firestoreModule.doc(firestoreDB, 'users', userId);
        const userDoc = await firestoreModule.getDoc(userDocRef);
        
        if (userDoc.exists()) {
            AppState.currentUserData = userDoc.data();
            console.log('User data loaded:', AppState.currentUserData);
        } else {
            // Create minimal user document if it doesn't exist (e.g., from interrupted registration)
            const userData = {
                name: AppState.currentUser.displayName || AppState.currentUser.email.split('@')[0],
                email: AppState.currentUser.email,
                createdAt: firestoreModule.serverTimestamp(),
                profileUrl: AppState.currentUser.photoURL || '', // Use auth profile photo as fallback
                role: 'teacher' // Default role
            };
            
            await firestoreModule.setDoc(userDocRef, userData);
            AppState.currentUserData = userData;
        }
        
        // Dispatch event for user data loaded
        document.dispatchEvent(new CustomEvent('user:loaded', {
            detail: { userData: AppState.currentUserData }
        }));
        
    } catch (error) {
        console.error('Error loading user data:', error);
        throw error;
    }
}

// Load user's schools
async function loadUserSchools() {
    if (!AppState.currentUser) return;
    
    try {
        AppState.userSchools = [];
        
        // Get all schools where user is in teachers array
        const schoolsQuery = firestoreModule.query(
            firestoreModule.collection(firestoreDB, 'schools'),
            firestoreModule.where('teachers', 'array-contains', AppState.currentUser.uid)
        );
        
        const querySnapshot = await firestoreModule.getDocs(schoolsQuery);
        
        querySnapshot.forEach(doc => {
            const schoolData = {
                id: doc.id,
                ...doc.data()
            };
            
            // Check if user is admin
            const isAdmin = schoolData.admins && schoolData.admins.includes(AppState.currentUser.uid);
            schoolData.userRole = isAdmin ? 'admin' : 'teacher';
            
            AppState.userSchools.push(schoolData);
        });
        
        console.log(`Loaded ${AppState.userSchools.length} schools for user`);
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('schools:loaded', {
            detail: { schools: AppState.userSchools }
        }));
        
    } catch (error) {
        console.error('Error loading user schools:', error);
    }
}

// Set current school
async function setCurrentSchool(schoolId) {
    try {
        const school = AppState.userSchools.find(s => s.id === schoolId);
        if (!school) {
            throw new Error('School not found in user schools');
        }
        
        AppState.currentSchool = school;
        AppState.currentSchoolLevel = school.level; // 'primary' or 'secondary'
        
        // Update user document with current school
        if (AppState.currentUser) {
            await firestoreModule.updateDoc(
                firestoreModule.doc(firestoreDB, 'users', AppState.currentUser.uid),
                {
                    schoolId: schoolId, // Use schoolId for consistency
                    role: school.userRole
                }
            );
        }
        
        // Update current user data
        if (AppState.currentUserData) {
            AppState.currentUserData.schoolId = schoolId;
            AppState.currentUserData.role = school.userRole;
        }
        
        console.log('Current school set:', school.name);
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('school:changed', {
            detail: { school: AppState.currentSchool }
        }));
        
        return true;
        
    } catch (error) {
        console.error('Error setting current school:', error);
        throw error;
    }
}

// Set academic level
function setAcademicLevel(level) {
    if (!AppState.currentSchool) {
        throw new Error('No current school selected');
    }
    
    const validLevels = AppState.currentSchoolLevel === 'primary' 
        ? ['lower-primary', 'upper-primary']
        : ['olevel', 'alevel'];
    
    if (!validLevels.includes(level)) {
        throw new Error(`Invalid academic level for ${AppState.currentSchoolLevel} school`);
    }
    
    AppState.currentAcademicLevel = level;
    
    console.log('Academic level set:', level);
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent('academic-level:changed', {
        detail: { level: AppState.currentAcademicLevel }
    }));
    
    return true;
}

// Define a constant for the base URL of your application
const BASE_URL = "/"; // Use root scope for the service worker

// Initialize PWA
function initializePWA() {
    // Check if app is installed
    checkIfAppInstalled();
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        AppState.isAppInstalled = true;
        localStorage.setItem('pwaInstalled', 'true');
        AppState.deferredPrompt = null;
        updatePWAButtonUI();
        showToast('App installed successfully!', 'success');
        
        // Try to open the app after installation
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('App is now running in standalone mode');
        } else {
            // If available, attempt to launch the app
            if (navigator.windowControlsOverlay && navigator.windowControlsOverlay.visible) {
                console.log('Running in window controls overlay mode');
            }
        }
    });
    
    // Check standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Running in standalone mode');
        AppState.isAppInstalled = true;
        updatePWAButtonUI();
    }
    
    // Register service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', { scope: BASE_URL })
                .then(registration => {
                    console.log('ServiceWorker registered:', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }
}

// Check if app is installed
function checkIfAppInstalled() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        AppState.isAppInstalled = true;
        localStorage.setItem('pwaInstalled', 'true');
        updatePWAButtonUI();
        return true;
    }

    if (localStorage.getItem('pwaInstalled') === 'true') {
        AppState.isAppInstalled = true;
        updatePWAButtonUI();
        return true;
    }
    
    return false;
}

// Update PWA Button UI
function updatePWAButtonUI() {
    const installAppBtn = document.getElementById('installAppBtn');
    const installBtn = document.getElementById('installBtn');

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

        // Update the launch page install button
        if (installAppBtn) {
                if (AppState.isAppInstalled || isStandalone) {
                        installAppBtn.textContent = 'Installed';
                        installAppBtn.disabled = true;
                        installAppBtn.classList.add('installed');
                } else if (AppState.installInProgress) {
                        installAppBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
                        installAppBtn.disabled = true;
                } else {
                        installAppBtn.innerHTML = '<i class="fas fa-download"></i> Install App';
                        installAppBtn.disabled = false;
                }
        }

        // Update any other install button by id (e.g., header/button elsewhere)
        if (installBtn) {
                if (AppState.isAppInstalled || isStandalone) {
                        installBtn.textContent = 'Installed';
                        installBtn.disabled = true;
                        installBtn.classList.add('installed');
                } else if (AppState.installInProgress) {
                        installBtn.textContent = 'Installing...';
                        installBtn.disabled = true;
                } else {
                        installBtn.textContent = 'Install App';
                        installBtn.disabled = false;
                }
        }
}
// Install PWA
async function installPWA() {
    const installBtn = document.getElementById('installAppBtn');
    
    try {
        // Update button state to "Installing..."
        if (installBtn) {
            installBtn.disabled = true;
            installBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
        }

        // If we have a deferred prompt, use it
        if (AppState.deferredPrompt) {
            AppState.deferredPrompt.prompt();
            const { outcome } = await AppState.deferredPrompt.userChoice;
            
            // The prompt is single-use, so clear it.
            AppState.deferredPrompt = null;

            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                // Don't do anything here. The 'appinstalled' event will fire and update the UI.
                // The button will remain in "Installing..." state until the app is fully installed.
            } else {
                console.log('User dismissed the install prompt');
                // If dismissed, update the UI to show the instructional button again.
                updatePWAButtonUI();
            }
        } else {
            // No deferred prompt available
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                showToast('To install: tap Share <i class="fas fa-share-square"></i> and select "Add to Home Screen"', 'info', 5000);
                updatePWAButtonUI();
            } else {
                showToast('To install: Look for the install icon in your browser address bar.', 'info');
                updatePWAButtonUI();
            }
        }
        
    } catch (error) {
        console.error('Error installing PWA:', error);
        showError('Error installing app. Please try again.');
        
        // Restore button on error
        updatePWAButtonUI();
    }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Subscribe user to push notifications
async function subscribeUserToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        showToast('Push notifications are not supported by your browser.', 'error');
        return;
    }

    try {
        const swRegistration = await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            showToast('Push notification permission denied.', 'warning');
            throw new Error('Permission not granted for Notification');
        }

        showLoading('Subscribing to notifications...');

        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        console.log('User is subscribed:', subscription);

        await saveSubscriptionToFirestore(subscription);
        showToast('Successfully subscribed to notifications!', 'success');

    } catch (error) {
        console.error('Failed to subscribe the user: ', error);
        showToast('Failed to subscribe to notifications.', 'error');
    } finally {
        hideLoading();
    }
}

async function saveSubscriptionToFirestore(subscription) {
    if (!AppState.currentUser) throw new Error('User not authenticated.');
    
    const userId = AppState.currentUser.uid;
    const subCollection = 'pushSubscriptions';
    
    // The subscription object needs to be converted to a plain JSON object to be stored
    await Firebase.db.setDoc(subCollection, userId, subscription.toJSON());
    console.log('Push subscription saved to Firestore.');
}

// Initialize offline detection
function initializeOfflineDetection() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    
    window.addEventListener('online', () => {
        if (offlineIndicator) offlineIndicator.classList.remove('active');
        showToast('You are back online', 'success');
    });
    
    window.addEventListener('offline', () => {
        if (offlineIndicator) offlineIndicator.classList.add('active');
        showToast('You are offline. Some features may not work.', 'warning');
    });
}

// Cache DOM elements
function cacheDOMElements() {
    // Cache modals
    DOM.modals = {
        loading: document.getElementById('loadingModal'),
        error: document.getElementById('errorModal'),
        confirm: document.getElementById('confirmModal'),
        levelSelect: document.getElementById('levelSelectModal')
    };
    
    // Cache alerts container
    DOM.alerts = {
        container: document.getElementById('alertsContainer')
    };
    
    // Cache main containers
    DOM.containers = {
        main: document.getElementById('mainContainer'),
        auth: document.getElementById('authContainer'),
        dashboard: document.getElementById('dashboardContainer'),
        school: document.getElementById('schoolContainer')
    };
}

// Navigation helper
function navigateTo(page, params = {}) {
    const pages = {
        'login': '../auth/login.html',
        'register': '../auth/register.html',
        'dashboard': '../dashboard/dashboard.html',
        'school': '../school/school.html',
        'marks': '../marks/marks.html',
        'reports': '../reports/reports.html',
        'analytics': '../analytics/analytics.html',
        'settings': '../settings/settings.html',
        'profile': '../profile/profile.html',
        'tutorials': '../marks/tutorials.html'
    };
    
    if (pages[page]) {
        let url = pages[page];
        
        // Add cache-busting parameter for school page to prevent caching issues
        if (page === 'school') {
            params._t = Date.now();
        }
        
        if (Object.keys(params).length > 0) {
            const queryParams = new URLSearchParams(params).toString();
            url += '?' + queryParams;
        }
        window.location.href = url;
    } else {
        console.error('Unknown page:', page);
    }
}

// Handle anchors using `data-page="..."` to navigate via `navigateTo` helper
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-page]');
    if (!link) return;
    e.preventDefault();
    const page = link.dataset.page;
    if (page) {
        navigateTo(page);
    }
});

// Show loading overlay
function showLoading(message = 'Loading...') {
    // Try UI loader first (dynamic)
    if (window.UI && typeof window.UI.showLoading === 'function') {
        window.UI.showLoading('global-loader', message);
    } else if (DOM.modals.loading) {
        const messageEl = DOM.modals.loading.querySelector('.loading-message');
        if (messageEl) messageEl.textContent = message;
        DOM.modals.loading.classList.add('active');
    }
}

// Hide loading overlay
function hideLoading() {
    // Try UI loader first
    if (window.UI && typeof window.UI.hideLoading === 'function') {
        window.UI.hideLoading('global-loader');
    }

    if (DOM.modals.loading) {
        DOM.modals.loading.classList.remove('active');
    }
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: var(--z-modal);
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, duration);
}

// Get toast icon based on type
function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Show error modal
function showError(message, title = 'Error') {
    if (DOM.modals.error) {
        const titleEl = DOM.modals.error.querySelector('.modal-title');
        const messageEl = DOM.modals.error.querySelector('.error-message');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        
        DOM.modals.error.classList.add('active');
    } else {
        alert(`${title}: ${message}`);
    }
}

// Confirm dialog
function showConfirm(message, title = 'Confirm', confirmText = 'Yes', cancelText = 'No') {
    return new Promise((resolve) => {
        if (DOM.modals.confirm) {
            const titleEl = DOM.modals.confirm.querySelector('.modal-title');
            const messageEl = DOM.modals.confirm.querySelector('.confirm-message');
            const confirmBtn = DOM.modals.confirm.querySelector('.confirm-btn');
            const cancelBtn = DOM.modals.confirm.querySelector('.cancel-btn');
            
            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;
            if (confirmBtn) confirmBtn.textContent = confirmText;
            if (cancelBtn) cancelBtn.textContent = cancelText;
            
            DOM.modals.confirm.classList.add('active');
            
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            const cleanup = () => {
                DOM.modals.confirm.classList.remove('active');
                confirmBtn?.removeEventListener('click', handleConfirm);
                cancelBtn?.removeEventListener('click', handleCancel);
            };
            
            confirmBtn?.addEventListener('click', handleConfirm);
            cancelBtn?.addEventListener('click', handleCancel);
        } else {
            const result = confirm(`${title}: ${message}`);
            resolve(result);
        }
    });
}

// Show level selection modal (for primary/secondary schools)
function showLevelSelection(schoolLevel) {
    return new Promise((resolve) => {
        if (DOM.modals.levelSelect && schoolLevel) {
            const modal = DOM.modals.levelSelect;
            const title = modal.querySelector('.modal-title');
            const levelsContainer = modal.querySelector('.levels-container');
            
            if (title) {
                title.textContent = schoolLevel === 'primary' 
                    ? 'Select Primary Level'
                    : 'Select Secondary Level';
            }
            
            if (levelsContainer) {
                const levels = schoolLevel === 'primary'
                    ? [
                        { id: 'lower-primary', name: 'Lower Primary', description: 'P1 - P3' },
                        { id: 'upper-primary', name: 'Upper Primary', description: 'P4 - P7' }
                    ]
                    : [
                        { id: 'olevel', name: 'O-Level', description: 'S1 - S4' },
                        { id: 'alevel', name: 'A-Level', description: 'S5 - S6' }
                    ];
                
                levelsContainer.innerHTML = levels.map(level => `
                    <div class="level-option" data-level="${level.id}">
                        <h4>${level.name}</h4>
                        <p>${level.description}</p>
                    </div>
                `).join('');
                
                // Add event listeners
                const levelOptions = levelsContainer.querySelectorAll('.level-option');
                levelOptions.forEach(option => {
                    option.addEventListener('click', () => {
                        const selectedLevel = option.dataset.level;
                        modal.classList.remove('active');
                        resolve(selectedLevel);
                    });
                });
            }
            
            modal.classList.add('active');
        } else {
            // Fallback to default level
            const defaultLevel = schoolLevel === 'primary' ? 'lower-primary' : 'olevel';
            resolve(defaultLevel);
        }
    });
}

// Format date
function formatDate(date, format = 'short') {
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
    }
    return d.toISOString().split('T')[0];
}

// Get initials from name
function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// Generate unique ID
function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate password strength
function validatePassword(password) {
    const minLength = 6;
    if (password.length < minLength) {
        return `Password must be at least ${minLength} characters`;
    }
    return null;
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
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
}

// Clear AppState (for logout)
AppState.clear = function() {
    this.currentUser = null;
    this.currentUserData = null;
    this.currentSchool = null;
    this.currentSchoolLevel = null;
    this.currentAcademicLevel = null;
    this.userSchools = [];
    this.isAuthenticated = false;
    localStorage.removeItem('isAuthenticated');
    
    // Dispatch events for UI cleanup
    document.dispatchEvent(new CustomEvent('auth:state-changed', {
        detail: { isAuthenticated: false }
    }));
};

// Function to hide the static loading container from index.html
function hideInitialLoadingScreen() {
    const initialLoader = document.querySelector('.loading-container');
    if (initialLoader) {
        initialLoader.style.opacity = '0';
        initialLoader.addEventListener('transitionend', () => initialLoader.remove());
        console.log('Initial loading screen hidden.');
    }
}

// Listen for the app to be initialized and hide the initial loading screen
document.addEventListener('app:initialized', hideInitialLoadingScreen);

// Export to window
window.AppState = AppState;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showToast = showToast;
window.showError = showError;
window.showConfirm = showConfirm;
window.navigateTo = navigateTo;
window.installPWA = installPWA;
window.subscribeUserToPush = subscribeUserToPush;
window.updatePWAButtonUI = updatePWAButtonUI;
window.showLevelSelection = showLevelSelection;
window.formatDate = formatDate;
window.getInitials = getInitials;
window.generateId = generateId;
window.validateEmail = validateEmail;
window.validatePassword = validatePassword;
window.updateNavbarUserInfo = updateNavbarUserInfo;
window.loadUserSchools = loadUserSchools;

// Listen for beforeinstallprompt event immediately to avoid missing it
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    AppState.deferredPrompt = e;
    AppState.isAppInstalled = false;
    localStorage.removeItem('pwaInstalled');
    
    if (typeof window.updatePWAButtonUI === 'function') {
        window.updatePWAButtonUI();
    }
    console.log('PWA install prompt available');
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);