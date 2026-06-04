# Agent 说明

## 游戏逻辑的临时自测

游戏状态，游戏逻辑应该和 Phaser 的渲染、输入、UI 代码保持分离。
检查规则或复现 bug 时，优先使用临时的内联 Node 脚本，不要为了临时验证而创建永久测试文件。

推荐使用这种形式：

```bash
node --input-type=module - <<'JS'

JS
```

