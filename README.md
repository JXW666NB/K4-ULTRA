# K4 Ultra

基于 [编程猫 Kitten4](https://kitten.codemao.cn) 源码编辑器的深度定制版本，面向专业游戏开发场景。

## 特性

- **Blink 扩展系统** — 零侵入式扩展框架，积木打包为 `.k4ultra` 格式，无需修改核心代码即可分发
- **系统 API 扩展** — 内置文件操作、系统信息、剪贴板等 13 个系统级积木
- **双层执行引擎** — 基于 Blockly + 自研 OptiCompiler/OptiRunner 字节码执行器
- **现成可运行** — 打开 `源码编辑器4.0.exe` 即可使用，无需编译

## 项目结构

```
K4 Ultra/
├── resources/app/                # 应用核心（Electron renderer）
│   ├── build/                    # 运行时代码 + 资源
│   │   ├── kitten.*.js           # 编辑器核心（10 MB 单文件，含 341 个模块）
│   │   ├── extension-loader*.js  # 扩展加载系统
│   │   ├── index.html            # 页面入口
│   │   └── asset/                # 图片、字体、音效
│   ├── main/                     # Electron 主进程
│   ├── extensions/               # 扩展插件
│   └── loading-themes/           # 启动加载主题
├── dev/k4-blink-sdk/             # Blink 扩展开发 SDK
├── docs/                         # 开发文档
│   ├── 魔改开发手册.md
│   ├── Blink扩展开发指南.md
│   └── AI编程提示词.md
└── package.json
```

## 快速开始

直接双击 `源码编辑器4.0.exe` 运行。

### 修改代码

1. 用编辑器打开 `resources/app/build/kitten.*.js`
2. 搜索关键词定位到目标位置
3. 修改保存，重启 exe 即可生效
4. **不需要编译、不需要打包、不需要 npm**

详细开发指南见 [docs/魔改开发手册.md](docs/魔改开发手册.md)。

## 扩展开发

使用 Blink 扩展系统开发积木插件，无需修改 kitten.js：

```
扩展包 (.k4ultra) 放入 resources/app/extensions/
  → extension-loader-v2.js 自动扫描加载
  → 积木出现在工具栏，可直接拖拽使用
```

SDK 和示例见 [dev/k4-blink-sdk/](dev/k4-blink-sdk/)。

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Electron 36 |
| UI | React + Redux |
| 积木引擎 | Blockly (Google) |
| 执行引擎 | Blink (OptiCompiler + OptiRunner) |
| 打包 | Webpack |

## 许可证

本项目基于编程猫 Kitten4 进行二次开发，仅供学习研究使用。

