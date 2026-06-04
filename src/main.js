import Phaser from 'phaser'
import GameScene from './GameScene.js'
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js'

function startGame() {
  const el = document.getElementById('game') || document.body

  const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: el,
    backgroundColor: '#1a1a1a',
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  }

  new Phaser.Game(config)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame)
} else {
  startGame()
}
