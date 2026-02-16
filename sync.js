// ===== Cloud Sync Module =====
// Handles Firebase Auth and Firestore sync with encryption

const CloudSync = {
    user: null,
    encryptionPassword: null,
    syncEnabled: false,
    lastSyncTime: null,

    // Initialize sync module
    init() {
        if (!isFirebaseConfigured()) {
            console.log('Firebase not configured. Cloud sync disabled.');
            this.updateSyncUI('not-configured');
            return;
        }

        initializeFirebase();
        this.setupAuthListener();
        this.updateSyncUI('signed-out');
    },

    // Listen for auth state changes
    setupAuthListener() {
        auth.onAuthStateChanged((user) => {
            this.user = user;
            if (user) {
                console.log('User signed in:', user.email);
                this.updateSyncUI('signed-in');
                this.promptForPassword();
            } else {
                console.log('User signed out');
                this.encryptionPassword = null;
                this.syncEnabled = false;
                this.updateSyncUI('signed-out');
            }
        });
    },

    // Sign in with Google
    async signIn() {
        if (!isFirebaseConfigured()) {
            showToast('Firebase not configured. Check firebase-config.js');
            return;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Sign-in error:', error);
            showToast('Sign-in failed: ' + error.message);
        }
    },

    // Sign out
    async signOut() {
        try {
            await auth.signOut();
            this.encryptionPassword = null;
            this.syncEnabled = false;
            showToast('Signed out successfully');
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    },

    // Prompt for encryption password
    promptForPassword() {
        const modal = document.getElementById('encryptionModal');
        if (modal) {
            modal.classList.add('show');
        }
    },

    // Set encryption password and start sync
    async setPassword(password, isNewPassword = false) {
        if (!password || password.length < 6) {
            showToast('Password must be at least 6 characters');
            return false;
        }

        this.encryptionPassword = password;
        const passwordHash = await CryptoUtils.hashPassword(password);

        // Check if user has existing data with this password
        try {
            const userDoc = await db.collection('users').doc(this.user.uid).get();

            if (userDoc.exists) {
                const data = userDoc.data();
                if (data.passwordHash && data.passwordHash !== passwordHash) {
                    showToast('Wrong encryption password!');
                    this.encryptionPassword = null;
                    return false;
                }
                // Password matches, sync data
                await this.pullFromCloud();
            } else if (isNewPassword) {
                // New user, save password hash
                await db.collection('users').doc(this.user.uid).set({
                    passwordHash: passwordHash,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            this.syncEnabled = true;
            this.closePasswordModal();
            this.updateSyncUI('synced');
            showToast('Cloud sync enabled!');
            return true;
        } catch (error) {
            console.error('Password verification error:', error);
            showToast('Error: ' + error.message);
            return false;
        }
    },

    // Close password modal
    closePasswordModal() {
        const modal = document.getElementById('encryptionModal');
        if (modal) {
            modal.classList.remove('show');
        }
    },

    // Push data to cloud
    async pushToCloud() {
        if (!this.syncEnabled || !this.user || !this.encryptionPassword) {
            return;
        }

        this.updateSyncUI('syncing');

        try {
            // Get all budget data from localStorage
            const allData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(STORAGE_PREFIX)) {
                    allData[key] = JSON.parse(localStorage.getItem(key));
                }
            }

            // Include custom categories
            const customCategories = localStorage.getItem('budget_custom_categories');
            if (customCategories) {
                allData['budget_custom_categories'] = JSON.parse(customCategories);
            }

            // Encrypt the data
            const encryptedData = await CryptoUtils.encrypt(allData, this.encryptionPassword);

            // Save to Firestore
            await db.collection('users').doc(this.user.uid).collection('data').doc('budget').set({
                encryptedData: encryptedData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.lastSyncTime = new Date();
            this.updateSyncUI('synced');
            console.log('Data synced to cloud');
        } catch (error) {
            console.error('Push to cloud failed:', error);
            this.updateSyncUI('error');
            showToast('Sync failed: ' + error.message);
        }
    },

    // Pull data from cloud
    async pullFromCloud() {
        if (!this.user || !this.encryptionPassword) {
            return null;
        }

        this.updateSyncUI('syncing');

        try {
            const doc = await db.collection('users').doc(this.user.uid)
                .collection('data').doc('budget').get();

            if (!doc.exists) {
                console.log('No cloud data found');
                this.updateSyncUI('synced');
                return null;
            }

            const { encryptedData } = doc.data();
            const decryptedData = await CryptoUtils.decrypt(encryptedData, this.encryptionPassword);

            // Restore to localStorage
            Object.keys(decryptedData).forEach(key => {
                if (key === 'budget_custom_categories') {
                    localStorage.setItem(key, JSON.stringify(decryptedData[key]));
                } else {
                    localStorage.setItem(key, JSON.stringify(decryptedData[key]));
                }
            });

            this.lastSyncTime = new Date();
            this.updateSyncUI('synced');

            // Reload the current view
            if (typeof tryLoadCurrentMonth === 'function') {
                loadCustomCategories();
                generateInputFields();
                attachCategoryInputListeners();
                tryLoadCurrentMonth();
                updateHistoryList();
            }

            showToast('Data synced from cloud!');
            return decryptedData;
        } catch (error) {
            console.error('Pull from cloud failed:', error);
            this.updateSyncUI('error');
            throw error;
        }
    },

    // Update sync UI
    updateSyncUI(status) {
        const syncBtn = document.getElementById('syncBtn');
        const syncStatus = document.getElementById('syncStatus');
        const userInfo = document.getElementById('userInfo');

        if (!syncBtn) return;

        switch (status) {
            case 'not-configured':
                syncBtn.innerHTML = '☁️ Setup Cloud';
                syncBtn.onclick = () => showToast('Configure Firebase in firebase-config.js');
                syncStatus.textContent = 'Not configured';
                syncStatus.className = 'sync-status offline';
                break;
            case 'signed-out':
                syncBtn.innerHTML = '☁️ Sign In';
                syncBtn.onclick = () => this.signIn();
                syncStatus.textContent = 'Offline';
                syncStatus.className = 'sync-status offline';
                userInfo.textContent = '';
                break;
            case 'signed-in':
                syncBtn.innerHTML = '🔐 Enter Password';
                syncBtn.onclick = () => this.promptForPassword();
                syncStatus.textContent = 'Need password';
                syncStatus.className = 'sync-status warning';
                userInfo.textContent = this.user?.email || '';
                break;
            case 'syncing':
                syncBtn.innerHTML = '🔄 Syncing...';
                syncStatus.textContent = 'Syncing...';
                syncStatus.className = 'sync-status syncing';
                break;
            case 'synced':
                syncBtn.innerHTML = '☁️ Synced';
                syncBtn.onclick = () => this.showSyncMenu();
                syncStatus.textContent = 'Synced';
                syncStatus.className = 'sync-status online';
                userInfo.textContent = this.user?.email || '';
                break;
            case 'error':
                syncBtn.innerHTML = '⚠️ Sync Error';
                syncBtn.onclick = () => this.pushToCloud();
                syncStatus.textContent = 'Error';
                syncStatus.className = 'sync-status error';
                break;
        }
    },

    // Show sync menu
    showSyncMenu() {
        const action = confirm('Cloud Sync Options:\n\nOK = Sync Now\nCancel = Sign Out');
        if (action) {
            this.pushToCloud();
        } else {
            if (confirm('Are you sure you want to sign out?')) {
                this.signOut();
            }
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    CloudSync.init();
});
