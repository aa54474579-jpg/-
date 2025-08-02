// Firebase v9+ modular
// أضف بيانات مشروعك من Firebase Console
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJlkIJzJWkBzDI6vRf9mB5Wvf6M0bwkcM",
  authDomain: "qwwr332-8b924.firebaseapp.com",
  projectId: "qwwr332-8b924",
  storageBucket: "qwwr332-8b924.firebasestorage.app",
  messagingSenderId: "305800551847",
  appId: "1:305800551847:web:ad75c29b629ebbb8986a82"
};

let app, auth, db;
let retryCount = 0;
const MAX_RETRIES = 3;

async function initializeFirebase() {
    try {
        if (!app) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
        }

        // إضافة معالجة الأخطاء للـ Firestore
        db.enablePersistence({ synchronizeTabs: true })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code === 'unimplemented') {
                    console.warn('The current browser does not support persistence.');
                }
            });

        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, 
                (user) => {
                    unsubscribe();
                    console.log("Firebase initialized successfully");
                    resolve(true);
                },
                (error) => {
                    unsubscribe();
                    console.error("Firebase auth error:", error);
                    reject(error);
                }
            );
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
        
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retrying initialization (${retryCount}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            return initializeFirebase();
        }
        
        throw error;
    }
}

// Initialize Firebase and export only after initialization is complete
const initialized = initializeFirebase().catch(console.error);

export { app, auth, db, initialized };
