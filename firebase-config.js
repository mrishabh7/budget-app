// ===== Firebase Configuration =====
// Replace these values with your Firebase project config
// Get this from: Firebase Console > Project Settings > Your apps > Web app

const firebaseConfig = {
    apiKey: "__FIREBASE_API_KEY__",
    authDomain: "__FIREBASE_AUTH_DOMAIN__",
    projectId: "__FIREBASE_PROJECT_ID__",
    storageBucket: "__FIREBASE_STORAGE_BUCKET__",
    messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
    appId: "__FIREBASE_APP_ID__"
};

// Initialize Firebase
let app, auth, db;

function initializeFirebase() {
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// Check if Firebase is configured (returns true when real config is present)
function isFirebaseConfigured() {
    const apiKey = firebaseConfig.apiKey;
    return apiKey && apiKey.length > 10 && !apiKey.startsWith('__');
}
