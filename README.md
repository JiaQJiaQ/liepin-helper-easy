# 猎聘助手小白版 (Liepin Helper Easy)

> 版本：v2.0.0  
> 作者：jiaQ  
> 基于「猎聘助手」衍生的可视化配置版本，专为不熟悉 CSS 选择器的用户设计。

## 核心特性

- **可视化选择器向导**：打开插件后自动扫描页面，通过高亮 + 问答方式引导用户定位职位卡片、职位名称、公司名、薪资、地点、沟通按钮等关键元素
- **自动保存配置**：用户只需点击「是/不是」，插件会自动记录并保存对应的 CSS 选择器
- **继承原版全部功能**：职位扫描、批量筛选、AI 智能评估、自动沟通、投递统计等

## 浏览器安装说明

本插件为 Chrome 浏览器扩展（Manifest V3），支持 Chrome、Edge 及所有 Chromium 内核浏览器。

### 方式一：加载已解压的扩展程序（开发者模式）

1. 打开 Chrome，地址栏输入 `chrome://extensions/` 并回车  
   （Edge 用户请输入 `edge://extensions/`）
2. 开启右上角「**开发者模式**」开关
3. 点击「**加载已解压的扩展程序**」
4. 在弹出的文件选择框中，选中本项目的发布文件夹：
   - 开发测试：`src/liepin-helper-easy/`
   - 正式使用：`Output/liepin-helper-easy/`
5. 加载成功后，浏览器右上角扩展栏会出现「猎聘助手小白版」图标
6. 进入猎聘网职位搜索页面（如 `https://www.liepin.com/zhaopin/`）
7. 页面右上角会出现「猎聘助手小白版」浮动面板，即可开始使用

### 方式二：重新加载（修改代码后）

如果你在 `src/liepin-helper-easy/` 中修改了源码，请先运行项目根目录的构建脚本：

```powershell
# 在项目根目录执行
$src = "F:\07-AIWorkSpace\kimiTest\src\liepin-helper-easy"
$output = "F:\07-AIWorkSpace\kimiTest\Output\liepin-helper-easy"
robocopy $src $output /E /COPY:DAT /R:0 /W:0 | Out-Null
```

构建完成后，回到 `chrome://extensions/` 页面，点击「猎聘助手小白版」卡片上的刷新按钮（↻），或先移除再重新加载 `Output/liepin-helper-easy/` 文件夹。

## 使用方式

1. 在猎聘网职位列表页打开本插件
2. 点击面板上的「开始配置向导」
3. 跟随高亮提示，依次确认页面上的各个元素位置
4. 配置完成后点击「保存配置」即可开始使用

## 目录说明

- `src/liepin-helper-easy/` — 源码目录
- `Output/liepin-helper-easy/` — 构建输出目录
