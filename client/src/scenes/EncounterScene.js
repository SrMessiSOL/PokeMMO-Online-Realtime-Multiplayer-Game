import Phaser from "phaser";

export default class EncounterScene extends Phaser.Scene {
    constructor() {
        super("encounterScene");
    }

    create(data) {
        this.returnData = data.returnData;

        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);

        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
        this.tweens.add({
            targets: flash,
            alpha: { from: 0, to: 1 },
            duration: 150,
            yoyo: true,
            repeat: 2
        });

        this.add.text(width / 2, height / 2, "A wild monster appeared!", {
            fontFamily: "monospace",
            fontSize: "28px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 4
        }).setOrigin(0.5);

        this.time.delayedCall(900, () => {
            this.scene.start("battleScene", { returnData: this.returnData });
        });
    }
}
