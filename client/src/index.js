import Phaser from "phaser";
import { Scene1 } from "./Scene1";
import { Scene2 } from "./Scene2";
import WalletStartMenu from "./ui/WalletStartMenu";
import { hydrateFromWalletGameState, setTrainerName, updatePlayerData } from "./state/gameState";

const Config = {
    type: Phaser.AUTO,
    width: 800,
    height: 450,
    parent: "game-container",
    pixelArt: true,
    physics: {
        default: "arcade",
        arcade: {
            gravity: {y: 0}
        }
    },
    scene: [Scene1, Scene2],
};

function startGameForProfile(profile) {
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

    return new Phaser.Game(Config);
}

new WalletStartMenu((profile) => {
    startGameForProfile(profile);
});
