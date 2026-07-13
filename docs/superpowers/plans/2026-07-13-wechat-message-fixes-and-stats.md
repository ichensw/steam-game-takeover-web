# 微信消息修复与聊天统计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复消息时间和拍一拍类型展示，并交付受统一管理员权限保护的每日聊天统计页面。

**Architecture:** `wechat-bot-admin-backend` 直接聚合 `group_messages`；`steam-game-takeover-backend` 负责统一管理员鉴权与受控代理；`steam-game-takeover-web` 负责筛选、指标和明细展示。沿用现有服务密钥信任边界，不新增数据库表和前端图表依赖。

**Tech Stack:** Go 1.22、`database/sql`、`go-sqlmock`、Gin、React 19、TypeScript、Ant Design 6、Vitest、Vite。

## Global Constraints

- 统计默认最近 7 个自然日，支持全部群聊或单群筛选，最大范围 90 天。
- `10002` 必须显示为“拍一拍”。
- 超级管理员必须拥有 `wechat-stats`；其他角色通过现有角色菜单配置授权。
- 所有机器人管理请求继续经过主后台 Bearer Token 和机器人后端服务密钥双层校验。
- 不在源码、提交、日志或文档中写入生产口令和服务密钥。

---

### Task 1: 消息时间与类型回归修复

**Files:**
- Modify: `src/api/wechatBot.ts`
- Modify: `src/pages/WechatMessages.tsx`
- Modify: `src/utils/wechatBot.test.ts`
- Create: `src/utils/wechatBot.ts`

**Interfaces:**
- Produces: `ApiUnixTime = { unix: number; text: string }`、`formatWechatTime(value): string`、`wechatMessageTypeLabel(value: number): string`。

- [ ] 在 `src/utils/wechatBot.test.ts` 增加失败用例，断言对象时间返回 `2026-07-13 10:20:30`、旧字符串保持原值、类型 `10002` 返回“拍一拍”。
- [ ] 运行 `npm test -- src/utils/wechatBot.test.ts`，确认新断言在当前实现下失败。
- [ ] 实现纯格式化函数，更新 API 类型、筛选选项和表格 render。
- [ ] 再运行该测试，预期全部通过。
- [ ] 提交 `fix: show wechat message time and pat events`。

### Task 2: 机器人统计聚合接口

**Files:**
- Modify: `internal/httpapi/server.go`
- Modify: `internal/httpapi/server_test.go`

**Interfaces:**
- Produces: `GET /api/stats/daily?start=YYYY-MM-DD&end=YYYY-MM-DD&roomId=...`，响应契约见设计文档。

- [ ] 用 `sqlmock` 添加失败测试：合法范围返回 totals/daily/participants，空白日期补 0，roomId 进入参数绑定；缺失、倒序或超过 90 天返回 400。
- [ ] 运行 `go test -count=1 ./internal/httpapi`，确认路由或实现缺失导致失败。
- [ ] 新增日期解析、范围校验、三个参数化聚合查询、日期补齐和 JSON 输出；将路由包在 `trustedAdmin` 中。
- [ ] 再运行 `go test -count=1 ./internal/httpapi`，预期通过。
- [ ] 提交 `feat: add daily wechat chat statistics`。

### Task 3: 主后台代理与权限

**Files:**
- Modify: `internal/httpapi/wechat_bot_proxy.go`
- Modify: `internal/httpapi/wechat_bot_proxy_test.go`
- Modify: `internal/httpapi/admin_role_menu.go`
- Modify: `internal/httpapi/admin_role_menu_test.go`

**Interfaces:**
- Consumes: 机器人 `GET /api/stats/daily`。
- Produces: 主后台 `GET /api/admin/wechat-bot/stats/daily` 和菜单键 `wechat-stats`。

- [ ] 增加失败测试，断言统计 GET 被转发、非 GET 被拒绝，超级管理员旧配置自动补齐 `wechat-stats`，普通角色不会被强制补齐。
- [ ] 运行 `go test -count=1 ./internal/httpapi`，确认失败。
- [ ] 扩展代理白名单与菜单键、标签、超级管理员必需权限列表。
- [ ] 再运行 `go test -count=1 ./internal/httpapi`，预期通过。
- [ ] 提交 `feat: expose wechat chat statistics`。

### Task 4: 聊天统计页面

**Files:**
- Modify: `src/api/wechatBot.ts`
- Create: `src/pages/WechatStats.tsx`
- Modify: `src/App.tsx`
- Modify: `src/layout/AdminLayout.tsx`
- Modify: `src/layout/adminMenu.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `getWechatDailyStats(params: { start: string; end: string; roomId?: string }): Promise<WechatDailyStats>`。
- Produces: `/wechat-stats` 页面和“聊天统计”菜单项。

- [ ] 先扩展菜单测试，断言只有 `wechat-stats` 可见时仍生成微信菜单组和 `/wechat-stats` 项；增加 API 参数与日期默认值纯逻辑测试。
- [ ] 运行 `npm test`，确认新用例失败。
- [ ] 添加 API 类型和调用、懒加载路由、菜单映射及统计页面。页面默认日期为今天和今天前 6 天，提供群筛选、四项指标、每日趋势表和前 100 人排行表。
- [ ] 添加必要的响应式样式，保证窄屏筛选换行、指标与表格不重叠。
- [ ] 运行 `npm test` 和 `npm run build`，预期全部通过。
- [ ] 提交 `feat: add wechat chat statistics page`。

### Task 5: 全量验证与生产发布

**Files:**
- No source files expected.

**Interfaces:**
- Consumes: 三个仓库的已测试提交。
- Produces: 生产站点上的修复和统计页。

- [ ] 在 `wechat-bot-admin-backend` 运行 `go test -count=1 ./...`。
- [ ] 在 `steam-game-takeover-backend` 运行 `go test -count=1 ./...`。
- [ ] 在 `steam-game-takeover-web` 运行 `npm test` 和 `npm run build`。
- [ ] 检查三个仓库 `git diff --check`、`git status --short` 和待发布提交，确认无密钥及无构建产物误提交。
- [ ] 备份服务器现有二进制和前端静态目录，部署机器人后端、主后台后端和主后台前端，依次重启并确认 systemd active。
- [ ] 验证机器人直连统计接口无服务密钥返回 401、主后台统计接口无管理员 token 返回 401、带管理员登录的页面能展示时间、拍一拍和统计数据。
- [ ] 执行 `nginx -t`；由于 URL 前缀未变化，不修改 Nginx，除非实际检查发现现有 location 无法覆盖新路径。
