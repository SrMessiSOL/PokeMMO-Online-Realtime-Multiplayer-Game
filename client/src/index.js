import Phaser from "phaser";
import { Scene1 } from "./Scene1";
import { Scene2 } from "./Scene2";
import WalletStartMenu from "./ui/WalletStartMenu";
import ProfileHubMenu from "./ui/ProfileHubMenu";
import { getGameState, hydrateFromWalletGameState, setTrainerName, updatePlayerData } from "./state/gameState";

const Config = {
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    parent: "game-container",
    pixelArt: true,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: [Scene1, Scene2]
};

let game = null;
let currentProfile = null;
let hubMenu = null;

function applyProfile(profile) {
    if (profile?.gameState) {
        hydrateFromWalletGameState(profile.gameState);
    }

    updatePlayerData((player) => ({
        ...player,
        walletAddress: profile?.walletAddress || player.walletAddress || null,
        characterId: profile?.characterId || player.characterId
    }));

    if (profile?.playerName) {
        setTrainerName(profile.playerName);
    }
}

function openProfileHub(profile, { resume = false } = {}) {
    currentProfile = {
        ...(currentProfile || {}),
        ...(profile || {}),
        gameState: getGameState()
    };

    if (hubMenu) {
        hubMenu.destroy();
    }

    hubMenu = new ProfileHubMenu({
        profile: currentProfile,
        onEnterGame: () => {
            if (!game) {
                game = new Phaser.Game(Config);
                return;
            }

            if (resume) {
                game.scene.resume("playGame");
                game.scene.wake("playGame");
            }
        }
    });
}

window.__pokemmoOpenProfileHub = (profile) => {
    openProfileHub(profile, { resume: true });
};

new WalletStartMenu((profile) => {
    applyProfile(profile);
    openProfileHub(profile);
});
