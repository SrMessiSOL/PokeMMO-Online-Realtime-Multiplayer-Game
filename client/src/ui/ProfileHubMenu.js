import { getGameState } from "../state/gameState";

function countBagItems(bag = {}) {
    return Object.values(bag).reduce((sum, items) => {
        if (!Array.isArray(items)) {
            return sum;
        }
        return sum + items.reduce((itemSum, item) => itemSum + Math.max(0, item.quantity || 0), 0);
    }, 0);
}

export default class ProfileHubMenu {
    constructor({ profile, onEnterGame }) {
        this.profile = profile || {};
        this.onEnterGame = onEnterGame;
        this.createLayout();
    }

    createLayout() {
        const state = this.profile.gameState && typeof this.profile.gameState === "object"
            ? this.profile.gameState
            : getGameState();

        const party = Array.isArray(state.party) ? state.party : [];
        const bagItemCount = countBagItems(state.bag);

        this.root = document.createElement("div");
        this.root.className = "profile-hub-menu";
        this.root.innerHTML = `
            <div class="profile-hub-card">
                <h2>Trainer Hub</h2>
                <p><strong>Name:</strong> ${state.player?.name || this.profile.playerName || "Unknown"}</p>
                <p><strong>Character:</strong> ${state.player?.characterId || this.profile.characterId || "Unknown"}</p>
                <p><strong>Money:</strong> ${state.money ?? 0}</p>
                <p><strong>Pokémon:</strong> ${party.length}</p>
                <p><strong>Items:</strong> ${bagItemCount}</p>
                <button id="enter-game">Enter Game</button>
            </div>
        `;

        document.body.appendChild(this.root);

        this.root.querySelector("#enter-game").addEventListener("click", () => {
            this.destroy();
            this.onEnterGame();
        });
    }

    destroy() {
        if (this.root && this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
    }
}
