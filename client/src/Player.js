import Phaser from "phaser";

export default class Player extends Phaser.GameObjects.Sprite {
    constructor(config) {
        super(config.scene, config.x, config.y, config.key);

        this.scene.add.existing(this);
        this.scene.physics.world.enableBody(this);
        this.scene.physics.add.collider(this, config.worldLayer);

        this.setTexture("currentPlayer", `misa-${this.scene.playerTexturePosition}`);

        // Register cursors for player movement
        this.cursors = this.scene.input.keyboard.createCursorKeys();

        // Player Offset
        this.body.setOffset(0, 24);

        // Player can't go out of the world
        this.body.setCollideWorldBounds(true)

        // Set depth (z-index)
        this.setDepth(5);

        // Container to store old data
        this.container = [];

        // Player speed
        this.speed = 150;

        this.canChangeMap = true;

        // Player nickname text
        this.playerNickname = this.scene.add.text((this.x - this.width * 1.4), (this.y - (this.height / 2)), 'Player');

        // Add interaction input
        this.spacebar = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    update(time, delta) {
        const prevVelocity = this.body.velocity.clone();

        // Show player nickname above player
        this.showPlayerNickname();

        // Player interaction
        this.handleInteraction();

        // Stop any previous movement from the last frame
        this.body.setVelocity(0);

        // Horizontal movement
        if (this.cursors.left.isDown) {
            this.body.setVelocityX(-this.speed);
        } else if (this.cursors.right.isDown) {
            this.body.setVelocityX(this.speed);
        }

        // Vertical movement
        if (this.cursors.up.isDown) {
            this.body.setVelocityY(-this.speed);
        } else if (this.cursors.down.isDown) {
            this.body.setVelocityY(this.speed);
        }

        // Normalize and scale the velocity so that player can't move faster along a diagonal
        this.body.velocity.normalize().scale(this.speed);

        // Update the animation last and give left/right animations precedence over up/down animations
        if (this.cursors.left.isDown) {
            this.anims.play("misa-left-walk", true);
        } else if (this.cursors.right.isDown) {
            this.anims.play("misa-right-walk", true);
        } else if (this.cursors.up.isDown) {
            this.anims.play("misa-back-walk", true);
        } else if (this.cursors.down.isDown) {
            this.anims.play("misa-front-walk", true);
        } else {
            this.anims.stop();

            // If we were moving, pick and idle frame to use
            if (prevVelocity.x < 0) this.setTexture("currentPlayer", "misa-left");
            else if (prevVelocity.x > 0) this.setTexture("currentPlayer", "misa-right");
            else if (prevVelocity.y < 0) this.setTexture("currentPlayer", "misa-back");
            else if (prevVelocity.y > 0) this.setTexture("currentPlayer", "misa-front");
        }
    }

    showPlayerNickname() {
        this.playerNickname.x = this.x - (this.playerNickname.width / 2);
        this.playerNickname.y = this.y - (this.height / 2);
    }

    isMoved() {
        if (this.container.oldPosition && (this.container.oldPosition.x !== this.x || this.container.oldPosition.y !== this.y)) {
            this.container.oldPosition = {x: this.x, y: this.y};
            return true;
        } else {
            this.container.oldPosition = {x: this.x, y: this.y};
            return false;
        }
    }

    handleInteraction() {
        const canInteract = Phaser.Input.Keyboard.JustDown(this.spacebar) || Phaser.Input.Keyboard.JustDown(this.enterKey);
        const nearbyPrompt = [];

        const doors = this.scene.map.getObjectLayer('Doors');
        if (doors && doors.objects) {
            doors.objects.forEach((door) => {
                if (this.scene.isInsideObject(door, this.x, this.y)) {
                    nearbyPrompt.push('Press SPACE to use door');
                    if (canInteract) {
                        const requiredFlag = this.scene.readProperty(door, 'requiresFlag');
                        if (!this.scene.hasFlag(requiredFlag)) {
                            this.scene.setPrompt(this.scene.readProperty(door, 'lockedMessage', 'The door is locked.'));
                            return;
                        }
                        this.scene.transitionToMap(
                            this.scene.readProperty(door, 'targetMap'),
                            this.scene.readProperty(door, 'targetSpawnPoint', 'Spawn Point'),
                            this.scene.readProperty(door, 'playerTexturePosition', 'front')
                        );
                    }
                }
            });
        }

        const worlds = this.scene.map.getObjectLayer('Worlds');
        if (worlds && worlds.objects) {
            worlds.objects.forEach((world) => {
                if (this.scene.isInsideObject(world, this.x, this.y)) {
                    nearbyPrompt.push('Press SPACE to travel');
                    if (canInteract) {
                        this.scene.transitionToMap(
                            this.scene.readProperty(world, 'targetMap', world.name),
                            this.scene.readProperty(world, 'targetSpawnPoint', 'Spawn Point'),
                            this.scene.readProperty(world, 'playerTexturePosition', 'front')
                        );
                    }
                }
            });
        }

        const npcs = this.scene.map.getObjectLayer('NPCs');
        if (npcs && npcs.objects) {
            npcs.objects.forEach((npc) => {
                if (this.scene.isInsideObject(npc, this.x, this.y)) {
                    nearbyPrompt.push('Press SPACE to talk');
                    if (canInteract) {
                        this.scene.runNpcInteraction(npc);
                    }
                }
            });
        }

        const checkpoints = this.scene.map.getObjectLayer('Checkpoints');
        if (checkpoints && checkpoints.objects) {
            checkpoints.objects.forEach((checkpoint) => {
                if (this.scene.isInsideObject(checkpoint, this.x, this.y)) {
                    nearbyPrompt.push('Press SPACE to save checkpoint');
                    if (canInteract) {
                        this.scene.runCheckpoint(checkpoint);
                    }
                }
            });
        }

        if (nearbyPrompt.length && !this.scene.dialogueActive) {
            this.scene.setPrompt(nearbyPrompt[0]);
        } else if (!this.scene.dialogueActive && this.scene.currentPromptText.startsWith('Press SPACE')) {
            this.scene.setPrompt('');
        }
    }
}
