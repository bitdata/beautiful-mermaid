<div align="center">

# beautiful-mermaid

**将 Mermaid 图表渲染为精美 SVG 或 ASCII 艺术**

极速、全主题、零 DOM 依赖。为 AI 时代而生。

![beautiful-mermaid 时序图示例](hero.png)

[![npm version](https://img.shields.io/npm/v/beautiful-mermaid.svg)](https://www.npmjs.com/package/beautiful-mermaid)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[**在线演示与示例**](https://agents.craft.do/mermaid) · [**English**](README.md)

**[→ 在 Craft Agents 中使用](https://agents.craft.do)**

</div>

---

## 为什么做这个

图表对 AI 辅助编程至关重要。在与 AI 编程助手协作时，能在终端或聊天界面中直接看到数据流、状态机和系统架构的可视化，能让复杂概念一目了然。

[Mermaid](https://mermaid.js.org/) 是事实上的文本图表标准，非常出色。但默认渲染器存在一些问题：

- **观感** — 或许见仁见智，但我们希望图表更专业
- **主题复杂** — 想改颜色就得和一堆 CSS 类较劲
- **无终端输出** — 无法为 CLI 工具输出 ASCII
- **依赖较重** — 简单图表也要拉很多代码

我们在 [Craft](https://craft.do) 开发了 `beautiful-mermaid`，为 [Craft Agents](https://agents.craft.do) 提供图表能力。它快速、美观，从富 UI 到纯终端都能用。

ASCII 渲染引擎基于 Alexander Grooff 的 [mermaid-ascii](https://github.com/AlexanderGrooff/mermaid-ascii)，我们从 Go 移植到 TypeScript 并做了扩展。感谢 Alexander 的优秀基础！（以及证明这是可行的灵感。）

## 特性

- **6 种图表类型** — 流程图、状态图、时序图、类图、ER 图、XY 图（柱状、折线、组合）
- **双输出** — SVG 用于富 UI，ASCII/Unicode 用于终端
- **同步渲染** — 无异步、无闪烁，可与 React `useMemo()` 配合
- **15 个内置主题** — 自定义主题也很简单
- **完整 Shiki 兼容** — 可直接使用任意 VS Code 主题
- **实时主题切换** — 基于 CSS 变量，无需重新渲染
- **双色模式** — 仅用两种颜色即可得到美观图表
- **零 DOM 依赖** — 纯 TypeScript，随处可用
- **极速** — 500ms 内渲染 100+ 张图

## 安装

```bash
npm install beautiful-mermaid
# 或
bun add beautiful-mermaid
# 或
pnpm add beautiful-mermaid
```

## 本地 Playground

不想写代码就想试试？在本仓库中执行：

```bash
bun run playground
```

然后在浏览器中打开 **http://localhost:3333**。粘贴 Mermaid 源码、在 SVG 与 ASCII 输出间切换、选择 15 种主题之一、一键复制结果。输入内容和设置会保存在浏览器中。

## 快速开始

### SVG 输出

```typescript
import { renderMermaidSVG } from 'beautiful-mermaid'

const svg = renderMermaidSVG(`
  graph TD
    A[开始] --> B{判断}
    B -->|是| C[处理]
    B -->|否| D[结束]
`)
```

渲染是**完全同步**的——无需 `await`、无 Promise。ELK.js 布局引擎通过 FakeWorker 同步运行，可立即得到 SVG 字符串。

需要异步？使用 `renderMermaidSVGAsync()`，输出相同，返回 `Promise<string>`。

### ASCII 输出

```typescript
import { renderMermaidASCII } from 'beautiful-mermaid'

const ascii = renderMermaidASCII(`graph LR; A --> B --> C`)
```

```
┌───┐     ┌───┐     ┌───┐
│   │     │   │     │   │
│ A │────►│ B │────►│ C │
│   │     │   │     │   │
└───┘     └───┘     └───┘
```

---

## React 集成

因为渲染是同步的，可以用 `useMemo()` 实现无闪烁的图表渲染：

```tsx
import { renderMermaidSVG } from 'beautiful-mermaid'

function MermaidDiagram({ code }: { code: string }) {
  const { svg, error } = React.useMemo(() => {
    try {
      return {
        svg: renderMermaidSVG(code, {
          bg: 'var(--background)',
          fg: 'var(--foreground)',
          transparent: true,
        }),
        error: null,
      }
    } catch (err) {
      return { svg: null, error: err instanceof Error ? err : new Error(String(err)) }
    }
  }, [code])

  if (error) return <pre>{error.message}</pre>
  return <div dangerouslySetInnerHTML={{ __html: svg! }} />
}
```

**这样做的优点：**
- **无闪烁** — SVG 在渲染阶段同步计算，而不是在 useEffect 里
- **CSS 变量** — 传入 `var(--background)` 等，SVG 继承应用 CSS，主题切换即时生效且无需重渲染
- **可记忆** — 仅在 `code` 变化时重新渲染

---

## 主题系统

主题系统是 `beautiful-mermaid` 的核心，既强大又简单。

### 双色基础

每张图只需要两种颜色：**背景**（`bg`）和**前景**（`fg`）。由此通过 `color-mix()` 推导出整张图的颜色：

```typescript
const svg = renderMermaidSVG(diagram, {
  bg: '#1a1b26',  // 背景
  fg: '#a9b1d6',  // 前景
})
```

这就是**双色模式**——仅用两种颜色得到协调美观的图表。系统会自动推导：

| 元素 | 推导方式 |
|------|----------|
| 正文 | `--fg` 100% |
| 次要文字 | `--fg` 60% 混入 `--bg` |
| 边标签 | `--fg` 40% 混入 `--bg` |
| 淡文字 | `--fg` 25% 混入 `--bg` |
| 连线 | `--fg` 50% 混入 `--bg` |
| 箭头 | `--fg` 85% 混入 `--bg` |
| 节点填充 | `--fg` 3% 混入 `--bg` |
| 分组标题 | `--fg` 5% 混入 `--bg` |
| 内描边 | `--fg` 12% 混入 `--bg` |
| 节点描边 | `--fg` 20% 混入 `--bg` |

### 增强模式

如需更丰富的主题，可提供可选的「增强」颜色覆盖上述推导：

```typescript
const svg = renderMermaidSVG(diagram, {
  bg: '#1a1b26',
  fg: '#a9b1d6',
  // 可选增强：
  line: '#3d59a1',    // 边/连线颜色
  accent: '#7aa2f7',  // 箭头、高亮
  muted: '#565f89',   // 次要文字、标签
  surface: '#292e42', // 节点填充色调
  border: '#3d59a1',  // 节点描边
})
```

未提供的增强色会回退到 `color-mix()` 推导，因此可以只设置关心的颜色。

### CSS 变量 = 实时切换

所有颜色都是 `<svg>` 上的 CSS 自定义属性，因此可在不重渲染的情况下切换主题：

```javascript
// 通过更新 CSS 变量切换主题
svg.style.setProperty('--bg', '#282a36')
svg.style.setProperty('--fg', '#f8f8f2')
// 整张图立即更新
```

在 React 中，传入 CSS 变量引用而非十六进制值：

```typescript
const svg = renderMermaidSVG(diagram, {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  accent: 'var(--accent)',
  transparent: true,
})
// 主题通过 CSS 层叠自动生效，无需重渲染
```

### 内置主题

开箱即用 15 个精选主题：

| 主题 | 类型 | 背景 | 强调色 |
|------|------|------|--------|
| `zinc-light` | 浅色 | `#FFFFFF` | 推导 |
| `zinc-dark` | 深色 | `#18181B` | 推导 |
| `tokyo-night` | 深色 | `#1a1b26` | `#7aa2f7` |
| `tokyo-night-storm` | 深色 | `#24283b` | `#7aa2f7` |
| `tokyo-night-light` | 浅色 | `#d5d6db` | `#34548a` |
| `catppuccin-mocha` | 深色 | `#1e1e2e` | `#cba6f7` |
| `catppuccin-latte` | 浅色 | `#eff1f5` | `#8839ef` |
| `nord` | 深色 | `#2e3440` | `#88c0d0` |
| `nord-light` | 浅色 | `#eceff4` | `#5e81ac` |
| `dracula` | 深色 | `#282a36` | `#bd93f9` |
| `github-light` | 浅色 | `#ffffff` | `#0969da` |
| `github-dark` | 深色 | `#0d1117` | `#4493f8` |
| `solarized-light` | 浅色 | `#fdf6e3` | `#268bd2` |
| `solarized-dark` | 深色 | `#002b36` | `#268bd2` |
| `one-dark` | 深色 | `#282c34` | `#c678dd` |

```typescript
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid'

const svg = renderMermaidSVG(diagram, THEMES['tokyo-night'])
```

### 自定义主题

创建主题很简单，最少只需提供 `bg` 和 `fg`：

```typescript
const myTheme = {
  bg: '#0f0f0f',
  fg: '#e0e0e0',
}

const svg = renderMermaidSVG(diagram, myTheme)
```

想要更丰富的颜色？可添加任意可选增强项：

```typescript
const myRichTheme = {
  bg: '#0f0f0f',
  fg: '#e0e0e0',
  accent: '#ff6b6b',  // 箭头点缀色
  muted: '#666666',   //  subdued 标签
}
```

### 完整 Shiki 兼容

通过 Shiki 可直接使用**任意 VS Code 主题**，获得大量社区主题：

```typescript
import { getSingletonHighlighter } from 'shiki'
import { renderMermaidSVG, fromShikiTheme } from 'beautiful-mermaid'

// 从 Shiki 注册表加载任意主题
const highlighter = await getSingletonHighlighter({
  themes: ['vitesse-dark', 'rose-pine', 'material-theme-darker']
})

// 从主题中提取图表颜色
const colors = fromShikiTheme(highlighter.getTheme('vitesse-dark'))

const svg = renderMermaidSVG(diagram, colors)
```

`fromShikiTheme()` 将 VS Code 编辑器颜色映射到图表角色：

| 编辑器颜色 | 图表角色 |
|------------|----------|
| `editor.background` | `bg` |
| `editor.foreground` | `fg` |
| `editorLineNumber.foreground` | `line` |
| `focusBorder` / 关键字 token | `accent` |
| comment token | `muted` |
| `editor.selectionBackground` | `surface` |
| `editorWidget.border` | `border` |

---

## 支持的图表

### 流程图

```
graph TD
  A[开始] --> B{判断}
  B -->|是| C[处理]
  B -->|否| D[结束]
  C --> D
```

支持所有方向：`TD`（自上而下）、`LR`（自左向右）、`BT`（自下而上）、`RL`（自右向左）。

### 状态图

```
stateDiagram-v2
  [*] --> Idle
  Idle --> Processing: start
  Processing --> Complete: done
  Complete --> [*]
```

### 时序图

```
sequenceDiagram
  Alice->>Bob: Hello Bob!
  Bob-->>Alice: Hi Alice!
  Alice->>Bob: How are you?
  Bob-->>Alice: Great, thanks!
```

### 类图

```
classDiagram
  Animal <|-- Duck
  Animal <|-- Fish
  Animal: +int age
  Animal: +String gender
  Animal: +isMammal() bool
  Duck: +String beakColor
  Duck: +swim()
  Duck: +quack()
```

### ER 图

```
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "is in"
```

### 内联边样式

使用 `linkStyle` 覆盖边的颜色和线宽，与 [Mermaid 的 linkStyle](https://mermaid.js.org/syntax/flowchart.html#styling-links) 一致：

```
graph TD
  A --> B --> C
  linkStyle 0 stroke:#ff0000,stroke-width:2px
  linkStyle default stroke:#888888
```

| 语法 | 效果 |
|------|------|
| `linkStyle 0 stroke:#f00` | 按索引（从 0 起）设置单条边 |
| `linkStyle 0,2 stroke:#f00` | 一次设置多条边 |
| `linkStyle default stroke:#888` | 默认样式应用于所有边 |

按索引设置的样式会覆盖默认。支持的属性：`stroke`、`stroke-width`。

流程图和状态图均支持。

### XY 图

柱状图、折线图及组合图，使用 Mermaid 的 `xychart-beta` 语法。

**柱状图：**

```
xychart-beta
    title "月度收入"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "收入 ($K)" 0 --> 500
    bar [180, 250, 310, 280, 350, 420]
```

**折线图：**

```
xychart-beta
    title "用户增长"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    line [1200, 1800, 2500, 3100, 3800, 4500]
```

**柱状 + 折线组合：**

```
xychart-beta
    title "销售与趋势"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    bar [300, 380, 280, 450, 350, 520]
    line [300, 330, 320, 353, 352, 395]
```

**横向：**

```
xychart-beta horizontal
    title "语言流行度"
    x-axis [Python, JavaScript, Java, Go, Rust]
    bar [30, 25, 20, 12, 8]
```

**坐标轴配置：**

- 分类 x 轴：`x-axis [A, B, C]`
- 数值 x 轴范围：`x-axis 0 --> 100`
- 轴标题：`x-axis "分类" [A, B, C]`
- Y 轴范围：`y-axis "分数" 0 --> 100`

**多系列：** 可声明多条 `bar` 和/或 `line`，每个系列会从主题强调色派生出不同颜色。

### XY 图样式

图表渲染采用简洁、极简风格，灵感来自 Apple 与 Craft：

- **点阵网格** — 用细微点阵填充绘图区，替代传统实线网格
- **圆角柱** — 柱状图圆角，更现代
- **平滑曲线** — 折线使用自然三次样条插值，经过所有数据点的平滑曲线
- **浮动标签** — 无可见轴线或刻度，标签自由浮动
- **线条阴影** — 每条折线下方有轻微阴影
- **单色色板** — 系列 0 使用主题强调色，其余系列为同色系深浅
- **交互提示** — `interactive: true` 时，悬停柱或数据点显示数值提示
- **稀疏点** — 数据点 ≤12 的折线默认显示数据点圆点
- **完整主题** — 15 个内置主题及自定义主题均适用于图表
- **实时主题切换** — 系列颜色为 CSS 变量（`--xychart-color-N`），主题切换即时生效

---

## ASCII 输出

在终端、CLI 或任何需要纯文本的场景，可渲染为 ASCII 或 Unicode 框线字符：

```typescript
import { renderMermaidASCII } from 'beautiful-mermaid'

// Unicode 模式（默认）— 更美观的框线
const unicode = renderMermaidASCII(`graph LR; A --> B`)

// 纯 ASCII 模式 — 最大兼容
const ascii = renderMermaidASCII(`graph LR; A --> B`, { useAscii: true })
```

**Unicode 输出：**
```
┌───┐     ┌───┐
│   │     │   │
│ A │────►│ B │
│   │     │   │
└───┘     └───┘
```

**ASCII 输出：**
```
+---+     +---+
|   |     |   |
| A |---->| B |
|   |     |   |
+---+     +---+
```

### ASCII 选项

```typescript
renderMermaidASCII(diagram, {
  useAscii: false,      // true = ASCII，false = Unicode（默认）
  paddingX: 5,          // 节点间水平间距
  paddingY: 5,          // 节点间垂直间距
  boxBorderPadding: 1,  // 节点框内边距
  colorMode: 'auto',    // 'none' | 'auto' | 'ansi16' | 'ansi256' | 'truecolor' | 'html'
  theme: { ... },       // Partial<AsciiTheme> — 覆盖默认颜色
})
```

### ASCII XY 图

XY 图可渲染为 ASCII，使用专用字符：

- **柱状图** — Unicode `█` 或 ASCII 模式下的 `#`
- **折线图** — 阶梯式路径与圆角：`╭╮╰╯│─`（Unicode）或 `+|-`（ASCII）
- **多系列** — 每个系列使用主题强调色色板中的 ANSI 颜色
- **图例** — 多系列时自动显示
- **横向图** — 支持，分类在 y 轴

---

## API 参考

### `renderMermaidSVG(text, options?): string`

将 Mermaid 图表渲染为 SVG。同步。自动识别图表类型。

**参数：**
- `text` — Mermaid 源码
- `options` — 可选 `RenderOptions` 对象

**RenderOptions：**

| 选项 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `bg` | `string` | `#FFFFFF` | 背景色（或 CSS 变量） |
| `fg` | `string` | `#27272A` | 前景色（或 CSS 变量） |
| `line` | `string?` | — | 边/连线颜色 |
| `accent` | `string?` | — | 箭头、高亮 |
| `muted` | `string?` | — | 次要文字、标签 |
| `surface` | `string?` | — | 节点填充色调 |
| `border` | `string?` | — | 节点描边颜色 |
| `font` | `string` | `Inter` | 字体族 |
| `transparent` | `boolean` | `false` | 透明背景 |
| `padding` | `number` | `40` | 画布内边距（px） |
| `nodeSpacing` | `number` | `24` | 同级节点水平间距 |
| `layerSpacing` | `number` | `40` | 层间垂直间距 |
| `componentSpacing` | `number` | `24` | 断开组件间距 |
| `thoroughness` | `number` | `3` | 交叉最小化尝试次数（1–7，越大越好越慢） |
| `interactive` | `boolean` | `false` | XY 图柱/数据点悬停提示 |

**XY 图：** 以 `xychart-beta` 开头的图会自动识别，无需单独函数。`accent` 选项驱动图表系列色板。

### `renderMermaidSVGAsync(text, options?): Promise<string>`

`renderMermaidSVG()` 的异步版本。输出相同，返回 `Promise<string>`。适用于异步服务端或 data loader。

### `renderMermaidASCII(text, options?): string`

将 Mermaid 图表渲染为 ASCII/Unicode 文本。同步。

**AsciiRenderOptions：**

| 选项 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `useAscii` | `boolean` | `false` | 使用 ASCII 而非 Unicode |
| `paddingX` | `number` | `5` | 节点水平间距 |
| `paddingY` | `number` | `5` | 节点垂直间距 |
| `boxBorderPadding` | `number` | `1` | 框内边距 |
| `colorMode` | `string` | `'auto'` | `'none'`、`'auto'`、`'ansi16'`、`'ansi256'`、`'truecolor'` 或 `'html'` |
| `theme` | `Partial<AsciiTheme>` | — | 覆盖 ASCII 输出默认颜色 |

### `parseMermaid(text): MermaidGraph`

将 Mermaid 源码解析为结构化图对象（用于自定义处理）。

### `fromShikiTheme(theme): DiagramColors`

从 Shiki 主题对象提取图表颜色。

### `THEMES: Record<string, DiagramColors>`

包含全部 15 个内置主题的对象。

### `DEFAULTS: { bg: string, fg: string }`

默认颜色（`#FFFFFF` / `#27272A`）。

---

## 致谢

ASCII 渲染引擎基于 Alexander Grooff 的 [mermaid-ascii](https://github.com/AlexanderGrooff/mermaid-ascii)，我们从 Go 移植到 TypeScript 并扩展了：

- 时序图支持
- 类图支持
- ER 图支持
- Unicode 框线字符
- 可配置间距与内边距

感谢 Alexander 的优秀基础！

---

## 许可证

MIT — 详见 [LICENSE](LICENSE)。

---

<div align="center">

由 [Craft](https://craft.do) 团队用心打造

</div>
