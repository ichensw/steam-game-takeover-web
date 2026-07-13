# WeChat Bot Admin Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the WeChat bot administration UI into the Rabbit Takeover admin system and make Rabbit Takeover administrator tokens and menu permissions the only supported access path.

**Architecture:** The Rabbit Takeover backend remains the identity authority and exposes an authenticated, permission-aware `/api/admin/wechat-bot/*` gateway. The gateway calls the bot backend with a shared service secret and verified administrator identity; the bot backend retires its browser login/account routes and accepts data requests only from that gateway. The Rabbit Takeover frontend adds three native React/Ant Design pages and uses its existing Bearer token client.

**Tech Stack:** Go 1.22 HTTP servers (Gin/GORM and `net/http`/`database/sql`), React 19, TypeScript 5.7, Ant Design 6, Axios, Vite 7, Vitest, Playwright.

## Global Constraints

- Rabbit Takeover administrator accounts are the only user-facing identity source.
- Super administrators always receive `wechat-messages`, `wechat-summary`, and `wechat-database`; other roles use existing role-menu configuration.
- Every proxied method/path is explicitly allowlisted and authorized on the backend.
- The browser never receives or sends the service-to-service shared secret.
- Existing bot-admin account data remains stored but its routes are unreachable; no destructive database migration is part of this work.
- `wechat-bot-admin-web/README.md` must announce that the standalone frontend is retired and no longer deployed or developed.

---

### Task 1: Replace Bot Backend Browser Authentication With Trusted Gateway Authentication

**Files:**
- Modify: `../wechat-bot-admin-backend/internal/config/config.go`
- Modify: `../wechat-bot-admin-backend/cmd/server/main.go`
- Modify: `../wechat-bot-admin-backend/internal/httpapi/server.go`
- Modify: `../wechat-bot-admin-backend/internal/httpapi/server_test.go`
- Modify: `../wechat-bot-admin-backend/.env.example`
- Modify: `../wechat-bot-admin-backend/README.md`

**Interfaces:**
- Consumes: `X-Wechat-Bot-Admin-Secret`, `X-Wechat-Bot-Admin-ID`, and `X-Wechat-Bot-Admin-Username` headers from the Rabbit gateway.
- Produces: `Config.GatewaySharedSecret string`, `NewServer(config.Config, *sql.DB) http.Handler`, and `(*Server).trustedAdmin(http.Handler) http.Handler` protecting all bot data routes.

- [ ] **Step 1: Write failing trusted-gateway and retired-route tests**

Add tests that construct `NewServer(config.Config{GatewaySharedSecret: "test-secret", AITimeout: time.Second}, ...)`, then assert:

```go
func TestTrustedAdminRejectsMissingOrInvalidSecret(t *testing.T) {
    handler := (&Server{cfg: config.Config{GatewaySharedSecret: "test-secret"}}).trustedAdmin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusTeapot)
    }))
    for _, secret := range []string{"", "wrong-secret"} {
        req := httptest.NewRequest(http.MethodGet, "/api/groups", nil)
        req.Header.Set(gatewaySecretHeader, secret)
        rec := httptest.NewRecorder()
        handler.ServeHTTP(rec, req)
        if rec.Code != http.StatusUnauthorized { t.Fatalf("status = %d", rec.Code) }
    }
}

func TestTrustedAdminAcceptsVerifiedIdentity(t *testing.T) {
    handler := (&Server{cfg: config.Config{GatewaySharedSecret: "test-secret"}}).trustedAdmin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Header.Get(gatewayAdminIDHeader) != "42" || r.Header.Get(gatewayAdminUsernameHeader) != "ops" { t.Fatal("identity missing") }
        w.WriteHeader(http.StatusTeapot)
    }))
    req := httptest.NewRequest(http.MethodGet, "/api/groups", nil)
    req.Header.Set(gatewaySecretHeader, "test-secret")
    req.Header.Set(gatewayAdminIDHeader, "42")
    req.Header.Set(gatewayAdminUsernameHeader, "ops")
    rec := httptest.NewRecorder()
    handler.ServeHTTP(rec, req)
    if rec.Code != http.StatusTeapot { t.Fatalf("status = %d", rec.Code) }
}

func TestLegacyAuthAndAccountRoutesAreRetired(t *testing.T) {
    handler := NewServer(config.Config{GatewaySharedSecret: "test-secret", AITimeout: time.Second}, nil)
    cases := []struct{ method, path string }{
        {http.MethodPost, "/api/auth/login"},
        {http.MethodGet, "/api/auth/me"},
        {http.MethodGet, "/api/accounts"},
    }
    for _, tt := range cases {
        rec := httptest.NewRecorder()
        handler.ServeHTTP(rec, httptest.NewRequest(tt.method, tt.path, nil))
        if rec.Code != http.StatusNotFound { t.Fatalf("%s status = %d", tt.path, rec.Code) }
    }
}
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd ../wechat-bot-admin-backend && go test -count=1 ./internal/httpapi`

Expected: FAIL because `GatewaySharedSecret`, header constants, and `trustedAdmin` do not exist and legacy routes are still registered.

- [ ] **Step 3: Implement trusted gateway middleware and route retirement**

Add `GatewaySharedSecret string` loaded from `WECHAT_BOT_GATEWAY_SHARED_SECRET`. Define constants and compare secrets in constant time:

```go
const (
    gatewaySecretHeader = "X-Wechat-Bot-Admin-Secret"
    gatewayAdminIDHeader = "X-Wechat-Bot-Admin-ID"
    gatewayAdminUsernameHeader = "X-Wechat-Bot-Admin-Username"
)

func (s *Server) trustedAdmin(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        supplied := r.Header.Get(gatewaySecretHeader)
        expected := s.cfg.GatewaySharedSecret
        if supplied == "" || expected == "" || len(supplied) != len(expected) || subtle.ConstantTimeCompare([]byte(supplied), []byte(expected)) != 1 {
            fail(w, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
            return
        }
        if r.Header.Get(gatewayAdminIDHeader) == "" || r.Header.Get(gatewayAdminUsernameHeader) == "" {
            fail(w, http.StatusUnauthorized, "UNAUTHORIZED", "administrator identity is required")
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

Change `NewServer` to accept only `(cfg config.Config, db *sql.DB)`. Register only health plus `groups`, `messages`, `messages/summary`, `tables`, table detail, and table rows. Wrap every data route with `trustedAdmin`; remove registration of `/api/auth/*` and `/api/accounts*`. In `cmd/server/main.go`, remove the `SESSION_SECRET` requirement and stop constructing the credential store/session manager. Keep dormant account implementation and tables unchanged, but do not initialize or seed them during startup.

- [ ] **Step 4: Update bot backend configuration documentation**

Replace old session/account variables in `.env.example` with:

```dotenv
WECHAT_BOT_GATEWAY_SHARED_SECRET=replace-with-a-long-random-shared-secret
```

Update README API/authentication text to say data endpoints require trusted gateway headers, direct browser access is unsupported, and the legacy account table is retained only for rollback.

- [ ] **Step 5: Verify GREEN and commit**

Run: `cd ../wechat-bot-admin-backend && go test -count=1 ./... && go build ./cmd/server`

Expected: all packages PASS and build exits 0.

Commit:

```bash
git add internal/config/config.go cmd/server/main.go internal/httpapi/server.go internal/httpapi/server_test.go .env.example README.md
git commit -m "feat: trust rabbit admin gateway"
```

### Task 2: Add WeChat Bot Menu Permissions to Rabbit Backend

**Files:**
- Modify: `../steam-game-takeover-backend/internal/httpapi/admin_role_menu.go`
- Create: `../steam-game-takeover-backend/internal/httpapi/admin_role_menu_test.go`

**Interfaces:**
- Produces: menu keys `wechat-messages`, `wechat-summary`, `wechat-database` and `(*Handler).adminHasMenu(model.AdminUser, ...string) bool`.

- [ ] **Step 1: Write failing permission tests**

```go
func TestDefaultAdminMenuKeysIncludeWechatForSuperAdminOnly(t *testing.T) {
    for _, key := range []string{"wechat-messages", "wechat-summary", "wechat-database"} {
        if !containsString(defaultAdminMenuKeys(model.AdminRoleSuperAdmin), key) { t.Fatalf("super admin missing %s", key) }
        if containsString(defaultAdminMenuKeys(model.AdminRoleAdmin), key) { t.Fatalf("normal admin unexpectedly has %s", key) }
    }
}

func TestNormalizeAdminMenuKeysAcceptsWechatKeys(t *testing.T) {
    got := normalizeAdminMenuKeys([]string{"wechat-messages", "invalid", "wechat-summary", "wechat-messages"})
    want := []string{"wechat-messages", "wechat-summary"}
    if !reflect.DeepEqual(got, want) { t.Fatalf("got %#v, want %#v", got, want) }
}

func TestEnsureRoleMenuKeysBackfillsStoredSuperAdminMenus(t *testing.T) {
    got := ensureRoleMenuKeys(model.AdminRoleSuperAdmin, []string{"dashboard"})
    for _, key := range []string{"admin-users", "wechat-messages", "wechat-summary", "wechat-database"} {
        if !containsString(got, key) { t.Fatalf("stored super admin menus missing %s", key) }
    }
}
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd ../steam-game-takeover-backend && go test -count=1 ./internal/httpapi -run 'Test(DefaultAdminMenu|NormalizeAdminMenu)'`

Expected: FAIL because the keys are not in `allAdminMenuKeys`.

- [ ] **Step 3: Add keys, labels, and forced super-admin behavior**

Append the three keys to `allAdminMenuKeys`, add Chinese labels to `AdminListRoleMenus`, and force them both when stored rows are read and during `AdminUpdateRoleMenus`:

```go
var superAdminRequiredMenuKeys = []string{"admin-users", "wechat-messages", "wechat-summary", "wechat-database"}

func ensureMenuKeys(keys []string, required ...string) []string {
    for _, key := range required {
        if !containsString(keys, key) { keys = append(keys, key) }
    }
    return keys
}

func ensureRoleMenuKeys(role string, keys []string) []string {
    if role == model.AdminRoleSuperAdmin {
        return ensureMenuKeys(keys, superAdminRequiredMenuKeys...)
    }
    return keys
}
```

Return a copy of `allAdminMenuKeys` for default super-admin permissions so callers cannot mutate global defaults. Pass parsed stored keys through `ensureRoleMenuKeys` so pre-existing super-admin rows are backfilled without a migration.

- [ ] **Step 4: Verify GREEN and commit**

Run: `cd ../steam-game-takeover-backend && go test -count=1 ./internal/httpapi`

Expected: PASS.

Commit:

```bash
git add internal/httpapi/admin_role_menu.go internal/httpapi/admin_role_menu_test.go
git commit -m "feat: add wechat bot menu permissions"
```

### Task 3: Implement the Authenticated Rabbit Backend Gateway

**Files:**
- Modify: `../steam-game-takeover-backend/internal/config/config.go`
- Modify: `../steam-game-takeover-backend/internal/httpapi/handler.go`
- Modify: `../steam-game-takeover-backend/internal/httpapi/router.go`
- Create: `../steam-game-takeover-backend/internal/httpapi/wechat_bot_proxy.go`
- Create: `../steam-game-takeover-backend/internal/httpapi/wechat_bot_proxy_test.go`
- Modify: `../steam-game-takeover-backend/.env.example`
- Modify: `../steam-game-takeover-backend/README.md`
- Modify: `../steam-game-takeover-backend/docs/api.md`

**Interfaces:**
- Consumes: current administrator from `currentAdmin(c)` and `h.adminMenuKeys(admin.Role)`.
- Produces: `Handler.AdminProxyWechatBot(*gin.Context)` at `/api/admin/wechat-bot/*path`.

- [ ] **Step 1: Write failing allowlist and proxy tests**

Table-test this exact policy:

```go
var cases = []struct{ method, path, menu string; allowed bool }{
    {http.MethodGet, "/groups", "wechat-messages", true},
    {http.MethodGet, "/groups", "wechat-summary", true},
    {http.MethodGet, "/messages", "wechat-messages", true},
    {http.MethodPost, "/messages/summary", "wechat-summary", true},
    {http.MethodGet, "/tables", "wechat-database", true},
    {http.MethodGet, "/tables/group_messages", "wechat-database", true},
    {http.MethodGet, "/tables/group_messages/rows", "wechat-database", true},
    {http.MethodDelete, "/tables/group_messages", "wechat-database", false},
    {http.MethodGet, "/auth/me", "wechat-messages", false},
}
```

Add an `httptest.Server` upstream test asserting the gateway overwrites spoofed internal headers with `42`, `ops`, and the configured secret, preserves query strings, and passes status/body. Add tests for 403 without menu, 404 for non-allowlisted paths, 502 on connection failure, and 504 on timeout.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd ../steam-game-takeover-backend && go test -count=1 ./internal/httpapi -run 'TestWechatBot'`

Expected: FAIL because proxy policy and handler are undefined.

- [ ] **Step 3: Implement configuration, client, policy, and proxy**

Add configuration fields:

```go
WechatBotAdminURL      string
WechatBotSharedSecret string
WechatBotProxyTimeout time.Duration
WechatBotSummaryTimeout time.Duration
```

Load `WECHAT_BOT_ADMIN_URL`, `WECHAT_BOT_GATEWAY_SHARED_SECRET`, `WECHAT_BOT_PROXY_TIMEOUT_SECONDS` (default 20 seconds), and `WECHAT_BOT_SUMMARY_TIMEOUT_SECONDS` (default 75 seconds). Give `Handler` ordinary and summary proxy clients.

Implement:

```go
func requiredWechatBotMenus(method, path string) ([]string, bool) {
    switch {
    case method == http.MethodGet && path == "/groups":
        return []string{"wechat-messages", "wechat-summary"}, true
    case method == http.MethodGet && path == "/messages":
        return []string{"wechat-messages"}, true
    case method == http.MethodPost && path == "/messages/summary":
        return []string{"wechat-summary"}, true
    case method == http.MethodGet && (path == "/tables" || tablePathPattern.MatchString(path)):
        return []string{"wechat-database"}, true
    default:
        return nil, false
    }
}
```

`AdminProxyWechatBot` must validate policy and allow access when the administrator has any returned menu key, build the upstream URL with `url.JoinPath`, copy request body and safe headers, set internal headers from the verified admin, execute summary requests with the long-timeout client and all other requests with the short-timeout client, copy JSON content type/status/body, and map deadline errors to 504 and other transport errors to 502. Register `adminAuthed.Any("/wechat-bot/*path", h.AdminProxyWechatBot)`.

- [ ] **Step 4: Document deployment variables and gateway API**

Add to both `.env.example` and README:

```dotenv
WECHAT_BOT_ADMIN_URL=http://127.0.0.1:8091/api
WECHAT_BOT_GATEWAY_SHARED_SECRET=replace-with-the-same-long-random-secret
WECHAT_BOT_PROXY_TIMEOUT_SECONDS=20
WECHAT_BOT_SUMMARY_TIMEOUT_SECONDS=75
```

Document the gateway endpoints and their required menu keys in `docs/api.md`.

- [ ] **Step 5: Verify GREEN and commit**

Run: `cd ../steam-game-takeover-backend && go test -count=1 ./... && go build ./cmd/server`

Expected: all packages PASS and build exits 0.

Commit:

```bash
git add internal/config/config.go internal/httpapi/handler.go internal/httpapi/router.go internal/httpapi/wechat_bot_proxy.go internal/httpapi/wechat_bot_proxy_test.go .env.example README.md docs/api.md
git commit -m "feat: proxy wechat bot administration"
```

### Task 4: Add Typed Frontend API and Port Utility Tests

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/api/wechatBot.ts`
- Create: `src/utils/wechatBot.ts`
- Create: `src/utils/wechatBot.test.ts`

**Interfaces:**
- Produces: `listWechatGroups`, `listWechatMessages`, `createWechatSummary`, `listWechatTables`, `getWechatTable`, `listWechatTableRows`, plus `summaryPayload`, `todayString`, `formatCell`, and `previewText`.

- [ ] **Step 1: Install Vitest and write failing utility tests**

Run: `npm install --save-dev vitest`

Add `"test": "vitest run"` and port the four existing Node tests from `wechat-bot-admin-web/test/utils.test.js` to typed Vitest assertions. Add a test that `summaryPayload` omits `date` for custom ranges.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/utils/wechatBot.test.ts`

Expected: FAIL because `src/utils/wechatBot.ts` does not exist.

- [ ] **Step 3: Implement utilities and typed API**

Port the existing utility behavior without changing date/query semantics. Define response types for groups, messages, pagination, summaries, table metadata, columns, and dynamic rows. All functions call the existing `http` client under `/admin/wechat-bot`:

```ts
export const listWechatGroups = () => unwrap<WechatGroup[]>(http.get('/admin/wechat-bot/groups'));
export const listWechatMessages = (params: WechatMessageQuery) =>
  unwrap<PageResponse<WechatMessage>>(http.get('/admin/wechat-bot/messages', { params }));
export const createWechatSummary = (body: WechatSummaryRequest) =>
  unwrap<WechatSummary>(http.post('/admin/wechat-bot/messages/summary', body));
export const listWechatTables = () => unwrap<WechatTable[]>(http.get('/admin/wechat-bot/tables'));
export const getWechatTable = (table: string) =>
  unwrap<WechatTableDetail>(http.get(`/admin/wechat-bot/tables/${encodeURIComponent(table)}`));
export const listWechatTableRows = (table: string, params: { page: number; pageSize: number }) =>
  unwrap<PageResponse<Record<string, unknown>>>(http.get(`/admin/wechat-bot/tables/${encodeURIComponent(table)}/rows`, { params }));
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/utils/wechatBot.test.ts && npm run build`

Expected: utility tests PASS and production build exits 0.

Commit:

```bash
git add package.json package-lock.json src/api/wechatBot.ts src/utils/wechatBot.ts src/utils/wechatBot.test.ts
git commit -m "feat: add wechat bot admin client"
```

### Task 5: Build the Messages, Summary, and Database Pages

**Files:**
- Create: `src/pages/WechatMessages.tsx`
- Create: `src/pages/WechatSummary.tsx`
- Create: `src/pages/WechatDatabase.tsx`
- Create: `src/utils/wechatSummaryImage.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Task 4 API functions and utilities.
- Produces: three lazy-loadable default React page components.

- [ ] **Step 1: Add page-level behavior tests around extracted transformations**

Extend `src/utils/wechatBot.test.ts` with assertions that dynamic table cells render objects as JSON, null as an empty string, and long message text is truncated only for preview. Run `npm test` and confirm the new expectations fail before adding any missing behavior.

- [ ] **Step 2: Implement `WechatMessages`**

Use `PageHeader`, a responsive inline `Form`, group/type selectors, sender/keyword/date-time filters, and an Ant `Table`. Load groups and page 1 on mount; preserve filters across pagination; expose page sizes 20/50/100/200; render IDs and timestamps with `mono`; show full content in an ellipsis tooltip.

- [ ] **Step 3: Implement `WechatSummary` and image export**

Use group, date, period (`day`, `morning`, `afternoon`, `custom`) and conditional custom time range fields. Preserve the previous successful result during a failed request. Disable export until a non-empty result exists. `exportWechatSummaryImage` must create a high-DPI canvas, wrap headings/body text, draw metadata, call `canvas.toBlob`, download a PNG, and reject when canvas or blob creation fails.

- [ ] **Step 4: Implement `WechatDatabase`**

Use a stable two-column desktop layout and stacked mobile layout. The table list selects a database table; selection loads schema and page 1 rows in parallel. Generate columns from returned row keys, format dynamic values with `previewText`, use horizontal scrolling, and keep row pagination independent per selected table.

- [ ] **Step 5: Add scoped responsive styling**

Add `.wechat-summary-output`, `.wechat-database-layout`, `.wechat-table-list`, and mobile rules under the existing breakpoints. Do not add nested decorative cards; reuse current filter/table cards and keep fixed controls from shifting.

- [ ] **Step 6: Verify and commit**

Run: `npm test && npm run build`

Expected: all tests PASS and TypeScript/Vite build exits 0.

Commit:

```bash
git add src/pages/WechatMessages.tsx src/pages/WechatSummary.tsx src/pages/WechatDatabase.tsx src/utils/wechatSummaryImage.ts src/utils/wechatBot.test.ts src/styles.css
git commit -m "feat: add wechat bot admin pages"
```

### Task 6: Wire Routes and Permission-Aware Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/layout/AdminLayout.tsx`
- Create: `src/layout/adminMenu.test.tsx`

**Interfaces:**
- Consumes: page defaults from Task 5 and `AdminUser.menuKeys`.
- Produces: `/wechat-messages`, `/wechat-summary`, `/wechat-database` routes and the “微信机器人” navigation group.

- [ ] **Step 1: Write failing menu tests**

Export `buildMenuItems` and assert a user with only `wechat-summary` sees only `/wechat-summary` inside `wechat-group`, while a user with no WeChat keys sees no `wechat-group`. Assert all three WeChat paths map to `wechat-group` in `openKeyByPath`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/layout/adminMenu.test.tsx`

Expected: FAIL because the menu group and path mappings do not exist.

- [ ] **Step 3: Add lazy routes and navigation group**

Lazy import all three pages in `App.tsx`. In `AdminLayout.tsx`, add a `WechatOutlined` group:

```tsx
...((can('wechat-messages') || can('wechat-summary') || can('wechat-database')) ? [{
  key: 'wechat-group',
  icon: <WechatOutlined />,
  label: '微信机器人',
  children: [
    ...(can('wechat-messages') ? [{ key: '/wechat-messages', label: '消息查询' }] : []),
    ...(can('wechat-summary') ? [{ key: '/wechat-summary', label: 'AI 总结' }] : []),
    ...(can('wechat-database') ? [{ key: '/wechat-database', label: '数据库浏览' }] : []),
  ],
} as MenuItem] : []),
```

Add all three `openKeyByPath` mappings and routes.

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run build`

Expected: tests PASS and build exits 0.

Commit:

```bash
git add src/App.tsx src/layout/AdminLayout.tsx src/layout/adminMenu.test.tsx
git commit -m "feat: expose wechat bot navigation"
```

### Task 7: Publish the Standalone Frontend Retirement Notice

**Files:**
- Modify: `../wechat-bot-admin-web/README.md`

- [ ] **Step 1: Add the notice at the top of README**

Insert immediately after the title:

```markdown
> [!IMPORTANT]
> 本独立前端已停止维护和部署。微信机器人后台功能已迁移至“兔兔窝接龙-后台管理系统” (`steam-game-takeover-web`)，管理员账号与权限以兔兔窝后台为准。
>
> 本仓库仅为历史追溯暂时保留，不再接受新功能开发。后续机器人后台功能请在兔兔窝接龙管理端中维护。
```

Update the old deployment section to historical wording so it cannot be mistaken for current production instructions.

- [ ] **Step 2: Verify and commit**

Run: `cd ../wechat-bot-admin-web && npm test && node --check src/app.js && node --check src/utils.js && git diff --check`

Expected: four utility tests PASS, both syntax checks exit 0, and diff check is clean.

Commit:

```bash
git add README.md
git commit -m "docs: retire standalone bot admin frontend"
```

### Task 8: Cross-Repository Verification and Browser QA

**Files:**
- Modify only if verification exposes a defect in files already listed above.

- [ ] **Step 1: Run fresh repository verification**

```bash
cd ../wechat-bot-admin-backend && go test -count=1 ./... && go build ./cmd/server
cd ../steam-game-takeover-backend && go test -count=1 ./... && go build ./cmd/server
cd ../wechat-bot-admin-web && npm test && node --check src/app.js && node --check src/utils.js
cd ../steam-game-takeover-web && npm test && npm run build
```

Expected: every command exits 0 with no skipped/disabled tests.

- [ ] **Step 2: Start the frontend and run mocked browser flows**

Run `npm run dev` in `steam-game-takeover-web`. Use Playwright network interception for `/api/admin/me` and `/api/admin/wechat-bot/*`; verify the three pages at desktop 1440x900 and mobile 390x844, including filters, pagination, custom summary range, successful/failed summary, image export, table selection, 403, and 502 states.

- [ ] **Step 3: Inspect rendering and runtime health**

Capture screenshots for all three pages at both viewports. Confirm no overlap, clipped controls, horizontal page overflow, blank tables, console errors, or unexpected network calls. Table-local horizontal scrolling is allowed.

- [ ] **Step 4: Confirm repository state and delivery commits**

Run `git status --short --branch` and `git log -5 --oneline` in all four repositories. Confirm only intended commits/changes exist and report any required deployment environment variables without exposing secret values.
