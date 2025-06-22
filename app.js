
//game configuration
const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,              //make game responsive 
    autoCenter: Phaser.Scale.CENTER_BOTH,   //center the canvas 
    width: 800,     //default width
    height: 600     //default height
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },     //gravity to pull bird down
      debug: false
    }
  },
  //set the scene
  scene: {
    preload,        //load assets
    create,         //set up objects
    update          //game loop
  }
};

//game variables
let bird;
let pipes;
let score = 0;
let scoreText;
let gameOver = false;
let gameOverText;
let pipeTimer;

//game constants
const PIPE_SPEED = -350;
const BIRD_SCALE = 2;
const PIPE_WIDTH = 80;
const MIN_GAP = 160;
const MAX_GAP = 220;
const ROAD_HEIGHT = 64;
const PIPE_INTERVAL = 1800;         
const MIN_PIPE_DISTANCE = 300;      

//create an instance of the game
const game = new Phaser.Game(config);

//function to load assets
function preload() {
  
  this.load.image('background', 'assets/background.png');
  this.load.image('column', 'assets/column.png');
  this.load.image('bird', 'assets/bird.png');
  this.load.image('road', 'assets/road.png');
}

//fucntion to create objects
function create() {
  gameOver = false;
  score = 0;
  
  //handle resizing
  this.scale.on('resize', resizeGame, this);

  //add background image
  this.background = this.add.image(0, 0, 'background').setOrigin(0);
  this.background.displayWidth = this.scale.width;
  this.background.displayHeight = this.scale.height;
  
  //add a scrolling road
  this.road = this.add.tileSprite(this.scale.width / 2, this.scale.height - ROAD_HEIGHT, this.scale.width, ROAD_HEIGHT, 'road').setOrigin(0.5, 0);
  this.physics.add.existing(this.road, true);
  
  //group for column objects
  pipes = this.physics.add.group();

  //create bird 
  bird = this.physics.add.sprite(this.scale.width * 0.2, this.scale.height / 2, 'bird').setScale(BIRD_SCALE);
  bird.setCollideWorldBounds(true);     //keeps bird within bounds
  
  //add collisions
  this.physics.add.collider(bird, this.road, hitPipe, null, this);
  this.physics.add.overlap(bird, pipes, hitPipe, null, this);

  //display score
  scoreText = this.add.text(10, 10, 'Score: 0', {
    fontFamily: '"Press Start 2P"',
    fontSize: '28px',
    fill: 'white'
  }).setDepth(1);

  //displaye text when game is over (initially hidden)
  gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
    fontFamily: '"Press Start 2P"',
    fontSize: '32px',
    fill: 'black',
    align: 'center'
  }).setOrigin(0.5).setDepth(1);

  //handle spacebar input for jump/restart
  this.input.keyboard.on('keydown-SPACE', () => {
    if (gameOver) return restartGame.call(this);
    bird.setVelocityY(-350);
  });

  //timer to spawn columns
  pipeTimer = this.time.addEvent({
    delay: PIPE_INTERVAL,
    callback: () => addPipePair.call(this),
    loop: true
  });

  //add initial column pair near spawn point
  addPipePair.call(this, true); 
}

//function for game loop
function update() {
  if (!gameOver && this.road) {
    this.road.tilePositionX += 2;   //scroll the road while game isn't over

    pipes.getChildren().forEach(pipe => {
      //condition for when bird passes a pair of columns
      if (pipe.x + pipe.displayWidth < bird.x && !pipe.passed) {
        pipe.passed = true;
        score += 0.5;                   //update score
        scoreText.setText('Score: ' + Math.floor(score));
      }

      //remove columns that are off screen
      if (pipe.x + pipe.displayWidth < 0) {
        pipes.remove(pipe, true, true);
      }
    });
  }
}

//function to add a pair of columns
function addPipePair(first = false) {
  const totalHeight = this.scale.height;
  const gapHeight = Phaser.Math.Between(MIN_GAP, MAX_GAP);
  const maxTopHeight = totalHeight - ROAD_HEIGHT - gapHeight - 100;
  const topPipeHeight = Phaser.Math.Between(100, maxTopHeight);
  const bottomPipeHeight = totalHeight - ROAD_HEIGHT - gapHeight - topPipeHeight;

  //if first column, spawn closer to the left edge
  const spawnX = first ? this.scale.width + 50 : this.cameras.main.scrollX + this.cameras.main.width + 100;

  //top column
  const topPipe = pipes.create(spawnX, topPipeHeight / 2, 'column');
  topPipe.setOrigin(0.5);
  topPipe.setImmovable(true);
  topPipe.body.allowGravity = false;
  topPipe.setVelocityX(PIPE_SPEED);
  topPipe.setFlipY(true);
  topPipe.setDisplaySize(PIPE_WIDTH, topPipeHeight);
  topPipe.passed = false;
 
  //bottom column
  const bottomPipeY = totalHeight - ROAD_HEIGHT - bottomPipeHeight / 2;
  const bottomPipe = pipes.create(spawnX, bottomPipeY, 'column');
  bottomPipe.setOrigin(0.5);
  bottomPipe.setImmovable(true);
  bottomPipe.body.allowGravity = false;
  bottomPipe.setVelocityX(PIPE_SPEED);
  bottomPipe.setDisplaySize(PIPE_WIDTH, bottomPipeHeight);
  bottomPipe.passed = false;
}


//function to handle collisions
function hitPipe() {
  if (!gameOver) {
    gameOver = true;
    pipeTimer.remove();         //stop spawning new columns
    pipes.setVelocityX(0);      //stop all columns
    bird.setTint(0xff0000);     //bird flashes red
    gameOverText.setText('Score: ' + Math.floor(score) + '\nPress SPACE to restart');
  }
}

//function to restart the game 
function restartGame() {
  this.scene.restart();
}

//function to handle resizing of game elements
function resizeGame(gameSize) {
  const width = gameSize.width;
  const height = gameSize.height;

  if (this.background) {
    this.background.displayWidth = width;
    this.background.displayHeight = height;
  }

  if (this.road) {
    this.road.setPosition(width / 2, height - ROAD_HEIGHT);
    this.road.displayWidth = width;
  }

  if (scoreText) scoreText.setPosition(10, 10);
  if (gameOverText) gameOverText.setPosition(width / 2, height / 2);
}

//listener to handle resizing of browser window
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
