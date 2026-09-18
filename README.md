# ResumeFloat

![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-Supported-orange?logo=rust&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Supported-3178C6?logo=typescript&logoColor=white)
![Ant Design](https://img.shields.io/badge/UI-Ant%20Design-0170FE?logo=antdesign&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?logo=sqlite&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/License-MIT-green)
![Version](https://img.shields.io/badge/version-0.1.1-orange)

**ResumeFloat** 是一款跨平台置顶悬浮简历速拷工具：默认「标签 + 一键复制」，可切换编辑；每条内容由可动态组合的块构成（纯文本 / Markdown / 富文本 / 图片），数据落本地 SQLite，支持导出与导入。

> 当前版本：`0.1.1` · 协议：[MIT License](LICENSE)

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [工程结构](#工程结构)
- [快速开始](#快速开始)
- [常用命令](#常用命令)
- [数据与导入导出](#数据与导入导出)
- [License](#license)

## 功能特性

| 模块 | 说明 |
| --- | --- |
| 置顶悬浮 | 无边框窗口默认 always-on-top，可拖拽标题栏移动 |
| Compact 视图 | 条目列表：标签 + 内容预览（超长省略）+「复制」；按块顺序拼装写入剪贴板 |
| 主题 | 深色 / 浅色切换，本地记住偏好 |
| 编辑模式 | 增删条目；块类型可动态添加、排序、删除 |
| 内容块 | 纯文本 · Markdown（编辑 / 预览）· 富文本（TipTap）· 图片 |
| 本地持久化 | SQLite（`items` / `blocks`）；图片资源存应用配置目录 `assets/` |
| 导出 / 导入 | 导出 `resume.db` + `assets/`；导入前确认覆盖本地数据 |

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面壳 | Tauri 2 |
| 前端 | React 19 · TypeScript · Vite · Ant Design（全局无圆角） |
| 富文本 / Markdown | TipTap · react-markdown · marked |
| 持久化 | `@tauri-apps/plugin-sql`（SQLite） |
| 其他插件 | clipboard-manager · dialog · fs |

## 工程结构

```text
ResumeFloat/
├── src/                          # React UI
│   ├── components/
│   │   ├── CompactView.tsx       # 默认速拷列表
│   │   ├── EditView.tsx          # 编辑模式
│   │   └── blocks/               # 纯文本 / Markdown / 富文本 / 图片块
│   ├── clipboard.ts              # 按块拼装复制
│   ├── db.ts                     # SQLite CRUD
│   ├── theme.ts                  # Ant Design 主题（直角 + dark）
│   └── types.ts
├── src-tauri/
│   ├── src/lib.rs                # 插件、migrations、导入导出 / 资源命令
│   ├── capabilities/             # ACL 权限
│   └── permissions/              # 自定义命令权限
└── README.md
```

## 快速开始

### 环境要求

- Node.js（配合 **pnpm**）
- Rust / Cargo
- Linux 还需 Tauri 系统依赖，例如：

```bash
sudo apt install libwebkit2gtk-4.1-dev librsvg2-dev patchelf \
  libssl-dev libayatana-appindicator3-dev
```

详见 [Tauri 前置条件](https://v2.tauri.app/start/prerequisites/)。

### 启动

```bash
pnpm install
pnpm tauri:dev
```

### 打包

```bash
pnpm tauri:build
```

本地产出目录：`src-tauri/target/release/bundle/`（`deb` / `rpm` / `nsis` / `dmg`，视当前系统而定）。也可直接运行 `src-tauri/target/release/resumefloat`。Windows / macOS 请在对应系统执行同一命令。

推送 `v*` 标签（例如 `v0.1.0`）会触发 GitHub Actions，自动构建各平台安装包并发布 [GitHub Release](https://github.com/jiangbyte/ResumeFloat/releases)。macOS 包未公证；首次打开需右键选择「打开」，或在「系统设置 → 隐私与安全性」中允许。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm tauri:dev` | 开发模式启动桌面应用 |
| `pnpm tauri:build` | 构建发布包 |
| `pnpm build` | 仅构建前端静态资源 |
| `pnpm dev` | 仅启动 Vite 前端（无桌面壳） |

## 数据与导入导出

- 数据库：应用配置目录下的 `resume.db`
- 图片：同目录 `assets/`
- **导出**：选择目标目录，写入 `resume.db` + `assets/`
- **导入**：选择含 `resume.db` 的目录（可含 `assets/`），将覆盖本地数据

## License

本项目基于 [MIT License](LICENSE) 开源。完整条款见 [LICENSE](LICENSE)。
