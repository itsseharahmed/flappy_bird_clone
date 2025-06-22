
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
let waitingToStart = true;
let startText;

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
  waitingToStart = true;
  
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
  
  //responsive bird scale
  const scaleFactor = Math.min(this.scale.width / 800, this.scale.height / 600);
  const birdScale = BIRD_SCALE * scaleFactor;
  
  //create bird 
  bird = this.physics.add.sprite(this.scale.width * 0.2, this.scale.height / 2, 'bird').setScale(BIRD_SCALE);
  bird.setCollideWorldBounds(true);     //keeps bird within bounds
  bird.body.allowGravity = false;       //prevent bird from falling until game starts
  
  //add collisions
  this.physics.add.collider(bird, this.road, hitPipe, null, this);
  this.physics.add.overlap(bird, pipes, hitPipe, null, this);

  //responsive font size
  const fontSize = Math.floor(28 * scaleFactor);
  
 
  const isMobile = this.scale.width < 600;

  //display score
  scoreText = this.add.text(10, 10, 'Score: 0', {
    fontFamily: '"Press Start 2P"',
    fontSize: isMobile ? '14px' : '28px',
    fill: 'white',
    wordWrap: { width: this.scale.width * 0.5 }
  }).setDepth(1);


  //displays text when game is over (initially hidden)
  gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
    fontFamily: '"Press Start 2P"',
    fontSize: isMobile ? '16px' : '32px',
    fill: 'black',
    align: 'center',
    wordWrap: { width: this.scale.width * 0.7 }
  }).setOrigin(0.5).setDepth(1);

  //show "Press to start"
  startText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, 'Press SPACE or TAP to start', {
    fontFamily: '"Press Start 2P"',
    fontSize: this.scale.width < 600 ? '12px' : '20px',
    fill: 'white',
    align: 'center',
    wordWrap: { width: this.scale.width * 0.5 }
  }).setOrigin(0.5).setDepth(1);
  
  //handle spacebar input for jump/restart
  this.input.keyboard.on('keydown-SPACE', () => {
    if (gameOver) return restartGame.call(this);
    if (waitingToStart) return startGame.call(this);
    bird.setVelocityY(-350);
  });

  this.input.on('pointerdown', () => {
    if (gameOver) return restartGame.call(this);
    if (waitingToStart) return startGame.call(this);
    bird.setVelocityY(-350);
  });
  
}

//function to start game
function startGame() {
  waitingToStart = false;
  bird.body.allowGravity = true;
  bird.setVelocityY(-350); //initial flap
  startText.setVisible(false);

  pipeTimer = this.time.addEvent({
    delay: PIPE_INTERVAL,
    callback: () => addPipePair.call(this),
    loop: true
  });

  //spawn first pipe right away
  addPipePair.call(this, true);
}

//function for game loop
function update() {
  if (waitingToStart || gameOver) return;

  if (this.road) {
    this.road.tilePositionX += 2;
  }

  pipes.getChildren().forEach(pipe => {
    if (pipe.x + pipe.displayWidth < bird.x && !pipe.passed) {
      pipe.passed = true;
      score += 0.5;
      scoreText.setText('Score: ' + Math.floor(score));
    }

    if (pipe.x + pipe.displayWidth < 0) {
      pipes.remove(pipe, true, true);
    }
  });
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
    gameOverText.setText('Score: ' + Math.floor(score) + '\n\nPress SPACE/Tap to restart');
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

  //scale score text responsively
  const scaleFactor = Math.min(width / 800, height / 600);
  if (scoreText) {
    scoreText.setFontSize(Math.floor(28 * scaleFactor));
    scoreText.setPosition(10, 10);
  }

  //scale game text responsively
  if (gameOverText) {
    gameOverText.setFontSize(Math.floor(32 * scaleFactor));
    gameOverText.setPosition(width / 2, height / 2);
  }
}

//listener to handle resizing of browser window
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
