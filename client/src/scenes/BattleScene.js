import Phaser from "phaser";

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super("battleScene");
        this.actions = ["Fight", "Bag", "Switch", "Run"];
        this.moves = ["Tackle", "Leaf Shot", "Tail Whip", "Guard"];
    }

    create(data) {
        this.returnData = data.returnData;
        this.turnLocked = false;
        this.showingMoves = false;

        this.playerMonster = {
            name: "Sproutle",
            hp: 42,
            maxHp: 42,
            status: "Ready"
        };

        this.enemyMonster = {
            name: "Nibblit",
            hp: 35,
            maxHp: 35,
            status: "Wild"
        };

        this.renderLayout();
        this.renderActionMenu();
        this.logText("A wild Nibblit challenged you.");
    }

    renderLayout() {
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x86d1ff).setOrigin(0);
        this.add.rectangle(width / 2, height * 0.72, width, height * 0.56, 0xf5f5f5).setStrokeStyle(2, 0x222222);

        this.enemyPanel = this.createMonsterPanel(40, 30, this.enemyMonster, false);
        this.playerPanel = this.createMonsterPanel(width - 300, height * 0.45, this.playerMonster, true);

        this.textBox = this.add.rectangle(20, height - 160, width - 40, 140, 0xffffff).setOrigin(0).setStrokeStyle(3, 0x222222);
        this.turnText = this.add.text(35, height - 145, "", {
            fontFamily: "monospace",
            fontSize: "20px",
            color: "#1b1b1b",
            wordWrap: { width: width - 80 }
        });
    }

    createMonsterPanel(x, y, monster, isPlayer) {
        const panel = this.add.container(x, y);

        const background = this.add.rectangle(0, 0, 260, 120, 0xffffff).setOrigin(0).setStrokeStyle(3, 0x222222);
        const nameText = this.add.text(14, 12, monster.name, { fontFamily: "monospace", fontSize: "20px", color: "#1b1b1b" });
        const statusText = this.add.text(14, 42, `Status: ${monster.status}`, { fontFamily: "monospace", fontSize: "16px", color: "#1b1b1b" });

        const hpBg = this.add.rectangle(14, 80, 232, 18, 0x474747).setOrigin(0);
        const hpFill = this.add.rectangle(14, 80, 232, 18, 0x5ad15a).setOrigin(0);
        const hpText = this.add.text(14, 102, `HP: ${monster.hp}/${monster.maxHp}`, { fontFamily: "monospace", fontSize: "15px", color: "#1b1b1b" });

        panel.add([background, nameText, statusText, hpBg, hpFill, hpText]);

        if (isPlayer) {
            const sprite = this.add.rectangle(-40, 55, 64, 64, 0x3a7bd5).setOrigin(0.5);
            panel.add(sprite);
        } else {
            const sprite = this.add.rectangle(300, 85, 64, 64, 0xef476f).setOrigin(0.5);
            panel.add(sprite);
        }

        panel.hpFill = hpFill;
        panel.hpText = hpText;
        panel.statusText = statusText;
        panel.monsterRef = monster;
        return panel;
    }

    renderActionMenu() {
        const { width, height } = this.scale;

        if (this.menuContainer) {
            this.menuContainer.destroy(true);
        }

        this.menuContainer = this.add.container(0, 0);

        const menuBox = this.add.rectangle(width - 280, height - 160, 260, 140, 0xffffff).setOrigin(0).setStrokeStyle(3, 0x222222);
        this.menuContainer.add(menuBox);

        const options = this.showingMoves ? this.moves : this.actions;
        options.forEach((option, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const button = this.add.text(width - 255 + (col * 120), height - 140 + (row * 48), option, {
                fontFamily: "monospace",
                fontSize: "20px",
                color: "#1b1b1b",
                backgroundColor: "#d9d9d9",
                padding: { x: 8, y: 6 }
            })
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", () => this.handleSelection(option));

            this.menuContainer.add(button);
        });
    }

    handleSelection(option) {
        if (this.turnLocked) {
            return;
        }

        if (!this.showingMoves) {
            if (option === "Fight") {
                this.showingMoves = true;
                this.renderActionMenu();
                this.logText("Choose a move.");
                return;
            }

            if (option === "Bag") {
                this.logText("Bag is empty.");
                return;
            }

            if (option === "Switch") {
                this.logText("No other monsters can battle.");
                return;
            }

            if (option === "Run") {
                this.exitBattle("You got away safely.");
            }

            return;
        }

        this.resolveTurn(option);
    }

    resolveTurn(moveName) {
        this.turnLocked = true;

        const playerDamage = Phaser.Math.Between(8, 14);
        const enemyDamage = Phaser.Math.Between(5, 10);

        this.enemyMonster.hp = Math.max(0, this.enemyMonster.hp - playerDamage);
        this.updatePanel(this.enemyPanel);

        this.logText(`${this.playerMonster.name} used ${moveName}!\nIt dealt ${playerDamage} damage.`);

        if (this.enemyMonster.hp <= 0) {
            this.time.delayedCall(900, () => this.exitBattle("Enemy defeated! Returning to the overworld."));
            return;
        }

        this.time.delayedCall(1000, () => {
            this.playerMonster.hp = Math.max(0, this.playerMonster.hp - enemyDamage);
            this.updatePanel(this.playerPanel);
            this.logText(`Wild ${this.enemyMonster.name} attacks!\nYou took ${enemyDamage} damage.`);

            if (this.playerMonster.hp <= 0) {
                this.time.delayedCall(900, () => this.exitBattle("You blacked out... Back to the overworld."));
                return;
            }

            this.time.delayedCall(900, () => {
                this.showingMoves = false;
                this.turnLocked = false;
                this.renderActionMenu();
                this.logText("What will you do next?");
            });
        });
    }

    updatePanel(panel) {
        const ratio = panel.monsterRef.hp / panel.monsterRef.maxHp;
        panel.hpFill.width = 232 * ratio;
        panel.hpFill.fillColor = ratio < 0.3 ? 0xff5a5a : ratio < 0.6 ? 0xffd166 : 0x5ad15a;
        panel.hpText.setText(`HP: ${panel.monsterRef.hp}/${panel.monsterRef.maxHp}`);
        panel.statusText.setText(`Status: ${panel.monsterRef.status}`);
    }

    logText(text) {
        this.turnText.setText(text);
    }

    exitBattle(message) {
        this.turnLocked = true;
        this.logText(message);

        this.time.delayedCall(900, () => {
            this.scene.start("playGame", {
                map: this.returnData.map,
                playerTexturePosition: this.returnData.playerTexturePosition,
                returnPosition: {
                    x: this.returnData.x,
                    y: this.returnData.y
                }
            });
        });
    }
}
