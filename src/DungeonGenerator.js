import { TILE, MAP_COLS, MAP_ROWS, MIN_ROOMS, MAX_ROOMS } from './constants.js'

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function createRoom() {
  const w = rand(3, 5)
  const h = rand(3, 5)
  const x = rand(1, MAP_COLS - w - 1)
  const y = rand(1, MAP_ROWS - h - 1)
  return { x, y, w, h }
}

function overlaps(a, b) {
  return a.x - 1 < b.x + b.w && a.x + a.w + 1 > b.x &&
         a.y - 1 < b.y + b.h && a.y + a.h + 1 > b.y
}

function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      map[y][x] = TILE.FLOOR
    }
  }
}

function roomCenter(room) {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  }
}

function carveCorridor(map, x1, y1, x2, y2) {
  let x = x1
  let y = y1

  while (x !== x2) {
    if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
      map[y][x] = TILE.FLOOR
    }
    x += x < x2 ? 1 : -1
  }

  while (y !== y2) {
    if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
      map[y][x] = TILE.FLOOR
    }
    y += y < y2 ? 1 : -1
  }

  if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
    map[y][x] = TILE.FLOOR
  }
}

export function generateDungeon(floor) {
  const map = Array.from({ length: MAP_ROWS }, () =>
    Array(MAP_COLS).fill(TILE.WALL)
  )

  const numRooms = rand(MIN_ROOMS, MAX_ROOMS)
  const rooms = []

  for (let i = 0; i < numRooms * 3 && rooms.length < numRooms; i++) {
    const room = createRoom()
    if (!rooms.some(r => overlaps(r, room))) {
      carveRoom(map, room)
      rooms.push(room)
    }
  }

  if (rooms.length < 2) {
    rooms.length = 0
    const r1 = { x: 1, y: 2, w: 4, h: 4 }
    const r2 = { x: MAP_COLS - 5, y: MAP_ROWS - 5, w: 4, h: 4 }
    carveRoom(map, r1)
    carveRoom(map, r2)
    rooms.push(r1, r2)
    carveCorridor(map, 4, 4, MAP_COLS - 4, MAP_ROWS - 3)
  }

  for (let i = 1; i < rooms.length; i++) {
    const a = roomCenter(rooms[i - 1])
    const b = roomCenter(rooms[i])
    carveCorridor(map, a.x, a.y, b.x, b.y)
  }

  const playerStart = roomCenter(rooms[0])

  const enemies = []
  for (let i = 1; i < rooms.length - 1; i++) {
    const c = roomCenter(rooms[i])
    enemies.push({ x: c.x, y: c.y, hp: 1 })
  }

  const treasures = []
  for (let i = 1; i < rooms.length - 1; i++) {
    if (Math.random() < 0.4) {
      const c = roomCenter(rooms[i])
      const off = rand(0, 1) === 0 ? [1, 0] : [0, 1]
      treasures.push({ x: c.x + off[0], y: c.y + off[1], hp: 2 })
    }
  }

  const exit = roomCenter(rooms[rooms.length - 1])

  return { map, playerStart, enemies, treasures, exit }
}
