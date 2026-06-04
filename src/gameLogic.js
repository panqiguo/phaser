import { generateDungeon } from './DungeonGenerator.js'
import { TILE, MAP_COLS, MAP_ROWS } from './constants.js'

export function createState(overrides = {}) {
  return {
    map: null,
    player: { x: 0, y: 0 },
    enemies: [],
    treasures: [],
    gold: [],
    exit: { x: 0, y: 0 },
    facing: { x: 0, y: 1 },
    hp: 5,
    maxHp: 5,
    score: 0,
    floor: 1,
    turn: 0,
    gameOver: false,
    messages: [],
    ...overrides,
  }
}

export function initFloor(state, floor) {
  const d = generateDungeon(floor)
  state.map = d.map
  state.player = { x: d.playerStart.x, y: d.playerStart.y }
  state.enemies = d.enemies.map(e => ({ ...e }))
  state.treasures = d.treasures.map(t => ({ ...t, hp: 2 }))
  state.gold = []
  state.exit = { x: d.exit.x, y: d.exit.y }
  state.turn = 0
}

function adjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
}

export function addMessage(state, msg) {
  state.messages.push(msg)
  if (state.messages.length > 2) state.messages.shift()
}

export function die(state) {
  state.gameOver = true
  addMessage(state, 'Died. Tap Restart.')
}

export function enemyAttack(state) {
  state.hp--
  addMessage(state, 'Enemy attacks! -1 HP')
  if (state.hp <= 0) die(state)
}

export function movePlayer(state, dx, dy) {
  if (dx !== 0 || dy !== 0) { state.facing.x = dx; state.facing.y = dy }

  const nx = state.player.x + dx
  const ny = state.player.y + dy

  if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) return
  if (state.map[ny][nx] === TILE.WALL) return

  const ei = state.enemies.findIndex(e => e.x === nx && e.y === ny)
  if (ei !== -1) {
    state.enemies.splice(ei, 1)
    state.score += 50
    addMessage(state, 'Bump attack! +50')
    endTurn(state)
    return
  }

  const ti = state.treasures.findIndex(t => t.x === nx && t.y === ny)
  if (ti !== -1) {
    state.treasures[ti].hp--
    if (state.treasures[ti].hp <= 0) {
      state.gold.push({ x: nx, y: ny })
      state.treasures.splice(ti, 1)
      state.score += 100
      addMessage(state, '宝箱碎了! 掉出金币!')
    } else {
      addMessage(state, `撞击宝箱! (${state.treasures[ti].hp}HP 剩余)`)
    }
    endTurn(state)
    return
  }

  const gi = state.gold.findIndex(g => g.x === nx && g.y === ny)
  if (gi !== -1) {
    state.gold.splice(gi, 1)
    state.score += 100
    addMessage(state, '拾取金币! +100')
  }

  state.player.x = nx
  state.player.y = ny

  if (nx === state.exit.x && ny === state.exit.y) {
    state.floor++
    addMessage(state, `Floor ${state.floor}...`)
    initFloor(state, state.floor)
    return
  }

  endTurn(state)
}

export function playerAttack(state) {
  const tx = state.player.x + state.facing.x
  const ty = state.player.y + state.facing.y

  if (tx < 0 || tx >= MAP_COLS || ty < 0 || ty >= MAP_ROWS) {
    addMessage(state, 'Swing at nothing!')
    endTurn(state)
    return
  }
  if (state.map[ty][tx] === TILE.WALL) {
    addMessage(state, 'Clang! Hit wall.')
    endTurn(state)
    return
  }

  const ei = state.enemies.findIndex(e => e.x === tx && e.y === ty)
  if (ei !== -1) {
    state.enemies.splice(ei, 1)
    state.score += 50
    addMessage(state, 'Hit enemy! +50')
    endTurn(state)
    return
  }

  const ti = state.treasures.findIndex(t => t.x === tx && t.y === ty)
  if (ti !== -1) {
    state.treasures[ti].hp--
    if (state.treasures[ti].hp <= 0) {
      state.gold.push({ x: tx, y: ty })
      state.treasures.splice(ti, 1)
      state.score += 100
      addMessage(state, '宝箱碎了! 掉出金币!')
    } else {
      addMessage(state, `攻击宝箱! (${state.treasures[ti].hp}HP 剩余)`)
    }
    endTurn(state)
    return
  }

  if (tx === state.exit.x && ty === state.exit.y) {
    addMessage(state, 'Swung at the exit stairs...')
    endTurn(state)
    return
  }

  addMessage(state, 'Swing at empty air!')
  endTurn(state)
}

export function endTurn(state, rng = Math.random) {
  state.turn++
  moveEnemies(state, rng)
}

export function moveEnemies(state, rng = Math.random) {
  for (const enemy of state.enemies) {
    const dx = Math.sign(state.player.x - enemy.x)
    const dy = Math.sign(state.player.y - enemy.y)

    if (adjacent(enemy, state.player)) {
      enemyAttack(state)
      continue
    }

    const preferX = rng() < 0.5
    let moved = false
    if (preferX && dx !== 0) moved = tryMoveEnemy(state, enemy, dx, 0)
    if (!moved && dy !== 0) moved = tryMoveEnemy(state, enemy, 0, dy)
    if (!moved && !preferX && dx !== 0) tryMoveEnemy(state, enemy, dx, 0)
  }
}

function tryMoveEnemy(state, enemy, dx, dy) {
  const nx = enemy.x + dx
  const ny = enemy.y + dy

  if (nx < 0 || nx >= MAP_COLS || ny < 0 || ny >= MAP_ROWS) return false
  if (state.map[ny][nx] === TILE.WALL) return false
  if (state.enemies.some(e => e !== enemy && e.x === nx && e.y === ny)) return false
  if (state.treasures.some(t => t.x === nx && t.y === ny)) return false

  if (state.player.x === nx && state.player.y === ny) {
    enemyAttack(state)
    return true
  }

  enemy.x = nx
  enemy.y = ny
  return true
}

export function saveData(state) {
  return {
    floor: state.floor,
    hp: state.hp,
    maxHp: state.maxHp,
    score: state.score,
    messages: [...state.messages],
    turn: state.turn,
    facing: { ...state.facing },
    player: { ...state.player },
    map: state.map,
    enemies: state.enemies.map(e => ({ ...e })),
    treasures: state.treasures.map(t => ({ ...t })),
    gold: state.gold.map(g => ({ ...g })),
    exit: { ...state.exit },
  }
}

export function loadData(state, data) {
  state.floor = data.floor
  state.hp = data.hp
  state.maxHp = data.maxHp
  state.score = data.score
  state.messages = data.messages
  state.turn = data.turn
  state.facing = data.facing || { x: 0, y: 1 }
  state.player = data.player
  state.map = data.map
  state.enemies = data.enemies
  state.treasures = data.treasures
  state.gold = data.gold || []
  state.exit = data.exit
  state.gameOver = false
}
