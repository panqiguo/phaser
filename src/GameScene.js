import Phaser from 'phaser'
import {
  createState, initFloor, movePlayer, playerAttack,
  saveData, loadData as loadStateData,
} from './gameLogic.js'
import {
  TILE_SIZE, TILE, COLORS, MAP_COLS, MAP_ROWS,
  GAME_WIDTH, GAME_HEIGHT, TOP_UI, BOTTOM_UI,
} from './constants.js'
import ImGui from './ImGui.js'

const SWIPE_THRESHOLD = 30
const SAVE_KEY = 'dungeon_save'

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  create() {
    this.state = createState()
    initFloor(this.state, 1)

    this.turnCooldown = 180
    this.turnTimer = 0
    this.blinkTimer = 0

    this.mapOffsetX = Math.floor((GAME_WIDTH - MAP_COLS * TILE_SIZE) / 2)
    this.mapOffsetY = TOP_UI

    this.tileGfx = this.add.graphics()
    this.entityGfx = this.add.graphics()
    this.imGui = new ImGui(this)

    this.cursors = this.input.keyboard.createCursorKeys()
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    this.keyF5 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F5)
    this.keyF9 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F9)
    this.keyAttack = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J)

    this.attackFxs = []
    this.saveTimer = 0
    this.swipeStartX = 0
    this.swipeStartY = 0

    this.input.on('pointerdown', (p) => {
      this.swipeStartX = p.x
      this.swipeStartY = p.y
    })

    this.input.on('pointerup', (p) => {
      if (this.state.gameOver) return
      if (this.turnTimer > 0) return

      const dx = p.x - this.swipeStartX
      const dy = p.y - this.swipeStartY
      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return

      this.imGui.clearClicks()
      if (Math.abs(dx) > Math.abs(dy)) {
        this.doMove(dx > 0 ? 1 : -1, 0)
      } else {
        this.doMove(0, dy > 0 ? 1 : -1)
      }
    })

    this.drawTiles()
  }

  update(time, delta) {
    this.blinkTimer += delta
    this.turnTimer -= delta

    this.attackFxs = this.attackFxs.filter(fx => {
      fx.timer -= delta
      return fx.timer > 0
    })

    if (this.state.gameOver) {
      this.drawEntities()
      this.imGui.begin()
      this.paintUI()
      this.imGui.end()
      if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.restart()
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyF5)) { this.doSave(); this.saveTimer = 120 }
    if (Phaser.Input.Keyboard.JustDown(this.keyF9)) { this.doLoad(); return }
    if (this.saveTimer > 0) this.saveTimer--

    let dx = 0
    let dy = 0

    if (this.turnTimer <= 0) {
      if (this.cursors.left.isDown || this.keyA.isDown) dx = -1
      else if (this.cursors.right.isDown || this.keyD.isDown) dx = 1

      if (dx === 0) {
        if (this.cursors.up.isDown || this.keyW.isDown) dy = -1
        else if (this.cursors.down.isDown || this.keyS.isDown) dy = 1
      }

      if (dx !== 0 || dy !== 0) {
        this.doMove(dx, dy)
        if (!this.state.gameOver) this.turnTimer = this.turnCooldown
      }

      if (dx === 0 && dy === 0 && (Phaser.Input.Keyboard.JustDown(this.keyAttack) || Phaser.Input.Keyboard.JustDown(this.keyJ))) {
        this.doAttack()
        if (!this.state.gameOver) this.turnTimer = this.turnCooldown
      }
    }

    this.drawEntities()
    this.imGui.begin()
    this.paintUI()
    this.imGui.end()
  }

  doMove(dx, dy) {
    const nx = this.state.player.x + (dx > 0 ? 1 : dx < 0 ? -1 : 0)
    const ny = this.state.player.y + (dy > 0 ? 1 : dy < 0 ? -1 : 0)

    if (this.state.enemies.some(e => e.x === nx && e.y === ny) ||
        this.state.treasures.some(t => t.x === nx && t.y === ny)) {
      this.addAttackFx(nx, ny)
    }

    const hpBefore = this.state.hp
    const floorBefore = this.state.floor
    movePlayer(this.state, dx, dy)

    if (this.state.hp < hpBefore && !this.state.gameOver) {
      this.addAttackFx(this.state.player.x, this.state.player.y)
    }
    if (this.state.floor !== floorBefore) this.drawTiles()
  }

  doAttack() {
    const tx = this.state.player.x + this.state.facing.x
    const ty = this.state.player.y + this.state.facing.y
    this.addAttackFx(tx, ty)

    const hpBefore = this.state.hp
    playerAttack(this.state)

    if (this.state.hp < hpBefore && !this.state.gameOver) {
      this.addAttackFx(this.state.player.x, this.state.player.y)
    }
  }

  addAttackFx(x, y) {
    this.attackFxs.push({ x, y, timer: 250 })
  }

  doSave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData(this.state)))
      this.addMessage('Game saved!')
    } catch (e) {
      this.addMessage('Save failed!')
    }
  }

  doLoad() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) { this.addMessage('No save found!'); return }
      loadStateData(this.state, JSON.parse(raw))
      this.drawTiles()
      this.addMessage('Game loaded!')
    } catch (e) {
      this.addMessage('Load failed!')
    }
  }

  addMessage(msg) {
    this.state.messages.push(msg)
    if (this.state.messages.length > 2) this.state.messages.shift()
  }

  restart() {
    this.state = createState()
    initFloor(this.state, 1)
    this.drawTiles()
  }

  drawTiles() {
    this.tileGfx.clear()
    const ox = this.mapOffsetX
    const oy = this.mapOffsetY
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const px = ox + x * TILE_SIZE
        const py = oy + y * TILE_SIZE
        if (this.state.map[y][x] === TILE.WALL) {
          this.tileGfx.fillStyle(COLORS.WALL, 1)
          this.tileGfx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
          this.tileGfx.fillStyle(0x222222, 1)
          this.tileGfx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2)
        } else {
          this.tileGfx.fillStyle(COLORS.FLOOR, 1)
          this.tileGfx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
          this.tileGfx.fillStyle(0x333333, 1)
          this.tileGfx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2)
        }
      }
    }
  }

  drawEntities() {
    const gfx = this.entityGfx
    gfx.clear()
    const ox = this.mapOffsetX
    const oy = this.mapOffsetY
    const blink = Math.sin(this.blinkTimer * 0.006) > 0

    for (const fx of this.attackFxs) {
      const px = ox + fx.x * TILE_SIZE
      const py = oy + fx.y * TILE_SIZE
      const a = fx.timer / 250
      gfx.fillStyle(0xffff44, a * 0.6)
      gfx.fillRect(px, py, TILE_SIZE, TILE_SIZE)
      gfx.lineStyle(2, 0xffff44, a * 0.9)
      gfx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2)
    }

    for (const t of this.state.treasures) {
      const px = ox + t.x * TILE_SIZE
      const py = oy + t.y * TILE_SIZE
      gfx.fillStyle(COLORS.CHEST, 1)
      gfx.fillRect(px + 4, py + 8, TILE_SIZE - 8, TILE_SIZE - 8)
      gfx.fillStyle(0xA0522D, 1)
      gfx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 6)
      gfx.fillStyle(0xffdd44, 1)
      gfx.fillRect(px + 13, py + 12, 6, 6)
    }

    for (const g of this.state.gold) {
      const cx = ox + g.x * TILE_SIZE + TILE_SIZE / 2
      const cy = oy + g.y * TILE_SIZE + TILE_SIZE / 2
      gfx.fillStyle(COLORS.TREASURE, 1)
      gfx.fillTriangle(cx, cy - 4, cx - 4, cy, cx + 4, cy)
      gfx.fillTriangle(cx, cy + 4, cx - 4, cy, cx + 4, cy)
      gfx.fillStyle(0xcc9900, 1)
      gfx.fillTriangle(cx, cy - 2, cx - 2, cy, cx + 2, cy)
      gfx.fillTriangle(cx, cy + 2, cx - 2, cy, cx + 2, cy)
    }

    if (this.state.exit && !this.state.gameOver) {
      const px = ox + this.state.exit.x * TILE_SIZE
      const py = oy + this.state.exit.y * TILE_SIZE
      const a = blink ? 0.6 : 0.3
      gfx.fillStyle(COLORS.EXIT, a)
      gfx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      gfx.fillStyle(0x33cc66, a + 0.2)
      gfx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12)
    }

    for (const e of this.state.enemies) {
      const px = ox + e.x * TILE_SIZE
      const py = oy + e.y * TILE_SIZE
      gfx.fillStyle(COLORS.ENEMY, 1)
      gfx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      gfx.fillStyle(0xcc2222, 1)
      gfx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12)
    }

    if (this.state.player) {
      const px = ox + this.state.player.x * TILE_SIZE
      const py = oy + this.state.player.y * TILE_SIZE
      gfx.fillStyle(COLORS.PLAYER, 1)
      gfx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4)
      gfx.fillStyle(0x2266cc, 1)
      gfx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12)

      const cx = px + TILE_SIZE / 2
      const cy = py + TILE_SIZE / 2
      gfx.fillStyle(0xffffff, 0.9)
      if (this.state.facing.x === 0 && this.state.facing.y === -1) {
        gfx.fillTriangle(cx, cy - 10, cx - 5, cy - 2, cx + 5, cy - 2)
      } else if (this.state.facing.x === 0 && this.state.facing.y === 1) {
        gfx.fillTriangle(cx, cy + 10, cx - 5, cy + 2, cx + 5, cy + 2)
      } else if (this.state.facing.x === -1) {
        gfx.fillTriangle(cx - 10, cy, cx - 2, cy - 5, cx - 2, cy + 5)
      } else if (this.state.facing.x === 1) {
        gfx.fillTriangle(cx + 10, cy, cx + 2, cy - 5, cx + 2, cy + 5)
      }
    }
  }

  paintUI() {
    const gui = this.imGui
    const s = this.state

    gui.panel(0, 0, GAME_WIDTH, TOP_UI, 0x0d0d0d)
    gui.line(0, TOP_UI, GAME_WIDTH, TOP_UI, 0x333333, 0.6)

    gui.progressBar(8, TOP_UI / 2 - 7, 120, 14, s.hp, s.maxHp, 0xff4444, 0x2a2a2a)
    gui.text(134, TOP_UI / 2 - 6, `生命 ${s.hp}/${s.maxHp}`, '#ffffff', '11px')
    gui.text(GAME_WIDTH * 0.75, TOP_UI / 2, `F${s.floor}`, '#88ff88', '12px', 0.5, 0.5)
    gui.text(GAME_WIDTH - 8, TOP_UI / 2, `$${s.score}`, '#ffdd44', '12px', 1, 0.5)

    gui.panel(0, GAME_HEIGHT - BOTTOM_UI, GAME_WIDTH, BOTTOM_UI, 0x0d0d0d)
    gui.line(0, GAME_HEIGHT - BOTTOM_UI, GAME_WIDTH, GAME_HEIGHT - BOTTOM_UI, 0x333333, 0.6)

    const msg = s.messages.join('  |  ')
    gui.text(8, GAME_HEIGHT - BOTTOM_UI + 6, msg, '#aaaaaa', '10px')

    if (gui.button(GAME_WIDTH - 142, GAME_HEIGHT - BOTTOM_UI + 4, 44, 22, '攻击')) this.doAttack()
    if (gui.button(GAME_WIDTH - 94, GAME_HEIGHT - BOTTOM_UI + 4, 44, 22, '存档')) this.doSave()
    if (gui.button(GAME_WIDTH - 46, GAME_HEIGHT - BOTTOM_UI + 4, 44, 22, '读档')) this.doLoad()
    gui.text(GAME_WIDTH - 146, GAME_HEIGHT - 4, '← 滑', '#444444', '9px', 1, 1)

    if (s.exit && !s.gameOver) {
      const px = this.mapOffsetX + s.exit.x * TILE_SIZE
      const py = this.mapOffsetY + s.exit.y * TILE_SIZE
      const cx = px + TILE_SIZE / 2
      const cy = py + TILE_SIZE / 2
      if (Math.sin(this.blinkTimer * 0.006) > 0) {
        gui.text(cx, cy - 7, '^', '#88ff88', '16px', 0.5, 0.5)
        gui.text(cx, cy + 7, '^', '#88ff88', '16px', 0.5, 0.5)
      }
    }

    if (this.saveTimer > 0) {
      gui.text(GAME_WIDTH / 2, TOP_UI / 2 + 14, 'SAVED', '#88ff88', '10px', 0.5, 0.5)
    }

    if (s.gameOver) {
      if (Math.floor(this.blinkTimer / 500) % 2 === 0) {
        gui.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 36, 'GAME OVER', '#ff4444', '22px', 0.5, 0.5)
      }
      if (gui.button(GAME_WIDTH / 2 - 50, GAME_HEIGHT / 2 + 4, 100, 30, 'Restart')) {
        this.restart()
      }
    }
  }
}
