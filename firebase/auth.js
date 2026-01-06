// Firebase Authentication Module
// Handles Firebase Auth initialization and authentication methods

import firebaseConfig from './config.js';

let authInstance = null;
let authModule = null;

const FirebaseAuth = {
    // Initialize Firebase Auth
    async init() {
        if (authInstance) return authInstance;
        
        try {
            // Dynamically import Firebase Auth module
            authModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
            
            // Import app module
            const appModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
            
            // Initialize Firebase app
            const firebaseApp = appModule.initializeApp(firebaseConfig);
            authInstance = authModule.getAuth(firebaseApp);
            
            console.log('Firebase Auth initialized successfully');
            return authInstance;
            
        } catch (error) {
            console.error('Error initializing Firebase Auth:', error);
            throw error;
        }
    },
    
    // Get auth instance
    getAuth() {
        if (!authInstance) {
            throw new Error('Firebase Auth not initialized. Call init() first.');
        }
        return authInstance;
    },
    
    // Get auth module
    getAuthModule() {
        if (!authModule) {
            throw new Error('Firebase Auth module not loaded. Call init() first.');
        }
        return authModule;
    },
    
    // Check if user is authenticated
    isAuthenticated() {
        const user = this.getCurrentUser();
        return user !== null;
    },
    
    // Get current user
    getCurrentUser() {
        try {
            const auth = this.getAuth();
            return auth.currentUser;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },
    
    // Sign in with email and password
    async signIn(email, password) {
        try {
            const auth = this.getAuth();
            const authModule = this.getAuthModule();
            
            const userCredential = await authModule.signInWithEmailAndPassword(auth, email, password);
            return {
                success: true,
                user: userCredential.user
            };
            
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Register new user
    async register(email, password, displayName = null) {
        try {
            const auth = this.getAuth();
            const authModule = this.getAuthModule();
            
            const userCredential = await authModule.createUserWithEmailAndPassword(auth, email, password);
            
            // Update display name if provided
            if (displayName && userCredential.user) {
                await authModule.updateProfile(userCredential.user, {
                    displayName: displayName
                });
            }
            
            return {
                success: true,
                user: userCredential.user
            };
            
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Sign out
    async signOut() {
        try {
            const auth = this.getAuth();
            const authModule = this.getAuthModule();
            
            await authModule.signOut(auth);
            return { success: true };
            
        } catch (error) {
            console.error('Sign out error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Send password reset email
    async sendPasswordResetEmail(email) {
        try {
            const auth = this.getAuth();
            const authModule = this.getAuthModule();
            
            await authModule.sendPasswordResetEmail(auth, email);
            return { success: true };
            
        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Update user profile
    async updateProfile(displayName, photoURL) {
        try {
            const auth = this.getAuth();
            const authModule = this.getAuthModule();
            const user = auth.currentUser;
            
            if (!user) {
                return { success: false, error: 'No user logged in' };
            }
            
            await authModule.updateProfile(user, {
                displayName: displayName,
                photoURL: photoURL
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Update profile error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Get error message from Firebase error
    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/user-disabled':
                return 'This account has been disabled';
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/email-already-in-use':
                return 'Email is already registered';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/operation-not-allowed':
                return 'Email/password accounts are not enabled';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please try again later';
            default:
                return error.message || 'Authentication failed';
        }
    },
    
    // Listen to auth state changes
    onAuthStateChanged(callback) {
        try {
            const auth = this.getAuth();
            const authModule = this.getAuthModule();
            
            return authModule.onAuthStateChanged(auth, callback);
            
        } catch (error) {
            console.error('Error setting up auth state listener:', error);
            return () => {};
        }
    }
};

export default FirebaseAuth;