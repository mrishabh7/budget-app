// ===== Cloud Sync Module =====
// Handles Firebase Auth and Firestore sync with encryption

const CloudSync = {
    user: null,
    hadSignedInUser: false,
    encryptionPassword: null,
    syncEnabled: false,
    lastSyncTime: null,

    // Initialize sync module
    async init() {
        if (!isFirebaseConfigured()) {
            console.log('Firebase not configured. Cloud sync disabled.');
            this.updateSyncUI('not-configured');
            return;
        }

        initializeFirebase();
        try {
            // Finish a redirect that was already in progress. New sign-ins use a popup.
            await auth.getRedirectResult();
        } catch (error) {
            console.error('Redirect sign-in error:', error);
            if (typeof showToast === 'function') showToast('Sign-in failed: ' + error.message);
        }
        this.setupAuthListener();
        this.updateSyncUI('signed-out');
    },

    // Listen for auth state changes
    setupAuthListener() {
        auth.onAuthStateChanged((user) => {
            this.user = user;
            if (user) {
                console.log('User signed in:', user.email);
                this.hadSignedInUser = true;
                this.updateSyncUI('signed-in');
                this.promptForPassword();
            } else {
                console.log('User signed out');
                this.encryptionPassword = null;
                this.syncEnabled = false;
                // The first callback is often a signed-out placeholder before
                // Firebase restores the session. Only forget the password after
                // a real user was present.
                if (this.hadSignedInUser) this.clearSessionPassword();
                this.hadSignedInUser = false;
                this.updateSyncUI('signed-out');
            }
        });
    },

    // Sign in with Google.
    // This site is on GitHub Pages, so the Firebase helper lives on another
    // domain. A full-page redirect cannot read that helper once the browser
    // partitions storage, which is why phones were coming back signed out.
    // The popup stays on this page and still works there.
    async signIn() {
        if (!isFirebaseConfigured()) {
            showToast('Firebase not configured. Check firebase-config.js');
            return;
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
        } catch (error) {
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
                showToast('The sign-in window was blocked. Allow popups for this site and try again.');
                return;
            }
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                return;
            }
            console.error('Sign-in error:', error);
            showToast('Sign-in failed: ' + error.message);
        }
    },

    readSessionPassword() {
        try {
            const key = typeof BudgetLogic !== 'undefined' ? BudgetLogic.SESSION_PASSWORD_KEY : 'budget_session_password';
            return sessionStorage.getItem(key) || '';
        } catch (error) {
            return '';
        }
    },

    rememberSessionPassword(password) {
        try {
            const key = typeof BudgetLogic !== 'undefined' ? BudgetLogic.SESSION_PASSWORD_KEY : 'budget_session_password';
            sessionStorage.setItem(key, password);
        } catch (error) {
            console.error('Could not remember encryption password for this tab:', error);
        }
    },

    clearSessionPassword() {
        try {
            const key = typeof BudgetLogic !== 'undefined' ? BudgetLogic.SESSION_PASSWORD_KEY : 'budget_session_password';
            sessionStorage.removeItem(key);
        } catch (error) {
            // sessionStorage can be blocked; sign-out still clears the in-memory password.
        }
    },

    // Sign out
    async signOut() {
        try {
            await auth.signOut();
            this.encryptionPassword = null;
            this.syncEnabled = false;
            this.clearSessionPassword();
            showToast('Signed out successfully');
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    },

    openPasswordModal() {
        const modal = document.getElementById('encryptionModal');
        const passwordInput = document.getElementById('encryptionPassword');
        const confirmInput = document.getElementById('encryptionPasswordConfirm');
        const confirmGroup = document.getElementById('encryptionConfirmGroup');
        if (passwordInput) passwordInput.value = '';
        if (confirmInput) confirmInput.value = '';
        if (confirmGroup) confirmGroup.hidden = false;
        if (modal) modal.classList.add('show');
        return { confirmGroup };
    },

    // Prompt for encryption password. Confirm field is only for a first-time setup.
    async promptForPassword() {
        const saved = this.readSessionPassword();
        if (saved && saved.length >= 6) {
            const unlocked = await this.setPassword(saved, { fromSession: true });
            if (unlocked) return;
            this.clearSessionPassword();
        }
        const { confirmGroup } = this.openPasswordModal();

        if (!this.user || typeof db === 'undefined' || !db) return;
        try {
            const budgetDoc = await db.collection('users').doc(this.user.uid)
                .collection('data').doc('budget').get();
            const hasData = budgetDoc.exists && !!budgetDoc.data().encryptedData;
            if (confirmGroup) confirmGroup.hidden = hasData;
        } catch (error) {
            console.error('Could not check cloud data:', error);
        }
    },

    // Set encryption password and start sync.
    // Existing cloud data is verified by decrypting it. A password hash is not stored.
    async setPassword(password, options) {
        const fromSession = !!(options && options.fromSession);
        if (!password || password.length < 6) {
            if (!fromSession) showToast('Password must be at least 6 characters');
            return false;
        }

        try {
            const userRef = db.collection('users').doc(this.user.uid);
            const budgetDoc = await userRef.collection('data').doc('budget').get();
            const hasData = budgetDoc.exists && !!budgetDoc.data().encryptedData;

            if (!hasData) {
                if (!fromSession) {
                    const confirmPassword = document.getElementById('encryptionPasswordConfirm')?.value || '';
                    if (password !== confirmPassword) {
                        showToast('Passwords do not match');
                        return false;
                    }
                }
                const userDoc = await userRef.get();
                if (!userDoc.exists) {
                    await userRef.set({
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                this.encryptionPassword = password;
            } else {
                this.encryptionPassword = password;
                try {
                    await this.pullFromCloud({ announce: false });
                } catch (error) {
                    this.encryptionPassword = null;
                    this.syncEnabled = false;
                    this.updateSyncUI('signed-in');
                    if (!fromSession) showToast('Wrong encryption password!');
                    return false;
                }
            }

            this.syncEnabled = true;
            this.rememberSessionPassword(password);
            this.closePasswordModal();
            this.updateSyncUI('synced');
            if (!fromSession) showToast('Cloud sync enabled!');
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
                    const raw = localStorage.getItem(key);
                    try {
                        allData[key] = JSON.parse(raw);
                    } catch (e) {
                        allData[key] = raw;
                    }
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
    async pullFromCloud({ announce = true } = {}) {
        if (!this.user || !this.encryptionPassword) {
            return null;
        }

        if (typeof cancelPendingSaves === 'function') cancelPendingSaves();
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
            if (!decryptedData || typeof decryptedData !== 'object' || Array.isArray(decryptedData)) {
                throw new Error('Cloud backup was not a budget snapshot');
            }

            // Cloud is the snapshot for saved months. Drop local months that
            // were deleted on another device. Settings keys stay unless the
            // snapshot itself overwrites them. An empty payload does not wipe
            // this device.
            const localKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                localKeys.push(localStorage.key(i));
            }
            if (typeof BudgetLogic !== 'undefined' && Object.keys(decryptedData).length > 0) {
                BudgetLogic.orphanMonthKeys(localKeys, decryptedData).forEach(key => {
                    localStorage.removeItem(key);
                });
            }

            Object.keys(decryptedData).forEach(key => {
                const value = decryptedData[key];
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            });

            if (typeof migrateStoredBudgets === 'function') migrateStoredBudgets();

            this.lastSyncTime = new Date();
            this.updateSyncUI('synced');

            // Reload the current view
            if (typeof tryLoadCurrentMonth === 'function') {
                loadCustomCategories();
                if (typeof migrateStoredBudgets === 'function') migrateStoredBudgets();
                generateInputFields();
                attachCategoryInputListeners();
                tryLoadCurrentMonth();
                updateHistoryList();
                if (typeof showFdOverlapBanner === 'function') showFdOverlapBanner();
            }

            if (announce) showToast('Data synced from cloud!');
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
        syncBtn.setAttribute('aria-label', syncBtn.textContent.replace(/\s+/g, ' ').trim());
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
