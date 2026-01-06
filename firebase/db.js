// Firebase Database Module
// Handles Firestore database operations

import firebaseConfig from './config.js';

let dbInstance = null;
let firestoreModule = null;

const FirebaseDB = {
    // Initialize Firestore
    async init() {
        if (dbInstance) return dbInstance;
        
        try {
            // Dynamically import Firebase modules
            firestoreModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
            const appModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
            
            // Initialize Firebase app
            const firebaseApp = appModule.initializeApp(firebaseConfig);
            dbInstance = firestoreModule.getFirestore(firebaseApp);
            
            console.log('Firebase Firestore initialized successfully');
            return dbInstance;
            
        } catch (error) {
            console.error('Error initializing Firestore:', error);
            throw error;
        }
    },
    
    // Get Firestore instance
    getDB() {
        if (!dbInstance) {
            throw new Error('Firestore not initialized. Call init() first.');
        }
        return dbInstance;
    },
    
    // Get Firestore module
    getFirestoreModule() {
        if (!firestoreModule) {
            throw new Error('Firestore module not loaded. Call init() first.');
        }
        return firestoreModule;
    },
    
    // Collection reference helper
    collection(collectionName) {
        const db = this.getDB();
        const fs = this.getFirestoreModule();
        return fs.collection(db, collectionName);
    },
    
    // Document reference helper
    doc(collectionName, docId) {
        const db = this.getDB();
        const fs = this.getFirestoreModule();
        return fs.doc(db, collectionName, docId);
    },
    
    // Add document
    async addDoc(collectionName, data) {
        try {
            const fs = this.getFirestoreModule();
            const collectionRef = this.collection(collectionName);
            
            const docRef = await fs.addDoc(collectionRef, {
                ...data,
                createdAt: fs.serverTimestamp(),
                updatedAt: fs.serverTimestamp()
            });
            
            return {
                success: true,
                id: docRef.id,
                ref: docRef
            };
            
        } catch (error) {
            console.error('Error adding document:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Get document
    async getDoc(collectionName, docId) {
        try {
            const fs = this.getFirestoreModule();
            const docRef = this.doc(collectionName, docId);
            
            const docSnap = await fs.getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    success: true,
                    id: docSnap.id,
                    data: docSnap.data(),
                    exists: true
                };
            } else {
                return {
                    success: true,
                    exists: false
                };
            }
            
        } catch (error) {
            console.error('Error getting document:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Update document
    async updateDoc(collectionName, docId, data) {
        try {
            const fs = this.getFirestoreModule();
            const docRef = this.doc(collectionName, docId);
            
            await fs.updateDoc(docRef, {
                ...data,
                updatedAt: fs.serverTimestamp()
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Error updating document:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Set document (overwrite)
    async setDoc(collectionName, docId, data, merge = false) {
        try {
            const fs = this.getFirestoreModule();
            const docRef = this.doc(collectionName, docId);
            
            await fs.setDoc(docRef, {
                ...data,
                createdAt: data.createdAt || fs.serverTimestamp(),
                updatedAt: fs.serverTimestamp()
            }, { merge });
            
            return { success: true };
            
        } catch (error) {
            console.error('Error setting document:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Delete document
    async deleteDoc(collectionName, docId) {
        try {
            const fs = this.getFirestoreModule();
            const docRef = this.doc(collectionName, docId);
            
            await fs.deleteDoc(docRef);
            return { success: true };
            
        } catch (error) {
            console.error('Error deleting document:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Query collection
    async queryCollection(collectionName, queryConstraints = []) {
        try {
            const fs = this.getFirestoreModule();
            const collectionRef = this.collection(collectionName);
            
            let query = fs.query(collectionRef);
            
            // Apply query constraints
            queryConstraints.forEach(constraint => {
                query = fs.query(query, ...constraint);
            });
            
            const querySnapshot = await fs.getDocs(query);
            const results = [];
            
            querySnapshot.forEach(doc => {
                results.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return {
                success: true,
                data: results,
                size: querySnapshot.size
            };
            
        } catch (error) {
            console.error('Error querying collection:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Listen to real-time updates
    onSnapshot(collectionName, callback, queryConstraints = []) {
        try {
            const fs = this.getFirestoreModule();
            const collectionRef = this.collection(collectionName);
            
            let query = fs.query(collectionRef);
            
            // Apply query constraints
            queryConstraints.forEach(constraint => {
                query = fs.query(query, ...constraint);
            });
            
            return fs.onSnapshot(query, (snapshot) => {
                const results = [];
                snapshot.forEach(doc => {
                    results.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                callback(results);
            });
            
        } catch (error) {
            console.error('Error setting up snapshot listener:', error);
            return () => {};
        }
    },
    
    // Batch write operations
    async batchWrite(operations) {
        try {
            const fs = this.getFirestoreModule();
            const db = this.getDB();
            const batch = fs.writeBatch(db);
            
            operations.forEach(op => {
                if (op.type === 'set') {
                    const docRef = this.doc(op.collection, op.id);
                    batch.set(docRef, op.data, op.options || {});
                } else if (op.type === 'update') {
                    const docRef = this.doc(op.collection, op.id);
                    batch.update(docRef, op.data);
                } else if (op.type === 'delete') {
                    const docRef = this.doc(op.collection, op.id);
                    batch.delete(docRef);
                }
            });
            
            await batch.commit();
            return { success: true };
            
        } catch (error) {
            console.error('Error in batch write:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    },
    
    // Get error message from Firestore error
    getErrorMessage(error) {
        if (error.code === 'permission-denied') {
            return 'Permission denied. You may not have access to this data.';
        } else if (error.code === 'not-found') {
            return 'Document not found.';
        } else if (error.code === 'already-exists') {
            return 'Document already exists.';
        } else if (error.code === 'unavailable') {
            return 'Service unavailable. Please check your connection.';
        }
        return error.message || 'Database operation failed';
    }
};

export default FirebaseDB;