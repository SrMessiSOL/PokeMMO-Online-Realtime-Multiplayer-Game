const express = require("express");
const { getWalletProfile, saveWalletProfile, saveWalletGameState } = require("../services/walletProfileStore");

const router = express.Router();

const ALLOWED_CHARACTERS = new Set([
    "bob",
    "misa",
    "boss",
    "knight",
    "nurse",
    "professor",
    "femaletrainer",
    "ninja"
]);

router.get("/wallets/:address", (req, res) => {
    const address = String(req.params.address || "").trim();
    if (!address) {
        return res.status(400).json({ error: "Wallet address is required." });
    }

    const profile = getWalletProfile(address);
    return res.json({ profile });
});

router.post("/wallets/:address/character", (req, res) => {
    const address = String(req.params.address || "").trim();
    const playerName = String(req.body?.playerName || "").trim();
    const characterId = String(req.body?.characterId || "").trim();

    if (!address) {
        return res.status(400).json({ error: "Wallet address is required." });
    }

    if (!playerName || playerName.length < 2 || playerName.length > 16) {
        return res.status(400).json({ error: "Player name must be between 2 and 16 characters." });
    }

    if (!ALLOWED_CHARACTERS.has(characterId)) {
        return res.status(400).json({ error: "Invalid character selection." });
    }

    const profile = saveWalletProfile(address, { playerName, characterId });
    return res.status(201).json({ profile });
});

router.put("/wallets/:address/state", (req, res) => {
    const address = String(req.params.address || "").trim();
    const gameState = req.body?.gameState;

    if (!address) {
        return res.status(400).json({ error: "Wallet address is required." });
    }

    if (!gameState || typeof gameState !== "object") {
        return res.status(400).json({ error: "A valid gameState payload is required." });
    }

    const profile = saveWalletGameState(address, gameState);
    return res.status(200).json({ profile });
});

module.exports = router;
