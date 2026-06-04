export default class ImGui {
  constructor(scene) {
    this.scene = scene
    this.gfx = scene.add.graphics()
    this.textPool = []
    this.idx = 0
    this.pointer = scene.input.activePointer
    this.clickQueue = []
    this.clicks = []
    this.pointerX = 0
    this.pointerY = 0

    scene.input.on('pointerup', (p) => {
      this.clickQueue.push({ x: p.x, y: p.y })
    })
  }

  clearClicks() {
    this.clickQueue.length = 0
  }

  begin() {
    this.gfx.clear()
    this.idx = 0
    this.clicks = this.clickQueue.splice(0)
    this.pointerX = this.pointer.x
    this.pointerY = this.pointer.y
  }

  _txt() {
    let t = this.textPool[this.idx]
    if (!t) {
      t = this.scene.add.text(0, 0, '', {
        fontSize: '14px', fill: '#ffffff', fontFamily: '"Noto Sans SC", monospace, sans-serif',
      })
      this.textPool.push(t)
    }
    t.setVisible(true)
    this.idx++
    return t
  }

  text(x, y, str, color = '#ffffff', size = '14px', ox = 0, oy = 0) {
    const t = this._txt()
    t.setPosition(x, y).setOrigin(ox, oy)
    t.setStyle({ fontSize: size, fill: color, fontFamily: '"Noto Sans SC", monospace, sans-serif' })
    t.setText(str)
  }

  panel(x, y, w, h, color = 0x222222, a = 1) {
    this.gfx.fillStyle(color, a)
    this.gfx.fillRect(x, y, w, h)
  }

  border(x, y, w, h, color = 0x555555, a = 1) {
    this.gfx.lineStyle(1, color, a)
    this.gfx.strokeRect(x, y, w, h)
  }

  line(x1, y1, x2, y2, color = 0x444444, a = 0.6) {
    this.gfx.lineStyle(1, color, a)
    this.gfx.lineBetween(x1, y1, x2, y2)
  }

  clicked(x, y, w, h) {
    return this.clicks.some(c => c.x >= x && c.x <= x + w && c.y >= y && c.y <= y + h)
  }

  hit(x, y, w, h) {
    return this.pointerX >= x && this.pointerX <= x + w &&
           this.pointerY >= y && this.pointerY <= y + h
  }

  button(x, y, w, h, label) {
    const isDown = this.hit(x, y, w, h) && this.pointer.isDown
    const click = this.clicked(x, y, w, h)

    this.gfx.fillStyle(isDown ? 0x5a5a5a : click ? 0x4a4a4a : 0x222222, 1)
    this.gfx.fillRoundedRect(x, y, w, h, 3)
    this.gfx.lineStyle(1, 0x666666, 1)
    this.gfx.strokeRoundedRect(x, y, w, h, 3)

    const t = this._txt()
    t.setPosition(x + w / 2, y + h / 2).setOrigin(0.5, 0.5)
    t.setStyle({ fontSize: '13px', fill: '#ffffff', fontFamily: '"Noto Sans SC", monospace, sans-serif' })
    t.setText(label)

    return click
  }

  progressBar(x, y, w, h, val, max, fg = 0xff4444, bg = 0x222222) {
    this.gfx.fillStyle(bg, 1)
    this.gfx.fillRect(x, y, w, h)
    const r = Math.max(0, Math.min(1, val / max))
    if (r > 0) {
      this.gfx.fillStyle(fg, 1)
      this.gfx.fillRect(x + 2, y + 2, (w - 4) * r, h - 4)
    }
    this.gfx.lineStyle(1, 0x555555, 0.6)
    this.gfx.strokeRect(x, y, w, h)
  }

  end() {
    for (let i = this.idx; i < this.textPool.length; i++) {
      this.textPool[i].setVisible(false)
    }
  }
}
