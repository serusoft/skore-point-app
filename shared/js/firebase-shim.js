(async function(){
    try {
        const authMod = await import('../../firebase/auth.js');
        const dbMod = await import('../../firebase/db.js');

        const FirebaseAuth = authMod.default;
        const FirebaseDB = dbMod.default;

        // Initialize auth and db
        await FirebaseAuth.init();
        await FirebaseDB.init();

        const authShim = {
            async signInWithEmailAndPassword(email, password) {
                const res = await FirebaseAuth.signIn(email, password);
                if (res && res.success) return { user: res.user };
                const err = (res && res.error) ? { code: res.error.code || 'auth/error', message: res.error } : { code: 'auth/error', message: res.error || 'Authentication failed' };
                throw err;
            },
            async createUserWithEmailAndPassword(email, password) {
                const res = await FirebaseAuth.register(email, password);
                if (res && res.success) return { user: res.user };
                const err = (res && res.error) ? { code: res.error.code || 'auth/error', message: res.error } : { code: 'auth/error', message: res.error || 'Registration failed' };
                throw err;
            },
            async sendPasswordResetEmail(email) {
                const res = await FirebaseAuth.sendPasswordResetEmail(email);
                if (res && res.success) return res;
                const err = (res && res.error) ? { code: res.error.code || 'auth/error', message: res.error } : { code: 'auth/error', message: res.error || 'Password reset failed' };
                throw err;
            },
            async signOut() {
                return FirebaseAuth.signOut();
            },
            async updateProfile(user, data) {
                return FirebaseAuth.updateProfile(data.displayName, data.photoURL);
            },
            onAuthStateChanged(cb) {
                return FirebaseAuth.onAuthStateChanged(cb);
            }
        };

        const dbShim = {
            serverTimestamp() {
                try {
                    return FirebaseDB.getFirestoreModule().serverTimestamp();
                } catch (e) {
                    // Fallback: return Date for simple uses
                    return new Date();
                }
            },
            async setDoc(collectionName, docId, data, merge = false) {
                return FirebaseDB.setDoc(collectionName, docId, data, merge);
            },
            async addDoc(collectionName, data) {
                return FirebaseDB.addDoc(collectionName, data);
            },
            async getDoc(collectionName, docId) {
                return FirebaseDB.getDoc(collectionName, docId);
            },
            async deleteDoc(collectionName, docId) {
                return FirebaseDB.deleteDoc(collectionName, docId);
            },
            async query(collectionName, queryConstraints = []) {
                return FirebaseDB.queryCollection(collectionName, queryConstraints);
            },
            onSnapshot(collectionName, cb, queryConstraints = []) {
                return FirebaseDB.onSnapshot(collectionName, cb, queryConstraints);
            }
        };

        window.Firebase = { auth: authShim, db: dbShim };
        console.log('Firebase shim loaded (auth + db)');
    } catch (e) {
        console.error('Firebase shim failed to load', e);
    }
})();
