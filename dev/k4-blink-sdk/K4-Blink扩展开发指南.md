# K4 Blink 扩展开发指南

> 基于 Blink 双层引擎的现代扩展系统 — 零侵入、可打包、可分发

---

## 目录

1. [架构概述](#1-架构概述)
2. [快速开始](#2-快速开始)
3. [扩展包格式 (.k4ultra)](#3-扩展包格式-k4ultra)
4. [开发一个扩展](#4-开发一个扩展)
5. [API 参考](#5-api-参考)
6. [安全沙盒](#6-安全沙盒)
7. [调试技巧](#7-调试技巧)
8. [分发](#8-分发)
9. [从传统方式迁移](#9-从传统方式迁移)

---

## 1. 架构概述

### 与旧方式的区别

| | 传统魔改方式 | Blink 扩展系统 |
|------|-------------|----------------|
| 修改位置 | kitten.js 5 处 | 无需修改 kitten.js |
| 打包分发 | 无格式，靠文档说明 | `.k4ultra` 标准包 |
| 加载方式 | 手动编辑源码 | 自动扫描加载 |
| 安全性 | 无限制 | 内置安全沙盒 |
| 开发效率 | 需了解 Webpack 闭包 | 仅需 JSON + JS |

### 系统架构

```
.k4ultra 扩展包
      │
      ▼ 放入 extensions/ 目录
      │
extension-loader-v2.js  ──  扫描目录，发现 .k4ultra 文件
      │
      ▼ 解压解析 manifest.json
      │
Bridge API (window.__k4)  ──  将扩展注入 Blink 引擎
      │
      ├── __k4.blocks.define()       → 积木外观
      ├── __k4.generator.register()  → 代码生成器
      └── __k4.runtime.register()    → Domain Function 执行
               │
               ▼
         Blink Registry → OptiCompiler → OptiRunner → 积木执行
```

### 关键路径

```
用户拖拽积木
  → Blockly 渲染（外观由 blocks.json 定义）
  → 点击运行
  → OptiCompiler 编译积木
  → 查 Registry 找 domain function 索引
  → OptiRunner 执行字节码
  → 调用 domain function（来自 runtime.js）
```

---

## 2. 快速开始

### 第一步：注入 Bridge（只需做一次）

打开 `kitten.822d814413fb10654fde.js`，在 2 个位置粘贴 bridge-inject.js 中的代码。

> 本步骤只需执行一次。完成后，后续所有扩展无需再改 kitten.js。

### 第二步：安装 Loader

将 `extension-loader-v2.js` 复制到 `resources/app/build/`，并在 `index.html` 底部添加：

```html
<script src="./extension-loader-v2.js"></script>
```

### 第三步：放置扩展

将 `.k4ultra` 文件放入 `resources/app/extensions/` 目录。

### 第四步：重启

完全关闭 K4，重新启动。扩展自动加载。

---

## 3. 扩展包格式 (.k4ultra)

`.k4ultra` 文件本质上是标准 ZIP 档案，更改后缀名而成。

### 目录结构

```
my-extension.k4ultra          ← ZIP 包，改后缀为 .k4ultra
│
├── manifest.json             ← ★ 必需：扩展元数据
├── blocks.json               ← 积木外观定义（JSON 数组）
├── runtime.js                ← Domain Function（运行时执行逻辑）
├── generator.js              ← JS 代码生成器（"看代码"用）
└── resources/                ← 资源文件（图标等）
    └── icon.png
```

### manifest.json 规范

```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "description": "扩展描述",
  "author": "作者名",
  "license": "MIT",
  "blink": {
    "version": "1",
    "min_engine": "4.0"
  },
  "category": {
    "name": "分类名称",
    "color": "#FF6B35",
    "icon": "resources/icon.png"
  },
  "entries": {
    "blocks": "blocks.json",
    "runtime": "runtime.js",
    "generator": "generator.js"
  },
  "security": {
    "level": "safe",
    "permissions": [
      {
        "block": "my_write_file",
        "description": "写入文件到用户磁盘"
      }
    ]
  }
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✓ | 扩展唯一标识名 |
| `version` | ✓ | 语义化版本号 |
| `blink.version` | ✓ | Blink 扩展格式版本（当前为 1）|
| `category` | ✓ | 分类定义（名称/颜色/图标） |
| `entries.blocks` |  | 积木 JSON 定义文件路径 |
| `entries.runtime` |  | Domain Function 文件路径 |
| `entries.generator` |  | JS 代码生成器文件路径 |
| `security` |  | 安全声明（见第 6 章）|

---

## 4. 开发一个扩展

### 完整示例：Hello World

#### 4.1 定义积木外观 (blocks.json)

```json
[
  {
    "type": "hello_greet",
    "message0": "向 %1 问好",
    "args0": [
      {
        "type": "input_value",
        "name": "NAME",
        "check": "String"
      }
    ],
    "output": "String",
    "colour": "%{BKY_SENSING_HUE}",
    "inputsInline": true,
    "tooltip": "返回问候语"
  }
]
```

**参数类型速查**：

| JSON 类型 | 积木显示 | check 类型 |
|-----------|---------|-----------|
| `input_value` | 输入插槽 | `String`/`Number`/`Boolean` |
| `field_dropdown` | 下拉框 | 用 `options` 数组 |
| `field_input` | 文本输入框 | 直接显示 |

**积木类型速查**：

| 写法 | 效果 |
|------|------|
| `output: "String"` | 值积木（圆形接口） |
| `previousStatement: null, nextStatement: null` | 语句积木（方形接口） |

#### 4.2 实现运行时逻辑 (runtime.js)

```js
(function() {
  var _exports = {};

  _exports.hello_greet = function(args) {
    try {
      var name = args.NAME || '世界';
      return '你好, ' + name + '!';
    } catch(e) {
      return '[Error] ' + e.message;
    }
  };

  return _exports;
})();
```

**重要规则**：

| 规则 | 说明 |
|------|------|
| 函数名必须与积木 type 一致 | 否则 Registry 找不到 |
| 值积木必须 return | 有 `output` 的积木需返回结果 |
| 用 try/catch 包裹 | 不要抛异常，会中断运行 |
| 使用 `require()` | 不要用 `window.FS`/`window.System` |

#### 4.3 实现代码生成器 (generator.js)

```js
(function() {
  var _generators = {};

  _generators.hello_greet = function(block) {
    var name = block.value_to_code('NAME', 0) || '"世界"';
    return ['("你好, " + ' + name + ' + "!")', 0];
  };

  return _generators;
})();
```

**Generator 返回值格式**：

| 积木类型 | 返回格式 | 示例 |
|---------|---------|------|
| 值积木 | `[code, order]` | `['(Date.now())', 0]` |
| 语句积木 | `code + '\\n'` | `'doSomething();\\n'` |

#### 4.4 编写 manifest.json

```json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "Hello World 扩展示例",
  "author": "K4 Ultra Team",
  "blink": { "version": "1", "min_engine": "4.0" },
  "category": {
    "name": "Hello扩展",
    "color": "#FF6B35"
  },
  "entries": {
    "blocks": "blocks.json",
    "runtime": "runtime.js",
    "generator": "generator.js"
  }
}
```

#### 4.5 打包

```powershell
.\k4-blink-sdk\pack.ps1 .\k4-blink-sdk\examples\hello-world .\output
```

生成 `output/hello-world.k4ultra`。

#### 4.6 安装测试

将 `.k4ultra` 文件放入 `resources/app/extensions/`，重启 K4。

---

## 5. API 参考

### Bridge API (window.__k4)

| API | 参数 | 说明 |
|-----|------|------|
| `__k4.blocks.define(jsonArray)` | 积木 JSON 数组 | 注册积木外观 |
| `__k4.generator.register(type, fn)` | 类型名, 生成函数 | 注册单个代码生成器 |
| `__k4.generator.registerBatch(obj)` | `{type: fn, ...}` | 批量注册 |
| `__k4.runtime.register(id, fn)` | 积木类型名, 执行函数 | 注册单个 domain function |
| `__k4.runtime.registerBatch(obj)` | `{id: fn, ...}` | 批量注册 |
| `__k4.security.wrap(opId, desc, fn)` | 操作ID, 描述, 函数 | 包装为需授权函数 |

### Domain Function 签名

```js
function my_block_name(args) {
  // args.参数名 访问积木参数（参数名对应积木定义中的 name）
  // 值积木: return 结果
  // 语句积木: 不需要 return
}
```

### 颜色常量

```js
EVENTS_HUE     = "%{BKY_EVENTS_HUE}"      // 事件 - 黄
CONTROL_HUE    = "%{BKY_CONTROL_HUE}"     // 控制 - 橙
ACTIONS_HUE    = "%{BKY_ACTIONS_HUE}"     // 动作 - 蓝
APPEARANCE_HUE = "%{BKY_APPEARANCE_HUE}"  // 外观 - 紫
SENSING_HUE    = "%{BKY_SENSING_HUE}"     // 侦测 - 天蓝
LOGIC_HUE      = "%{BKY_LISTS_HUE}"       // 运算 - 绿
TEXTS_HUE      = "%{BKY_TEXTS_HUE}"       // 文本 - 青
```

---

## 6. 安全沙盒

### 权限声明

在 manifest.json 中声明敏感操作：

```json
{
  "security": {
    "level": "warning",
    "permissions": [
      {
        "block": "sysapi_delete_file",
        "description": "删除用户磁盘上的文件"
      },
      {
        "block": "sysapi_exec_cmd",
        "description": "在系统终端中执行命令"
      }
    ]
  }
}
```

### 运行时的行为

```
扩展加载
  → 读取 manifest.security.permissions
  → 对每个声明的 block，用 __k4.security.wrap() 包装
  → 用户首次使用该积木时弹出确认框：
     ┌─────────────────────────────────┐
     │ [K4 安全沙盒]                    │
     │                                  │
     │ 扩展请求执行以下操作:             │
     │ 删除用户磁盘上的文件              │
     │                                  │
     │       [允许]  [拒绝]              │
     └─────────────────────────────────┘
  → 用户选择后缓存到本次会话结束
```

### 安全级别

| level | 行为 |
|-------|------|
| `safe` | 不弹窗，直接执行 |
| `warning` | 敏感操作弹窗确认 |
| `dangerous` | 需要用户在设置中手动开启 |

---

## 7. 调试技巧

### 查看加载日志

打开 DevTools（如可用），过滤 `[K4 Loader]` 或 `[K4 Bridge]`：

```
[K4 Loader][Init] K4 Blink Extension Loader v2 starting...
[K4 Loader][Scanner] Found 2 extension(s)
[K4 Loader][hello-world] Loading extension from: ...
[K4 Loader][hello-world] Defined 3 blocks
[K4 Loader][hello-world] ✓ Loaded successfully
```

### 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 积木可见但不执行 | Domain Function 未注册 | 检查 runtime.js 中函数名是否与积木 type 一致 |
| 控制台无加载日志 | Bridge 未注入 | 确认 bridge-inject.js 已注入 kitten.js |
| 弹窗不显示 | Domain Function 抛异常 | 添加 try/catch |
| 扩展未加载 | 文件名非 .k4ultra | 确认后缀名正确 |
| "window.FS is not a function" | 用了 window.FS | 改为 require('fs') |

---

## 8. 分发

### 打包命令

```powershell
# 打包 hello-world 扩展
.\k4-blink-sdk\pack.ps1 .\k4-blink-sdk\examples\hello-world .\output

# 输出: output/hello-world.k4ultra
```

### 用户安装

1. 关闭 K4
2. 将 `.k4ultra` 文件放入 `resources/app/extensions/`
3. 重启 K4
4. 扩展自动加载，在工具栏显示新分类

### 卸载

直接删除 `extensions/` 目录下的 `.k4ultra` 文件，重启 K4。

---

## 9. 从传统方式迁移

### 如果你的旧扩展已在 kitten.js 中

```js
// 旧的 5 处修改
// 1. 分类定义 → manifest.json 的 category
// 2. 积木 JSON → blocks.json
// 3. Domain Function → runtime.js
// 4. JS Generator → generator.js
// 5. Heart IIFE → （由 loader 自动处理）
```

迁移步骤：

1. 从 kitten.js 复制积木 JSON 定义到 `blocks.json`
2. 从 `v` 对象复制 domain function 到 `runtime.js`
3. 复制 JS generator 代码到 `generator.js`
4. 编写 `manifest.json`
5. 打包为 `.k4ultra`
6. 移除 kitten.js 中对应的 5 处旧代码
7. 安装测试

---

> **最后更新**: 2026-06-18
> **维护者**: K4 Ultra Team
