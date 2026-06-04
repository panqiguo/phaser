import { createState, initFloor, movePlayer, playerAttack, enemyAttack, moveEnemies, endTurn, saveData, loadData, die, addMessage } from '../src/gameLogic.js'
import { TILE, MAP_COLS, MAP_ROWS } from '../src/constants.js'

const F = TILE.FLOOR
const W = TILE.WALL

function openMap() {
  const map = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(F))
  for (let x = 0; x < MAP_COLS; x++) { map[0][x] = W; map[MAP_ROWS - 1][x] = W }
  for (let y = 0; y < MAP_ROWS; y++) { map[y][0] = W; map[y][MAP_COLS - 1] = W }
  map[3][3] = W
  return map
}

const defMap = openMap()

function makeState(overrides) {
  return createState({
    map: defMap,
    player: { x: 1, y: 1 },
    enemies: [],
    treasures: [],
    exit: { x: 9, y: 9 },
    facing: { x: 0, y: 1 },
    hp: 5, maxHp: 5, score: 0, floor: 1, turn: 0,
    gameOver: false, messages: [],
    ...overrides,
  })
}

function seqRng(...vals) {
  let i = 0
  return () => vals[i++ % vals.length]
}

let pass = 0
let fail = 0

function check(cond, label) {
  if (cond) pass++
  else { fail++; console.error(`FAIL: ${label}`) }
}

function is(a, b, label) {
  check(a === b, `${label}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}

// =============================================
// createState
// =============================================
{
  const s = createState()
  is(s.hp, 5, 'default hp')
  is(s.maxHp, 5, 'default maxHp')
  is(s.score, 0, 'default score')
  is(s.floor, 1, 'default floor')
  is(s.turn, 0, 'default turn')
  is(s.gameOver, false, 'default gameOver')
  is(s.facing.x, 0, 'default facing.x')
  is(s.facing.y, 1, 'default facing.y')
  is(s.messages.length, 0, 'default messages empty')
}

// =============================================
// initFloor
// =============================================
{
  const s = createState()
  initFloor(s, 1)
  check(s.map !== null, 'initFloor: map generated')
  check(s.player.x > 0 && s.player.x < MAP_COLS - 1, 'initFloor: player on valid x')
  check(s.player.y > 0 && s.player.y < MAP_ROWS - 1, 'initFloor: player on valid y')
  is(s.turn, 0, 'initFloor: turn reset')
}

// =============================================
// movePlayer
// =============================================
{
  const s = makeState()
  movePlayer(s, 1, 0)
  is(s.player.x, 2, 'move right: x')
  is(s.player.y, 1, 'move right: y')
  is(s.facing.x, 1, 'move right: facing.x')
  is(s.facing.y, 0, 'move right: facing.y')
  is(s.turn, 1, 'move right: turn advanced')
  is(s.score, 0, 'move right: no score')
}

{
  const s = makeState()
  movePlayer(s, 0, -1)
  is(s.player.x, 1, 'wall up: x unchanged')
  is(s.player.y, 1, 'wall up: y unchanged')
  is(s.facing.x, 0, 'wall up: facing.x')
  is(s.facing.y, -1, 'wall up: facing.y updated')
  is(s.turn, 0, 'wall up: turn not advanced')
}

{
  const s = makeState()
  movePlayer(s, 99, 0)
  is(s.player.x, 1, 'oob right: x unchanged')
  is(s.player.y, 1, 'oob right: y unchanged')
  is(s.turn, 0, 'oob right: turn not advanced')
}

{
  const s = makeState({ enemies: [{ x: 2, y: 1, hp: 1 }] })
  movePlayer(s, 1, 0)
  is(s.player.x, 1, 'bump: player stays x')
  is(s.player.y, 1, 'bump: player stays y')
  is(s.enemies.length, 0, 'bump: enemy removed')
  is(s.score, 50, 'bump: +50 score')
  is(s.turn, 1, 'bump: turn advanced')
}

{
  const s = makeState({ treasures: [{ x: 2, y: 1, hp: 2 }] })
  movePlayer(s, 1, 0)
  is(s.player.x, 1, 'bump chest: player stays x')
  is(s.player.y, 1, 'bump chest: player stays y')
  is(s.treasures[0].hp, 1, 'bump chest: hp reduced')
  is(s.treasures.length, 1, 'bump chest: not removed')
  is(s.turn, 1, 'bump chest: turn advanced')
  check(s.messages.some(m => m.includes('宝箱')), 'bump chest: message')
}

{
  const s = makeState({ gold: [{ x: 2, y: 1 }] })
  movePlayer(s, 1, 0)
  is(s.player.x, 2, 'gold: moved to tile x')
  is(s.player.y, 1, 'gold: moved to tile y')
  is(s.gold.length, 0, 'gold: removed')
  is(s.score, 100, 'gold: +100 score')
  is(s.turn, 1, 'gold: turn advanced')
}

{
  const s = makeState({ player: { x: 1, y: 2 }, facing: { x: 1, y: 0 }, treasures: [{ x: 2, y: 2, hp: 2 }] })
  playerAttack(s)
  is(s.treasures[0].hp, 1, 'attack chest: hp reduced')
  is(s.treasures.length, 1, 'attack chest: not removed yet')
  is(s.score, 0, 'attack chest: no score yet')
  is(s.turn, 1, 'attack chest: turn advanced')
}

{
  const s = makeState({ player: { x: 1, y: 2 }, facing: { x: 1, y: 0 }, treasures: [{ x: 2, y: 2, hp: 1 }] })
  playerAttack(s)
  is(s.treasures.length, 0, 'destroy chest: removed')
  is(s.gold.length, 1, 'destroy chest: gold spawned')
  is(s.gold[0].x, 2, 'destroy chest: gold at x')
  is(s.gold[0].y, 2, 'destroy chest: gold at y')
  is(s.score, 100, 'destroy chest: +100 score')
  is(s.turn, 1, 'destroy chest: turn advanced')
}

{
  const s = makeState({ player: { x: 8, y: 8 }, exit: { x: 9, y: 8 } })
  movePlayer(s, 1, 0)
  is(s.floor, 2, 'exit: floor increased')
  check(s.player.x >= 1 && s.player.x < MAP_COLS - 1, 'exit: player on new map')
}

{
  const s = makeState({ facing: { x: 1, y: 0 } })
  movePlayer(s, 0, 0)
  is(s.facing.x, 1, 'zero move: facing.x preserved')
  is(s.facing.y, 0, 'zero move: facing.y preserved')
  is(s.player.x, 1, 'zero move: player x unchanged')
  is(s.player.y, 1, 'zero move: player y unchanged')
  is(s.turn, 1, 'zero move: moving in place advances turn')
}

// =============================================
// playerAttack
// =============================================
{
  const s = makeState({ player: { x: 2, y: 2 }, facing: { x: 0, y: -1 } })
  playerAttack(s)
  is(s.enemies.length, 0, 'attack air: no enemies removed')
  is(s.turn, 1, 'attack air: turn advanced')
  check(s.messages.some(m => m.includes('empty air')), 'attack air: "empty air" message')
}

{
  const s = makeState({ player: { x: 3, y: 4 }, facing: { x: 0, y: -1 } })
  playerAttack(s)
  is(s.turn, 1, 'attack wall: turn advanced')
  check(s.messages.some(m => m.includes('Clang')), 'attack wall: clang message')
}

{
  const s = makeState({ player: { x: 1, y: 2 }, facing: { x: 1, y: 0 }, enemies: [{ x: 2, y: 2, hp: 1 }] })
  playerAttack(s)
  is(s.enemies.length, 0, 'attack enemy: removed')
  is(s.score, 50, 'attack enemy: +50')
  is(s.turn, 1, 'attack enemy: turn advanced')
}

{
  const s = makeState({ player: { x: 8, y: 9 }, facing: { x: 1, y: 0 }, exit: { x: 9, y: 9 } })
  playerAttack(s)
  is(s.turn, 1, 'attack exit: turn advanced')
  is(s.floor, 1, 'attack exit: floor not changed')
  check(s.messages.some(m => m.includes('exit stairs')), 'attack exit: stairs message')
}

{
  const s = makeState({ player: { x: 1, y: 1 }, facing: { x: 0, y: -1 } })
  playerAttack(s)
  is(s.turn, 1, 'attack wall from edge: turn advanced')
  check(s.messages.some(m => m.includes('Clang')), 'attack wall from edge: clang message')
}

// =============================================
// enemyAttack
// =============================================
{
  const s = makeState({ hp: 5 })
  enemyAttack(s)
  is(s.hp, 4, 'basic: hp -1')
  is(s.gameOver, false, 'basic: not dead')
}

{
  const s = makeState({ hp: 1 })
  enemyAttack(s)
  is(s.hp, 0, 'lethal: hp 0')
  is(s.gameOver, true, 'lethal: gameOver')
  check(s.messages.some(m => m.includes('Died')), 'lethal: Died message')
}

// =============================================
// die
// =============================================
{
  const s = makeState()
  die(s)
  is(s.gameOver, true, 'gameOver set')
  check(s.messages.some(m => m.includes('Died')), 'Died message')
}

// =============================================
// moveEnemies
// =============================================
{
  const s = makeState({ player: { x: 2, y: 2 }, enemies: [{ x: 3, y: 2, hp: 1 }], hp: 5 })
  moveEnemies(s, seqRng(0.5, 0.5))
  is(s.hp, 4, 'adjacent attack: hp dropped')
  is(s.enemies.length, 1, 'adjacent attack: enemy stays')
}

{
  const s = makeState({ player: { x: 4, y: 2 }, enemies: [{ x: 1, y: 2, hp: 1 }] })
  moveEnemies(s, seqRng(0.5))
  is(s.enemies[0].x, 2, 'approach: moved toward player x')
  is(s.enemies[0].y, 2, 'approach: y unchanged')
}

{
  const s = makeState({
    player: { x: 3, y: 2 },
    enemies: [{ x: 3, y: 4, hp: 1 }],
  })
  moveEnemies(s, seqRng(0.0))
  is(s.enemies[0].x, 3, 'blocked wall: x unchanged')
  is(s.enemies[0].y, 4, 'blocked wall: y unchanged')
}

{
  const s = makeState({
    player: { x: 4, y: 2 },
    enemies: [
      { x: 2, y: 2, hp: 1 },
      { x: 3, y: 2, hp: 1 },
    ],
    hp: 5,
  })
  moveEnemies(s, seqRng(0.5))
  is(s.enemies[0].x, 2, 'blocked enemy: first enemy x unchanged')
  is(s.enemies[0].y, 2, 'blocked enemy: first enemy y unchanged')
  is(s.hp, 4, 'blocked enemy: second enemy walked into player')
}

{
  const s = makeState({
    player: { x: 3, y: 2 },
    enemies: [{ x: 2, y: 2, hp: 1 }],
    hp: 5,
  })
  moveEnemies(s, seqRng(0.5))
  is(s.hp, 4, 'walk into player: hp dropped')
  is(s.enemies.length, 1, 'walk into player: enemy stays')
}

{
  const s = makeState({ enemies: [] })
  moveEnemies(s)
  is(s.turn, 0, 'no enemies: no crash, turn unchanged')
}

// =============================================
// endTurn
// =============================================
{
  const s = makeState()
  endTurn(s, seqRng(0.5))
  is(s.turn, 1, 'endTurn: turn incremented')
}

// =============================================
// saveData / loadData roundtrip
// =============================================
{
  const s1 = makeState({
    player: { x: 3, y: 4 },
    enemies: [{ x: 5, y: 5, hp: 1 }],
    treasures: [{ x: 7, y: 7, hp: 2 }],
    gold: [{ x: 8, y: 8 }],
    hp: 3, score: 150, floor: 2, turn: 10,
    facing: { x: 0, y: -1 },
    messages: ['hello', 'world'],
  })
  const data = saveData(s1)
  const s2 = createState()
  loadData(s2, data)
  is(s2.hp, 3, 'roundtrip: hp')
  is(s2.score, 150, 'roundtrip: score')
  is(s2.floor, 2, 'roundtrip: floor')
  is(s2.turn, 10, 'roundtrip: turn')
  is(s2.facing.x, 0, 'roundtrip: facing.x')
  is(s2.facing.y, -1, 'roundtrip: facing.y')
  is(s2.player.x, 3, 'roundtrip: player.x')
  is(s2.player.y, 4, 'roundtrip: player.y')
  is(s2.enemies.length, 1, 'roundtrip: 1 enemy')
  is(s2.enemies[0].x, 5, 'roundtrip: enemy.x')
  is(s2.treasures.length, 1, 'roundtrip: 1 treasure')
  is(s2.gold.length, 1, 'roundtrip: 1 gold')
  is(s2.gold[0].x, 8, 'roundtrip: gold.x')
  is(s2.messages.length, 2, 'roundtrip: 2 messages')
  is(s2.messages[0], 'hello', 'roundtrip: msg[0]')
  is(s2.messages[1], 'world', 'roundtrip: msg[1]')
  is(s2.gameOver, false, 'roundtrip: gameOver reset to false')
  check(s2.map !== null, 'roundtrip: map preserved')
}

// =============================================
// addMessage
// =============================================
{
  const s = makeState()
  addMessage(s, 'one')
  is(s.messages.length, 1, 'add: one message')
  addMessage(s, 'two')
  is(s.messages.length, 2, 'add: two messages')
  addMessage(s, 'three')
  is(s.messages.length, 2, 'add: capped at 2')
  is(s.messages[0], 'two', 'add: oldest removed')
  is(s.messages[1], 'three', 'add: newest kept')
}

// =============================================
// Summary
// =============================================
console.log(`\n${pass + fail} tests: ${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
