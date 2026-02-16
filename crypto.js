// ===== Client-Side Encryption Module =====
// Uses Web Crypto API for AES-256-GCM encryption
// Password never leaves the browser

const CryptoUtils = {
    // Derive a key from password using PBKDF2
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // Derive AES key using PBKDF2
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    // Generate a random salt
    generateSalt() {
        return crypto.getRandomValues(new Uint8Array(16));
    },

    // Generate a random IV for AES-GCM
    generateIV() {
        return crypto.getRandomValues(new Uint8Array(12));
    },

    // Encrypt data with password
    async encrypt(data, password) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));

        const salt = this.generateSalt();
        const iv = this.generateIV();
        const key = await this.deriveKey(password, salt);

        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataBuffer
        );

        // Combine salt + iv + encrypted data
        const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

        // Return as base64 string for storage
        return btoa(String.fromCharCode(...combined));
    },

    // Decrypt data with password
    async decrypt(encryptedBase64, password) {
        try {
            // Decode base64
            const combined = new Uint8Array(
                atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
            );

            // Extract salt, iv, and encrypted data
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encryptedData = combined.slice(28);

            const key = await this.deriveKey(password, salt);

            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encryptedData
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decryptedBuffer));
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Decryption failed. Wrong password?');
        }
    },

    // Hash password for verification (not for encryption)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + '_budget_app_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};
