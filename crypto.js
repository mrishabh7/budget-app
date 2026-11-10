// ===== Client-Side Encryption Module =====
// Uses Web Crypto API for AES-256-GCM encryption
// Password never leaves the browser

const PBKDF2_ITERATIONS = 600000;
const LEGACY_PBKDF2_ITERATIONS = 100000;

function activePbkdf2Iterations() {
    if (typeof BudgetLogic !== 'undefined' && BudgetLogic.PBKDF2_ITERATIONS) {
        return BudgetLogic.PBKDF2_ITERATIONS;
    }
    return PBKDF2_ITERATIONS;
}

function legacyPbkdf2Iterations() {
    if (typeof BudgetLogic !== 'undefined' && BudgetLogic.LEGACY_PBKDF2_ITERATIONS) {
        return BudgetLogic.LEGACY_PBKDF2_ITERATIONS;
    }
    return LEGACY_PBKDF2_ITERATIONS;
}

const CryptoUtils = {
    // Derive a key from password using PBKDF2
    async deriveKey(password, salt, iterations) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: iterations || legacyPbkdf2Iterations(),
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    generateSalt() {
        return crypto.getRandomValues(new Uint8Array(16));
    },

    generateIV() {
        return crypto.getRandomValues(new Uint8Array(12));
    },

    bytesToBase64(bytes) {
        const chunkSize = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    },

    async encryptRaw(data, password, iterations) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        const salt = this.generateSalt();
        const iv = this.generateIV();
        const key = await this.deriveKey(password, salt, iterations);

        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataBuffer
        );

        const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
        return this.bytesToBase64(combined);
    },

    // New payloads record the iteration count. Older payloads stay raw base64
    // and decrypt with the original 100,000 iterations.
    async encrypt(data, password) {
        const iterations = activePbkdf2Iterations();
        const payload = await this.encryptRaw(data, password, iterations);
        return JSON.stringify({ v: 2, iterations, data: payload });
    },

    async encryptLegacy(data, password) {
        return this.encryptRaw(data, password, legacyPbkdf2Iterations());
    },

    async decrypt(encryptedBase64, password) {
        try {
            let payload = encryptedBase64;
            let iterations = legacyPbkdf2Iterations();
            if (typeof encryptedBase64 === 'string' && encryptedBase64.trim().startsWith('{')) {
                const envelope = JSON.parse(encryptedBase64);
                payload = envelope.data;
                iterations = envelope.iterations || activePbkdf2Iterations();
            }

            const combined = new Uint8Array(
                atob(payload).split('').map(c => c.charCodeAt(0))
            );

            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encryptedData = combined.slice(28);
            const key = await this.deriveKey(password, salt, iterations);

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
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CryptoUtils, PBKDF2_ITERATIONS, LEGACY_PBKDF2_ITERATIONS };
}
