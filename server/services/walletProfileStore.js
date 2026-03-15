const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "walletAccounts.json");

function ensureStore() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ wallets: {} }, null, 2));
    }
}

function readStore() {
    ensureStore();
    const raw = fs.readFileSync(DATA_FILE, "utf8");

    try {
        const parsed = JSON.parse(raw);
        if (!parsed.wallets || typeof parsed.wallets !== "object") {
            return { wallets: {} };
        }

        return parsed;
    } catch (error) {
        return { wallets: {} };
    }
}

function writeStore(store) {
    ensureStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function getWalletProfile(walletAddress) {
    const store = readStore();
    return store.wallets[walletAddress] || null;
}

function saveWalletProfile(walletAddress, profile) {
    const store = readStore();
    store.wallets[walletAddress] = {
        walletAddress,
        playerName: profile.playerName,
        characterId: profile.characterId,
        updatedAt: new Date().toISOString()
    };

    writeStore(store);
    return store.wallets[walletAddress];
}

module.exports = {
    DATA_FILE,
    getWalletProfile,
    saveWalletProfile
};
