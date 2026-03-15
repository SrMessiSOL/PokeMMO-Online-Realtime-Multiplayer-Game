import Phaser from "phaser";
import { Scene1 } from "./Scene1";
import { Scene2 } from "./Scene2";
import WalletStartMenu from "./ui/WalletStartMenu";
import { setTrainerName, updatePlayerData } from "./state/gameState";

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
    if (profile?.playerName) {
        setTrainerName(profile.playerName);
    }

    if (profile?.characterId) {
        updatePlayerData((player) => ({
            ...player,
            characterId: profile.characterId
        }));
    }

    return new Phaser.Game(Config);
}

new WalletStartMenu((profile) => {
    startGameForProfile(profile);
});
