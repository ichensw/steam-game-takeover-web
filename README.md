# Steam Game Takeover Web

深色系后台管理 Web，用于管理兔兔窝接龙小程序的运营数据、用户状态、意见反馈和系统配置。

## 项目定位

`steam-game-takeover-web` 是 `steam-game-takeover-backend` 的后台管理前端。它面向管理员使用，重点是高频运营操作的清晰、稳定和高密度信息展示，而不是营销展示页。

当前界面风格采用深色管理台设计：

- 深色工作台布局，适合长期管理操作。
- 电橙色作为主强调色，用于主按钮、选中态和关键操作。
- 技术感 sans 字体为主，SteamID、openid、数字 ID 等机器值使用 mono 风格。
- 页面按模块懒加载，减少首屏包体积。

## 功能概览

| 模块 | 能力 |
| --- | --- |
| 登录 | 后台管理员登录、token 本地会话、401 自动退出 |
| 数据看板 | 展示后台统计摘要 |
| 接龙管理 | 接龙列表、筛选、排序、详情抽屉、删除 |
| 用户管理 | 用户列表、详情、封禁/解封、恢复信誉分、批量加入发布白名单 |
| 反馈管理 | 反馈列表、类型/状态/关键词筛选、详情、图片预览、状态更新 |
| 系统设置 | 查询与更新后台系统配置，包含敏感配置修改确认 |

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 构建工具 | Vite 7 |
| 框架 | React 19 |
| 语言 | TypeScript |
| UI | Ant Design 6 |
| 路由 | React Router 7 |
| HTTP | Axios |

## 快速开始

### 环境要求

- Node.js 20+ 推荐
- npm 10+ 推荐

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

默认开发地址：

```text
http://localhost:5177
```

开发环境下，`/miniprogram-api` 会通过 Vite proxy 转发到：

```text
https://www.rabbits.ink
```

### 生产构建

```bash
npm run build
```

构建产物输出到：

```text
dist/
```

### 本地预览生产包

```bash
npm run preview
```

默认预览地址：

```text
http://localhost:4177
```

## API 配置

Axios 统一封装在 `src/api/http.ts`。

默认 API Base URL：

```text
/miniprogram-api/api
```

如需指定后端地址，可在本地创建 `.env.local`：

```bash
VITE_API_BASE_URL=https://www.rabbits.ink/miniprogram-api/api
```

请求会自动携带后台 token：

```text
Authorization: Bearer <admin-token>
```

当接口返回 HTTP 401 时，前端会清理本地会话并跳转到 `/login`。

## 目录结构

```text
.
├── DESIGN.md             # 视觉方向和设计系统说明
├── PRODUCT.md            # 产品定位说明
├── index.html            # Vite HTML 入口
├── package.json          # npm scripts 与依赖
├── vite.config.ts        # Vite 构建、分包与开发代理配置
└── src
    ├── api               # 后台接口封装
    ├── components        # 通用展示组件
    ├── layout            # 后台主布局
    ├── pages             # 页面模块
    ├── App.tsx           # 路由入口
    ├── auth.ts           # 登录会话管理
    ├── main.tsx          # React 挂载入口
    └── styles.css        # 全局样式
```

## 路由说明

| 路由 | 页面 |
| --- | --- |
| `/login` | 管理员登录 |
| `/dashboard` | 数据看板 |
| `/takeovers` | 接龙管理 |
| `/users` | 用户管理 |
| `/feedbacks` | 反馈管理 |
| `/settings` | 系统设置 |

未登录访问后台页面时会跳转到 `/login`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run build` | TypeScript 检查并构建生产包 |
| `npm run preview` | 本地预览生产构建产物 |

## 开发约定

- 新增后台接口时，优先放在 `src/api/admin.ts`，页面层只调用封装后的函数。
- 新页面应通过 `src/App.tsx` 懒加载注册路由，避免增大首屏包。
- 表格分页、筛选、排序优先走后端参数，避免只排序当前页造成数据不一致。
- ID、openid、SteamID、token 等机器可读值使用 `mono` 样式。
- 风险操作使用确认弹窗，例如删除、封禁、状态变更、敏感配置更新。
- 不在前端保存密钥；需要密钥的能力统一由后端代理。

## 部署建议

生产发布只需要部署 `npm run build` 生成的 `dist/`。

Nginx 常见配置方向：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}

location /miniprogram-api/ {
  proxy_pass https://www.rabbits.ink/miniprogram-api/;
}
```

如果后端和前端部署在同域名下，保持默认 `/miniprogram-api/api` 即可，能避免浏览器跨域配置。

## 相关项目

- 后端服务：`steam-game-takeover-backend`
- 小程序端：`steam-game-takeover`

## 维护说明

当前项目以后台运营闭环为主。新增模块时，建议先补齐：

1. 后端接口封装
2. 页面筛选与列表
3. 详情抽屉或弹窗
4. 必要的确认操作
5. 构建验证
