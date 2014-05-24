
BasicGame.Game = function (game) {

  //  When a State is added to Phaser it automatically has the following properties set on it, even if they already exist:

    this.game;    //  a reference to the currently running game
    this.add;    //  used to add sprites, text, groups, etc
    this.camera;  //  a reference to the game camera
    this.cache;    //  the game cache
    this.input;    //  the global input manager (you can access this.input.keyboard, this.input.mouse, as well from it)
    this.load;    //  for preloading assets
    this.math;    //  lots of useful common math operations
    this.sound;    //  the sound manager - add a sound, play one, set-up markers, etc
    this.stage;    //  the game stage
    this.time;    //  the clock
    this.tweens;    //  the tween manager
    this.state;      //  the state manager
    this.world;    //  the game world
    this.particles;  //  the particle manager
    this.physics;  //  the physics manager
    this.rnd;    //  the repeatable random number generator

    //  You can use any of these from any function within this State.
    //  But do consider them as being 'reserved words', i.e. don't create a property for your own game called "world" or you'll over-write the world reference.

};

BasicGame.Game.prototype = {
  PLAYER_SPEED: 300,
  create: function () {
    this.sea = this.add.tileSprite(0, 0, 1024, 768, 'sea')

    this.player = this.add.sprite(400, 650, 'player');
    this.player.anchor.setTo(0.5, 0.5)
    this.player.animations.add('fly', [ 0, 1, 2 ], 20, true);
    this.player.animations.add('ghost', [3, 0, 3, 1], 20, true);
    this.player.play('fly');
    this.game.physics.enable(this.player, Phaser.Physics.ARCADE);
    this.player.body.collideWorldBounds = true;
    this.player.body.setSize(20, 20, 0, -5);

    var prepEnemies = [
      { key: 'greenEnemy', count: 50 },
      { key: 'whiteEnemy', count: 20 },
      { key: 'boss', count: 1 }
    ]

    this.enemies = [] 

    for (var i = 0; i < 3; i++) {
      var enemyGroup = this.add.group();
      enemyGroup.enableBody = true;
      enemyGroup.physicsBodyType = Phaser.Physics.ARCADE;
      enemyGroup.createMultiple(
        prepEnemies[i]['count'], prepEnemies[i]['key'], 0, false
      );
      enemyGroup.setAll('anchor.x', 0.5)
      enemyGroup.setAll('anchor.y', 0.5)
      enemyGroup.setAll('outOfBoundsKill', true)
      enemyGroup.setAll('checkWorldBounds', true)
      enemyGroup.forEach(function (enemy) {
        enemy.animations.add('fly', [ 0, 1, 2 ], 20, true);
        enemy.animations.add('hit', [ 3, 1, 3, 2 ], 20, false);
        enemy.events.onAnimationComplete.add( function (e) {
          e.play('fly')
        }, this);
      });
      this.enemies.push(enemyGroup);
    }

    this.nextEnemy = [0, 0];
    this.spawnRate = [1000, null];
    this.wave = 1;
    this.boss = null;

    this.bullets = this.add.group();
    this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.bullets.createMultiple(100, 'bullet', 0, false);
    this.bullets.setAll('anchor.x', 0.5)
    this.bullets.setAll('anchor.y', 0.5)
    this.bullets.setAll('outOfBoundsKill', true)
    this.bullets.setAll('checkWorldBounds', true)    
    this.nextFire = 0;  

    this.enemyBullets = this.add.group();
    this.enemyBullets.enableBody = true;
    this.enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
    this.enemyBullets.createMultiple(100, 'enemyBullet', 0, false);
    this.enemyBullets.setAll('anchor.x', 0.5)
    this.enemyBullets.setAll('anchor.y', 0.5)
    this.enemyBullets.setAll('outOfBoundsKill', true)
    this.enemyBullets.setAll('checkWorldBounds', true)

    this.explosions = this.add.group();
    this.explosions.enableBody = true;
    this.explosions.physicsBodyType = Phaser.Physics.ARCADE;
    this.explosions.createMultiple(100, 'explosion', 0, false);
    this.explosions.setAll('anchor.x', 0.5)
    this.explosions.setAll('anchor.y', 0.5)
    this.explosions.forEach(function (explosion) {
      explosion.animations.add('boom');
    });

    this.lives = this.add.group();
    for (var i = 0; i < 3; i++)  {
      var life = this.lives.create(924 + (30 * i), 30, 'player');
      life.scale.setTo(0.5, 0.5);
      life.anchor.setTo(0.5, 0.5);
    }

    this.cursors = this.input.keyboard.createCursorKeys();

    this.instructions = this.add.text( 510, 600, 
      "Use Arrow Keys to Move, Press Z to Fire\n" + 
      "Tapping/clicking does both", 
      { font: '20px monospace', fill: '#fff', align: 'center' }
    );
    this.instructions.anchor.setTo(0.5, 0.5);
    this.instExpire = this.time.now + 10000;

    this.score = 0;
    this.scoreText = this.add.text(
      510, 30, '' + this.score, 
      { font: '20px monospace', fill: '#fff', align: 'center' }
    );
    this.scoreText.anchor.setTo(0.5, 0.5);
  },

  update: function () {
    this.sea.tilePosition.y += 0.2;
    for (var i = 0; i < 2; i++) {
      this.physics.arcade.overlap(
        this.bullets, this.enemies[i], this.enemyHit, null, this
      );
      this.physics.arcade.overlap(
        this.player, this.enemies[i], this.playerHit, null, this
      );
    }

    if (this.boss && this.boss.form === 2) {
      this.physics.arcade.overlap(
        this.bullets, this.enemies[2], this.enemyHit, null, this
      );
    }
    
    this.physics.arcade.overlap(
      this.player, this.enemyBullets, this.playerHit, null, this
    );
 
    this.checkWave();
    if (this.boss) {
      this.changeBossBehavior();
    }

    this.spawnEnemies();
    
    this.enemyFire();

    this.processPlayerInput();

    if (this.ghostUntil && this.ghostUntil < this.time.now) {
      this.ghostUntil = null;
      this.player.play('fly');
    }

    if (this.instructions.exists && this.time.now > this.instExpire) {
      this.instructions.destroy()
    } 

    if (this.showReturn && this.time.now > this.showReturn) {
      this.returnText = this.add.text(
        512, 400, 
        'Press Z or Tap Game to go back to Main Menu', 
        { font: "16px sans-serif", fill: "#fff"}
      ).anchor.setTo(0.5, 0.5);
      this.showReturn = null;
    }
  },
  checkWave: function () {
    if (this.wave === 1 && this.score >= 1000) {
      this.wave = 2;
      this.spawnRate = [800, 2500];
    } else if (this.wave === 2 && this.score >= 2000) {
      this.wave = 3;
      this.spawnRate = [600, 2000];
    } else if (this.wave === 3 && this.score >= 3000) {
      this.wave = 4;
      this.spawnRate = [750, null];
      this.spawnBoss();
    }
  },

  spawnBoss: function() {
    this.boss = this.enemies[2].getFirstExists(false);
    this.boss.reset(512, 0);
    this.boss.form = 1;
    this.boss.body.velocity.y = 15;
    this.boss.play('fly');
  },

  changeBossBehavior: function() {
    if (this.boss.form === 1 && this.boss.y > 80) {
      this.boss.form = 2;
      this.boss.health = 50;
      this.boss.body.velocity.y = 0;
      this.boss.body.velocity.x = 200;
      this.boss.body.bounce.setTo(1, 1);
      this.boss.body.collideWorldBounds = true;
      this.boss.nextFire = 0;
    } 
  },

  enemyFire: function() {
    this.enemies[1].forEachAlive(function (enemy) {
      if (this.time.now > enemy.nextFire && this.enemyBullets.countDead() > 0) {
        this.spawnEnemyBullet(enemy.x, enemy.y);
        enemy.nextFire = this.time.now + 2000;
      }
    }, this);
    if (this.boss && this.boss.alive && this.boss.form === 2 &&
        this.time.now > this.boss.nextFire) {
      this.spawnEnemyBullet(this.boss.x - 20, this.boss.y + 20);
      this.spawnEnemyBullet(this.boss.x + 20, this.boss.y + 20);
      this.boss.nextFire = this.time.now + 1000;
    }
  },

  spawnEnemyBullet: function (x, y) {
    bullet = this.enemyBullets.getFirstExists(false)
    bullet.reset(x, y);
    bullet.health = 1;
    this.physics.arcade.moveToObject(bullet, this.player, 150);
  }, 
  spawnEnemies: function () {
   for (var i = 0; i < 2; i++) {
      if (this.spawnRate[i] && 
          this.nextEnemy[i] < this.time.now && 
          this.enemies[i].countDead() > 0) {
        this.nextEnemy[i] = this.time.now + this.spawnRate[i];

        var enemy = this.enemies[i].getFirstExists(false);

        if (i === 0) {
          enemy.reset(this.rnd.integerInRange(20, 1004), 0);
          enemy.body.velocity.y = this.rnd.integerInRange(30, 60);
          enemy.health = 2;
        } else {
          enemy.reset(this.rnd.integerInRange(20, 1004), 0);
          var target = this.rnd.integerInRange(20, 1004);

          enemy.rotation = this.physics.arcade.moveToXY(
            enemy, target, 768, this.rnd.integerInRange(30, 80)
          ) - Math.PI / 2;
          enemy.health = 5;
          enemy.nextFire = 0;
        }

        enemy.play('fly');
      }
    }
  },

  processPlayerInput: function () {
    this.player.body.velocity.x = 0;
    this.player.body.velocity.y = 0;

    if (this.cursors.left.isDown) {
      this.player.body.velocity.x = -this.PLAYER_SPEED;
    } else if (this.cursors.right.isDown) {
      this.player.body.velocity.x = this.PLAYER_SPEED;
    }

    if (this.cursors.up.isDown) {
      this.player.body.velocity.y = -this.PLAYER_SPEED;
    } else if (this.cursors.down.isDown) {
      this.player.body.velocity.y = this.PLAYER_SPEED;
    }

    if (this.game.input.activePointer.isDown &&
        this.game.physics.arcade.distanceToPointer(this.player) > 15) {
      this.game.physics.arcade.moveToPointer(this.player, this.PLAYER_SPEED);
    }

    if (this.input.keyboard.isDown(Phaser.Keyboard.Z) ||
        this.input.activePointer.isDown) {
      if (this.returnText) {
        this.quitGame();
      } else {
        this.fire();
      }
    }
  },
  fire: function() {
    if (this.player.alive && this.nextFire < this.time.now && this.bullets.countDead() > 0) {
      this.nextFire = this.time.now + 100;
      var bullet = this.bullets.getFirstExists(false);
      bullet.reset(this.player.x, this.player.y - 20);
      bullet.body.velocity.y = -500;
    }
  },
  enemyHit: function (bullet, enemy) {
    bullet.kill();
    this.damageEnemy(enemy, 1);
  },
  playerHit: function (player, enemy) {
    if (this.ghostUntil && this.ghostUntil > this.time.now) {
      return;
    }
    this.damageEnemy(enemy, 5);
    var life = this.lives.getFirstAlive();
    if (life) {
      life.kill();
      this.ghostUntil = this.time.now + 3000;
      this.player.play('ghost');
    } else {
      this.explode(player);
      player.kill();
      this.displayEnd(false);
    }
  },
  damageEnemy: function (enemy, damage) {
    enemy.damage(damage);
    if (enemy.alive) {
      enemy.play('hit');
    } else {
      explode(enemy);
      if (enemy.key === "greenEnemy") {
        this.score += 100;
      } else if (enemy.key === "whiteEnemy") { 
        this.score += 200;
      } else if (enemy.key === "boss") {
        this.score += 20000;
        this.displayEnd(true);
      }
      this.scoreText.text = this.score;
    }
  },
  explode: function (sprite) {
    var explosion = this.explosions.getFirstExists(false);
    if (explosion) {
      explosion.reset(sprite.x, sprite.y);
      explosion.play('boom', 15, false, true);
      explosion.body.velocity.x = sprite.body.velocity.x;
      explosion.body.velocity.y = sprite.body.velocity.y;
    }
  },
  render: function() {
  },
  displayEnd: function (win) {
    var msg = win ? 'You Win!!!' : 'Game Over!';
    this.add.text( 
      510, 320, msg, 
      { font: "72px serif", fill: "#fff" }
    ).anchor.setTo(0.5, 0);

    if (win) {
      this.scoreText.text = this.score;
      this.enemies[0].destroy();
      this.enemies[1].destroy();
      this.enemyBullets.destroy();
    }

    this.showReturn = this.time.now + 2000;
  },
  quitGame: function (pointer) {

    //  Here you should destroy anything you no longer need.
    //  Stop music, delete sprites, purge caches, free resources, all that good stuff.
    
    this.returnText = null;

    //  Then let's go back to the main menu.
    this.state.start('MainMenu');

  }
};
