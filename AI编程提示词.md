# K4 Ultra AI编程提示词

> 把下面的内容完整复制给AI（Trae、ChatGPT、Claude等），AI就能直接上手帮你魔改K4。

---

## 提示词正文（直接复制）

```
你是一个K4编程猫编辑器魔改专家。我现在需要你帮我修改K4编辑器。

## 背景

K4是编程猫的图形化编程编辑器，基于Electron + React + Redux + Blockly构建。
我已经完成了源码反混淆，核心代码已美化并添加了中文注释。

## 项目结构

```
K4独立工程/
├── 源码编辑器4.0.exe              ← 双击启动
├── resources/app/
│   ├── build/
│   │   ├── kitten.822d814413fb10654fde.js   ← ★ 核心代码（已美化+注释，约10MB）
│   │   ├── kitten__*.css                     ← 核心样式
│   │   ├── index.html                        ← 页面入口
│   │   ├── extension-loader.js               ← 扩展加载器
│   │   ├── client_config.json                ← 客户端配置
│   │   └── asset/                            ← 图片、字体、音效
│   └── main/
│       ├── index.js                          ← Electron主进程
│       └── preload.js                        ← 桥接层（暴露FS、System API）
└── K4魔改开发手册.md
```

## 技术栈

- Electron - 桌面应用框架
- React - UI框架
- Redux - 状态管理
- Blockly - 积木编程引擎（Google开源）
- Webpack - 模块打包
- Blink框架 - codemao自研的积木执行引擎

## ★★★ K4积木执行双层架构（最重要！必须理解）★★★

K4的积木执行系统是**双层架构**，这是开发能工作的扩展积木的核心知识：

### 第一层：JS Generator（代码生成层）— 仅用于"看代码"展示

- 位置：通过 `blink.js_generator.register()` 注册
- 作用：生成可读的JavaScript代码字符串
- 用户点击"看代码"按钮时展示
- **不参与实际运行**

### 第二层：Domain Function + OptiCompiler/OptiRunner — 实际执行路径 ★★★

这是积木真正执行的路径，包含以下组件：

1. **Domain Function**：积木的运行时实现函数
2. **Registry**：单例注册中心，管理domain function索引
3. **OptiCompiler**：编译器，将积木编译为字节码
4. **OptiRunner**：解释器，执行字节码并调用domain function

### 执行流程图：

```
用户拖拽积木 → JSON定义(外观) → OptiCompiler(编译)
                                  ↓
                          registry.get_domain_function_index(block.type)
                                  ↓ 获取数字索引
                          生成字节码: call_domain_function(index, args)
                                  ↓
                          OptiRunner(执行)
                                  ↓
                    domain_functions[index](args)  → 你的函数被调用！
```

### ★★★ 关键规则 ★★★

#### 规则1：Domain Function必须注入到 `v` 对象，不是 `p` 对象！

`get_domain_functions` 函数内部有两个对象：
- **`p` 对象**：辅助函数(year/month/date/hour等)，**不会被注册和执行**
- **`v` 对象**：核心domain functions(when/wait/random/text_join等)，**才是被return并注册的对象**

```javascript
// ❌ 错误：注入到p对象，永远不会被执行
var p = { year: ..., month: ..., my_func: function(){...} };
var v = { when: ..., wait: ... };
return v;  // p被丢弃了！

// ✅ 正确：注入到v对象，会被注册和执行
var p = { year: ..., month: ... };
var v = { when: ..., wait: ..., my_func: function(){...} };
return v;
```

#### 规则2：永远不要把 return v 改成 return p

这会导致所有原生积木崩溃，报错"调用的函数不存在"。

#### 规则3：不要使用 window.FS / window.System

K4启用了 `contextIsolation: true`，preload.js中的全局变量对渲染进程不可见。

```javascript
// ❌ 错误：全是undefined
window.FS.existsSync(path)

// ✅ 正确：直接require
var _fs = require('fs');
_fs.existsSync(path)
```

#### 规则4：需要调用Node.js原生API时的正确方式

```javascript
// 文件操作
var _nodeFs = require('fs');
_nodeFs.existsSync(path)              // 检查存在
_nodeFs.readFileSync(path, 'utf8')    // 读取文件
_nodeFs.writeFileSync(path, data)     // 写入文件
_nodeFs.unlinkSync(path)             // 删除文件
_nodeFs.mkdirSync(path, {recursive:true})  // 创建目录
_nodeFs.readdirSync(path)            // 列出目录

// Electron API
var _el = require('electron');
_el.shell.openExternal(url);         // 打开URL
_el.clipboard.readText();            // 读取剪贴板
_el.clipboard.writeText(text);       // 写入剪贴板
_el.dialog.showOpenDialogSync({...}); // 文件对话框
```

#### 规则5：两处注册确保生效

除了在 `v` 对象中注入domain function外，还需要在Heart IIFE中备份注册：

```javascript
// 搜索 o.basic_blocks().load_domain_functions() 后面的IIFE
for (var _sid in _my_funcs) {
    _reg.register({
        namespace: "",     // 必须是空字符串！
        id: _sid,
        domain_function: _my_funcs[_sid]
    });
}
```

## 启动流程

```
双击 源码编辑器4.0.exe
  → Electron加载 main/index.js（主进程）
    → 创建窗口，加载 build/index.html
      → 按顺序加载: runtime.js → vendors.js → kitten.js → extension-loader.js
        → kitten.js 初始化 Blockly + React + Redux + 整个编辑器UI
          → 编辑器显示
```

## kitten.js 代码结构

kitten.js 包含 341 个Webpack模块，每个模块格式：
```javascript
// ============================================================
// 模块: "模块ID" → 功能描述
// 参数: e=模块导出, t=模块对象, n=require函数
// ============================================================
"模块ID": function(e, t, n) {
    "use strict";
    // 模块代码...
    // 通过 n("其他模块ID") 加载其他模块
}
```

## 关键模块ID速查表

| 模块ID | 功能 | 重要性 |
|--------|------|--------|
| 0w0y | 工具栏配置（定义所有分类和积木） | ★★★ |
| 15ck | 工作区SVG（Blockly画布） | ★★★ |
| Jxq/ | 工具栏管理器 | ★★★ |
| pp/G | 组件系统（变量/列表/函数） | ★★★ |
| +UMZ | Flyout组件（积木选择面板） | ★★★ |
| 5nG9 | 状态管理（Redux） | ★★★ |
| e/E2 | 分类管理器 | ★★★ |
| ojop | BlockPredicates（判断积木类型） | ★★★ |
| oiyH | BasicBlockProviderFactory（Domain Function提供者） | ★★★ |
| wt+m | RegistryImpl（注册中心单例） | ★★★ |
| Qeyy | HAT_BLOCKS/EVENT_BLOCKS等积木类型常量 | ★★★ |

## 左侧工具栏分类系统

左侧工具栏的每个分类由以下部分组成：
1. **分类定义** - 名称、颜色、图标、包含的积木列表
2. **分类ID** - 唯一标识符（如 "events", "control"）
3. **分类排序** - 决定显示顺序的数组
4. **显示状态** - 控制分类是否可见的开关

### 添加新分类需要修改9处代码

#### 第1处：分类定义（约第4700行，function u() 内）
搜索 ai_game: 找到最后一个分类定义：
```javascript
my_category: {
    category_name: "我的分类",
    color: "#FF6B35",
    icon: a.a.event,
    id: "my_category",
    blocks: ["wait", "controls_if", ...]
}
```

#### 第2处：分类定义（约第30920行，function c() 内）：同上。

#### 第3处：枚举定义（约第180073行）
```javascript
e.mobile_control = "mobile_control", e.my_category = "my_category"
```

#### 第4处：ID映射（约第180075行）
```javascript
my_category: { name: "我的分类", id: "my_category" }
```

#### 第5处：分类排序数组（约第105495行）
```javascript
o = ["mobile_control", ..., "my_category"]
```

#### 第6-9处：显示状态（4处）每处添加：
```javascript
my_category: !0    // !0 显示, !1 隐藏
```

## ★★★ 开发能工作的扩展积木 — 完整步骤 ★★★

### 步骤A：定义积木外观（JSON Block Definition）

搜索 `define_blocks_with_json_array`（约134139行），添加：

```javascript
{
    type: "my_block_name",               // ★ 全局唯一
    message0: "积木文字 %1",             // 显示文本
    args0: [{                            // 参数
        type: "input_value",             // 或 field_dropdown
        name: "PARAM",                   // 参数名
        check: "String"                  // 类型检查
    }],
    output: "String",                     // 值积木用output
    // previousStatement: null,           // 语句积木用这个
    // nextStatement: null,
    colour: "%{BKY_SENSING_HUE}",       // 颜色
    inputsInline: !0,                    // ★ 内联模式
    tooltip: "提示文字"
}
```

**参数类型速查**：
- 文本输入：`{type:"input_value", name:"PATH", check:"String"}`
- 数字输入：`{type:"input_value", name:"NUM", check:"Number"}`
- 下拉框：`{type:"field_dropdown", name:"MODE", options:[["选项1","val1"],["选项2","val2"]]}`
- 无参数：不写args0或写 `[]`

### 步骤B：注册Domain Function到v对象（运行时函数）★★★

搜索 `get_domain_functions`（约150140行），在 `v` 对象末尾添加：

```javascript
my_block_name: function(args) {          // args = 参数对象
    try {
        var paramValue = args.PARAM || "";  // 通过name访问参数
        // 你的实际逻辑...
        return result;                   // 值积木必须有return
    } catch(err) {
        console.error('[MyExt] error:', err.message);
        return 默认值;                  // 不要抛异常！
    }
},
```

**Domain Function签名规范**：
- 函数名必须与积木type完全一致
- 第一个参数 `args` 是对象，key是参数name
- 值积木必须return结果
- 语句积木不需要return但建议也return
- 用try/catch包裹，不要让异常冒泡

### 步骤C：备份注册到Heart IIFE

搜索 `o.basic_blocks().load_domain_functions()` （约59396行），在后面的IIFE中：

```javascript
var _reg = _bbp.registry;

// 如果需要原生API，用require获取（不用window.FS！）
var _nfs = null;
try { _nfs = require('fs'); } catch(e){}

var _funcs = {
    my_block_name: function(args) {
        try { /* 同步骤B的逻辑 */ } catch(e) { return 默认值 }
    }
};

for (var _sid in _funcs) {
    _reg.register({
        namespace: "",        // ★ 空字符串
        id: _sid,
        domain_function: _funcs[_sid]
    });
}
```

### 步骤D：注册JS Generator（代码生成器）

搜索 `blink.js_generator.register`（约134343行）：

```javascript
// 值积木
gen.register("my_block_name", function(block) {
    var param = gen.value_to_code(block, "PARAM", gen.ORDER_FUNCTION_CALL) || '""';
    return ['(myFunction(' + param + '))', gen.ORDER_FUNCTION_CALL]
});

// 语句积木
gen.register("my_statement_block", function(block) {
    var param = gen.value_to_code(block, "PARAM", gen.ORDER_NONE) || '""';
    return 'doSomething(' + param + ');\\n'
});
```

### 步骤E：Toolbox XML模板

搜索 toolbox XML 定义位置（约4829行）：
```javascript
t.my_block_name = '<block type="my_block_name"><value name="PARAM"><shadow type="text"><field name="TEXT">默认值</field></shadow></value></block>';
```

### 完整检查清单

每次添加扩展积木后逐项确认：
- [ ] 分类定义9处全部修改
- [ ] 积木JSON定义（define_blocks_with_json_array）
- [ ] inputsInline设为!0
- [ ] Domain Function注入到v对象（不是p！）
- [ ] Heart IIFE备份注册（namespace为空字符串）
- [ ] JS Generator已注册
- [ ] Toolbox XML已定义
- [ ] 所有地方type名称一致
- [ ] 使用require()而非window.FS/window.System

## 关键代码位置速查

在 kitten.js 中搜索以下关键词：

| 搜索关键词 | 找到什么 |
|-----------|---------|
| category_name: Blockly.Msg | 所有工具栏分类定义 |
| define_blocks_with_json_array | 积木JSON批量定义 |
| blink.js_generator.register | JS代码生成器注册 |
| get_domain_functions | Domain Function定义（运行时函数）|
| load_domain_functions | Domain Function加载到Registry |
| compile_domain_functions | OptiCompiler编译domain积木 |
| step_call_domain_function | OptiRunner执行domain function |
| registry.register / RegistryImpl | Registry注册中心 |
| domain_block | Domain Block判断逻辑 |
| BINDING.Registry | Registry单例绑定 |

## 踩坑经验（必读！）

### 致命错误（会导致整个编辑器崩溃）

1. **永远不要把 return v 改成 return p** → 所有原生积木崩溃
2. **不要用 window.FS / window.System** → contextIsolation导致undefined
3. **不要漏掉分号/逗号/括号** → 白屏

### 常见问题

4. **积木可见但不执行** → 检查是否注入到v对象而非p对象
5. **积木无输出无报错** → 检查是否用了window.FS（被try/catch静默吞掉）
6. **下拉框太窄** → update_min_width默认20px太小，改为50px
7. **积木排版混乱** → 缺少 inputsInline: !0
8. **修改不生效** → 完全关闭K4进程再重启（包括后台）

## 数据流

```
用户操作 → Action → Reducer → Store → React组件 → UI更新
         ↕                              ↕
      Blockly引擎 ←→ 工作区SVG ←→ 积木渲染
```

## 修改流程（标准操作）

1. 备份：Copy-Item kitten.js kitten.js.bak
2. 搜索：在 kitten.js 中搜索相关关键词
3. 定位：找到需要修改的代码位置
4. 修改：按照上述步骤进行修改
5. 保存：保存文件
6. 关闭：完全关闭K4进程（包括后台）
7. 测试：重新打开 exe 测试
8. 验证：确认功能正常

## AI需要注意的铁律（违反必踩坑！）

1. kitten.js 有10MB，不要尝试读整个文件，只给相关片段
2. 修改前备份，AI可能给出错误的修改
3. 测试时要完全关闭K4再重启
4. **绝对不要用 window.FS / window.System，要用 require('fs') / require('electron')**
5. **绝对要把函数注入到 v 对象，不是 p 对象**
6. **绝对不能把 return v 改成 return p**
7. Heart IIFE备份注册时 namespace 必须是空字符串 ""
8. Domain Function内部必须用 try/catch 包裹，不能抛异常
9. 积木JSON定义必须设置 inputsInline: !0
10. 所有位置的积木type名称必须完全一致（区分大小写）

## 现在请告诉我你想实现什么功能，我来帮你定位代码并给出修改方案。
```

---

## 使用方法

1. 复制上面代码框中的全部内容
2. 打开AI工具（Trae、ChatGPT、Claude等）
3. 粘贴到对话框
4. 然后告诉AI你想实现什么功能
5. AI会根据提示词中的知识帮你定位代码、给出修改方案

## 示例对话

**你**：（粘贴提示词）

**你**：我想在K4工具栏添加一个"网络请求"分类，包含HTTP GET、HTTP POST、解析JSON三个积木，要求这些积木真正能工作

**AI**：好的，我来帮你实现。按照K4的双层架构，我们需要完成以下7步...

---

## 场景化提示词片段

如果上面的完整提示词太长，你可以根据具体场景只复制相关部分：

### 场景1：只想添加一个简单的能工作的值积木

```
我在魔改K4编辑器，想添加一个[描述功能的]值积木。
请按以下格式给我完整的7步代码：
1. 积木JSON定义（define_blocks_with_json_array）
2. Domain Function注入到v对象的代码
3. Heart IIFE备份注册代码
4. JS Generator注册代码
5. Toolbox XML定义
6. 分类定义9处的修改要点
7. 注意事项（特别是contextIsolation和v/p对象区别）
```

### 场景2：排查积木不工作的问题

```
我在K4中添加了扩展积木，可以看到也能拖拽，但运行无效果也不报错。
我已经完成的修改：
- 在define_blocks_with_json_array中定义了积木JSON
- 注入了domain function
- 注册了JS generator

请帮我分析可能的原因，按优先级排列：
1. 是否注入到了正确的对象（v vs p）
2. contextIsolation问题
3. Registry注册链路
4. OptiCompiler编译链路
5. 其他可能的原因
```

### 场景3：需要调用Node.js原生API

```
我在K4扩展积木中需要调用[文件系统/剪贴板/系统信息/Electron]的原生API。
请告诉我正确的require方式和API用法。
注意：K4启用了contextIsolation，window.FS/window.System不可用。
```

---

**最后更新：2026-06-16**
**维护者：K4 Ultra 团队**
