class VaultService {
    port = null;
    masterKey = null;
    idleTimer = null;
    rateLimitState = { count: 0, windowStart: Date.now() };
    IDLE_TIMEOUT_MS = 10 * 60 * 1000;
    RATE_LIMIT_MAX = 100;
    RATE_LIMIT_WINDOW_MS = 60 * 1000;
    constructor() {
        this.setupMessageListener();
    }
    setupMessageListener() {
        addEventListener('message', (event) => {
            if (event.data && event.data.cmd === 'init') {
                this.handleInit(event);
            }
        });
    }
    handleInit(event) {
        const initMsg = event.data;
        if (initMsg.cmd !== 'init') {
            console.error('[Vault] Invalid init message');
            return;
        }
        const [port] = event.ports;
        if (!port) {
            console.error('[Vault] No MessagePort received');
            return;
        }
        this.port = port;
        this.port.onmessage = (e) => this.handlePortMessage(e);
        const ackMsg = { ok: true };
        this.port.postMessage(ackMsg);
        console.log('[Vault] Initialized and acknowledged');
    }
    async handlePortMessage(event) {
        if (!this.port) {
            console.error('[Vault] Port not available');
            return;
        }
        const request = event.data;
        let response;
        try {
            if (!this.checkRateLimit()) {
                const errorResponse = { id: request.id, error: 'locked' };
                this.port.postMessage(errorResponse);
                return;
            }
            this.resetIdleTimer();
            switch (request.cmd) {
                case 'derive':
                    response = await this.handleDerive(request);
                    break;
                case 'encrypt':
                    response = await this.handleEncrypt(request);
                    break;
                case 'decrypt':
                    response = await this.handleDecrypt(request);
                    break;
                default:
                    response = { id: request.id, error: 'unknown command' };
            }
        }
        catch (error) {
            console.error('[Vault] Error handling message:', error);
            response = {
                id: request.id,
                error: error instanceof Error ? error.message : 'unknown error'
            };
        }
        this.port.postMessage(response);
    }
    checkRateLimit() {
        const now = Date.now();
        if (now - this.rateLimitState.windowStart >= this.RATE_LIMIT_WINDOW_MS) {
            this.rateLimitState.count = 0;
            this.rateLimitState.windowStart = now;
        }
        if (this.rateLimitState.count >= this.RATE_LIMIT_MAX) {
            return false;
        }
        this.rateLimitState.count++;
        return true;
    }
    resetIdleTimer() {
        if (this.idleTimer !== null) {
            clearTimeout(this.idleTimer);
        }
        this.idleTimer = setTimeout(() => {
            console.log('[Vault] Idle timeout reached, clearing key');
            this.clearKey();
        }, this.IDLE_TIMEOUT_MS);
    }
    clearKey() {
        this.masterKey = null;
        console.log('[Vault] Master key cleared from memory');
    }
    async handleDerive(request) {
        try {
            await this.fetchAndUnwrapKey();
            return { id: request.id, ok: true };
        }
        catch (error) {
            console.error('[Vault] Key derivation failed:', error);
            return {
                id: request.id,
                error: error instanceof Error ? error.message : 'derivation failed'
            };
        }
    }
    async handleEncrypt(request) {
        if (!this.masterKey) {
            return { id: request.id, error: 'key not derived' };
        }
        try {
            const result = await this.aesEncrypt(this.masterKey, request.plain);
            return {
                id: request.id,
                ciphertext: result.ciphertext,
                iv: result.iv,
            };
        }
        catch (error) {
            console.error('[Vault] Encryption failed:', error);
            return {
                id: request.id,
                error: error instanceof Error ? error.message : 'encryption failed'
            };
        }
    }
    async handleDecrypt(request) {
        if (!this.masterKey) {
            return { id: request.id, error: 'key not derived' };
        }
        try {
            const plain = await this.aesDecrypt(this.masterKey, request.cipher, request.iv);
            return {
                id: request.id,
                plain,
            };
        }
        catch (error) {
            console.error('[Vault] Decryption failed:', error);
            return {
                id: request.id,
                error: error instanceof Error ? error.message : 'decryption failed'
            };
        }
    }
    async fetchAndUnwrapKey() {
        console.log('[Vault] Generating temporary AES key for testing');
        this.masterKey = await crypto.subtle.generateKey({
            name: "AES-GCM",
            length: 256,
        }, false, ["encrypt", "decrypt"]);
    }
    async aesEncrypt(key, plain) {
        if (key.algorithm.name !== "AES-GCM") {
            throw new Error("Key must be AES-GCM");
        }
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data);
        return { ciphertext, iv: iv.buffer };
    }
    async aesDecrypt(key, cipher, iv) {
        if (key.algorithm.name !== "AES-GCM") {
            throw new Error("Key must be AES-GCM");
        }
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, cipher);
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }
    async unwrapKey(wrapped, wrappingPriv) {
        if (wrappingPriv.algorithm.name !== "RSA-OAEP") {
            throw new Error("Unwrapping key must be RSA-OAEP");
        }
        return await crypto.subtle.unwrapKey("raw", wrapped, wrappingPriv, { name: "RSA-OAEP" }, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    }
    b64ToBuf(b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}
console.log('[Vault] Starting vault service');
new VaultService();
export {};
