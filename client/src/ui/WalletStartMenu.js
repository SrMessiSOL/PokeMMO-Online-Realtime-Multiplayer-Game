import { DEFAULT_CHARACTER_ID, PLAYER_CHARACTER_OPTIONS } from "../constants/playerCharacters";
import { getWalletProfile, saveWalletCharacter } from "../api/wallets";

const SUPPORTED_WALLETS = [
    { id: "phantom", label: "Connect Phantom", providerKey: "solana" },
    { id: "solflare", label: "Connect Solflare", providerKey: "solflare" }
];

export default class WalletStartMenu {
    constructor(onReady) {
        this.onReady = onReady;
        this.createLayout();
    }

    createLayout() {
        this.root = document.createElement("div");
        this.root.className = "wallet-start-menu";
        this.root.innerHTML = `
            <div class="wallet-card">
                <h2>Start Menu</h2>
                <p class="wallet-subtitle">Connect Phantom or Solflare to enter the world.</p>
                <div class="wallet-actions"></div>
                <p class="wallet-status" id="wallet-status">Wallet not connected.</p>
                <div class="character-form hidden" id="character-form">
                    <label>Name</label>
                    <input type="text" id="player-name" maxlength="16" placeholder="Your trainer name" />
                    <label>Character</label>
                    <div class="character-grid" id="character-grid"></div>
                    <button id="save-character">Save Character</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.root);

        this.statusEl = this.root.querySelector("#wallet-status");
        this.characterFormEl = this.root.querySelector("#character-form");
        this.playerNameEl = this.root.querySelector("#player-name");
        this.characterGridEl = this.root.querySelector("#character-grid");
        this.saveCharacterButton = this.root.querySelector("#save-character");
        this.walletActionsEl = this.root.querySelector(".wallet-actions");

        this.selectedCharacterId = DEFAULT_CHARACTER_ID;
        this.walletAddress = null;

        this.renderWalletButtons();
        this.renderCharacterOptions();

        this.saveCharacterButton.addEventListener("click", () => this.handleSaveCharacter());
    }

    renderWalletButtons() {
        SUPPORTED_WALLETS.forEach((wallet) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = wallet.label;
            button.addEventListener("click", () => this.connectWallet(wallet));
            this.walletActionsEl.appendChild(button);
        });
    }

    renderCharacterOptions() {
        this.characterGridEl.innerHTML = "";
        PLAYER_CHARACTER_OPTIONS.forEach((character) => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "character-option";
            option.dataset.characterId = character.id;
            option.innerHTML = `<strong>${character.label}</strong><span>${character.id}</span>`;

            if (character.id === this.selectedCharacterId) {
                option.classList.add("selected");
            }

            option.addEventListener("click", () => {
                this.selectedCharacterId = character.id;
                this.renderCharacterOptions();
            });

            this.characterGridEl.appendChild(option);
        });
    }

    async connectWallet(wallet) {
        try {
            const provider = this.resolveProvider(wallet.providerKey);
            if (!provider) {
                throw new Error(`${wallet.label} is not installed in this browser.`);
            }

            const response = await provider.connect();
            const publicKey = response?.publicKey || provider.publicKey;
            this.walletAddress = publicKey?.toString();

            if (!this.walletAddress) {
                throw new Error("Wallet address not available.");
            }

            this.statusEl.textContent = `Connected wallet: ${this.walletAddress}`;

            const { profile } = await getWalletProfile(this.walletAddress);
            if (profile) {
                this.statusEl.textContent = `Welcome back ${profile.playerName} (${profile.characterId})`;
                this.finish(profile);
                return;
            }

            this.characterFormEl.classList.remove("hidden");
            this.statusEl.textContent = "No character found. Create your character to enter the map.";
        } catch (error) {
            this.statusEl.textContent = error.message || "Wallet connection failed.";
        }
    }

    resolveProvider(providerKey) {
        if (!window || !window[providerKey]) {
            return null;
        }

        return window[providerKey];
    }

    async handleSaveCharacter() {
        if (!this.walletAddress) {
            this.statusEl.textContent = "Connect wallet first.";
            return;
        }

        const playerName = this.playerNameEl.value.trim();
        if (playerName.length < 2) {
            this.statusEl.textContent = "Name must be at least 2 characters.";
            return;
        }

        try {
            const { profile } = await saveWalletCharacter(this.walletAddress, {
                playerName,
                characterId: this.selectedCharacterId
            });

            this.finish(profile);
        } catch (error) {
            this.statusEl.textContent = error.message || "Unable to save character.";
        }
    }

    finish(profile) {
        this.destroy();
        this.onReady(profile);
    }

    destroy() {
        if (this.root && this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
    }
}
