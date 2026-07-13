# System Settings Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the system settings page compact and scannable by showing one settings category at a time without changing any setting behavior.

**Architecture:** Keep `Settings` as the owner of the single Ant Design form and of all current API actions. Add a small, typed settings-section metadata module for the navigation labels and keys, then use local active-section state to switch panels while keeping all inputs mounted. Replace the narrow all-in-one card with a responsive two-column workspace styled in the shared stylesheet.

**Tech Stack:** React 19, TypeScript, Ant Design 6, Vitest, Vite, shared CSS.

## Global Constraints

- Do not change settings API endpoints, payload keys, validation rules, authorization, or defaults.
- Keep one mounted `Form`, so edits survive section changes before saving or resetting.
- Desktop navigation is a left-side section list; at `860px` and below it becomes a horizontal tab bar.
- Do not introduce nested or repeated cards; use unframed panels and separators.
- Use existing Ant Design components and existing CSS variables only.
- Verify desktop and mobile layouts in a real browser before release.

---

### Task 1: Define Tested Settings Section Metadata

**Files:**
- Create: `src/utils/settingsSections.ts`
- Create: `src/utils/settingsSections.test.ts`

**Interfaces:**
- Consumes: no application state.
- Produces: `SettingsSectionKey`, `settingsSections`, and `isSettingsSectionKey(value: string): value is SettingsSectionKey` for `src/pages/Settings.tsx`.

- [ ] **Step 1: Write the failing metadata test**

```ts
import { describe, expect, it } from 'vitest';
import { isSettingsSectionKey, settingsSections } from './settingsSections';

describe('settings sections', () => {
  it('exposes every visible settings category in display order', () => {
    expect(settingsSections.map((section) => section.key)).toEqual([
      'takeover',
      'steam',
      'kook',
      'ai',
    ]);
  });

  it('accepts only supported category keys', () => {
    expect(isSettingsSectionKey('kook')).toBe(true);
    expect(isSettingsSectionKey('unknown')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/utils/settingsSections.test.ts`

Expected: FAIL because `./settingsSections` does not exist.

- [ ] **Step 3: Add the typed section metadata**

```ts
export const settingsSectionKeys = ['takeover', 'steam', 'kook', 'ai'] as const;

export type SettingsSectionKey = (typeof settingsSectionKeys)[number];

export const settingsSections: Array<{ key: SettingsSectionKey; label: string; description: string }> = [
  { key: 'takeover', label: '接龙设置', description: '发布开关与每日接龙结束规则' },
  { key: 'steam', label: 'Steam', description: 'SteamID 校验所需密钥' },
  { key: 'kook', label: 'KOOK', description: '机器人、Webhook 与接入状态' },
  { key: 'ai', label: 'AI', description: '汇总词提取与历史刷新' },
];

export function isSettingsSectionKey(value: string): value is SettingsSectionKey {
  return settingsSectionKeys.includes(value as SettingsSectionKey);
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- src/utils/settingsSections.test.ts`

Expected: PASS with two tests.

- [ ] **Step 5: Commit the tested metadata**

```bash
git add src/utils/settingsSections.ts src/utils/settingsSections.test.ts
git commit -m "test: define settings section metadata"
```

### Task 2: Recompose the Settings Page Around an Active Section

**Files:**
- Modify: `src/pages/Settings.tsx`
- Modify: `src/styles.css`
- Test: `src/utils/settingsSections.test.ts`

**Interfaces:**
- Consumes: `settingsSections` and `SettingsSectionKey` from `src/utils/settingsSections.ts`.
- Produces: settings navigation that changes only visible content while preserving the current `Form`, save/reset handlers, and API actions.

- [ ] **Step 1: Add active-section state and the navigation import**

```ts
import { Button, Collapse, Form, Input, InputNumber, Space, Switch, Tabs, Typography, App as AntApp } from 'antd';
import { settingsSections, type SettingsSectionKey } from '../utils/settingsSections';

const [activeSection, setActiveSection] = useState<SettingsSectionKey>('takeover');
```

Use `settingsSections` to render the desktop left navigation buttons and `Tabs` items for the mobile navigation. Set `activeSection` through the typed section key; do not reload the form while changing it.

- [ ] **Step 2: Replace the all-in-one card with a workspace and four mounted panels**

```tsx
<div className="settings-workspace" data-active-section={activeSection}>
  <nav className="settings-section-nav" aria-label="设置分组">
    {settingsSections.map((section) => (
      <button
        key={section.key}
        className={section.key === activeSection ? 'is-active' : ''}
        type="button"
        onClick={() => setActiveSection(section.key)}
      >
        <strong>{section.label}</strong>
        <span>{section.description}</span>
      </button>
    ))}
  </nav>
  <div className="settings-content">
    <Tabs
      className="settings-section-tabs"
      activeKey={activeSection}
      onChange={(key) => setActiveSection(key as SettingsSectionKey)}
      items={settingsSections.map(({ key, label }) => ({ key, label }))}
    />
    <Form form={form} layout="vertical" onFinish={onFinish} disabled={submitting}>
      <section hidden={activeSection !== 'takeover'} className="settings-panel" aria-labelledby="settings-takeover-title">
        <Typography.Title level={4} id="settings-takeover-title">接龙设置</Typography.Title>
      </section>
      <section hidden={activeSection !== 'steam'} className="settings-panel" aria-labelledby="settings-steam-title">
        <Typography.Title level={4} id="settings-steam-title">Steam</Typography.Title>
      </section>
      <section hidden={activeSection !== 'kook'} className="settings-panel" aria-labelledby="settings-kook-title">
        <Typography.Title level={4} id="settings-kook-title">KOOK</Typography.Title>
      </section>
      <section hidden={activeSection !== 'ai'} className="settings-panel" aria-labelledby="settings-ai-title">
        <Typography.Title level={4} id="settings-ai-title">AI</Typography.Title>
      </section>
      <div className="settings-actions">
        <Button type="primary" htmlType="submit" loading={submitting}>保存设置</Button>
        <Button onClick={reset} disabled={submitting}>撤销修改</Button>
        <Typography.Paragraph type="secondary" className="settings-note">
          敏感密钥保存前会二次确认；保存成功后页面会重新读取服务端配置。
        </Typography.Paragraph>
      </div>
    </Form>
  </div>
</div>
```

Move each existing `Form.Item` to its matching section without changing names,
rules, inputs, handlers, user-facing messages, or action callbacks:

- `takeover`: `publishTakeoverEnabled` and `dailyTakeoverExpirationDays`.
- `steam`: `uapiKey` and `steamWebApiKey` inside `settings-field-grid`.
- `kook`: `kookBotToken`, `kookGuildId`, `kookVerifyToken`, and
  `kookEncryptKey` inside `settings-field-grid`; the existing webhook URL,
  copy buttons, test button, status texts, and a collapsed `Collapse` item
  titled `KOOK 接入说明` containing the existing instruction text.
- `ai`: `aiExtractEnabled`, `aiExtractBaseUrl`, `aiExtractModel`, and
  `aiExtractApiKey`; retain the existing status texts and historical-summary
  refresh button.

Keep URLs, action rows, and status rows full width. Render one shared
`settings-actions` block after the four sections; because hidden panels remain
mounted, it submits the same form regardless of active section and switching
sections never discards edited values.

- [ ] **Step 3: Add responsive workspace styles**

```css
.settings-workspace {
  display: grid;
  grid-template-columns: minmax(184px, 220px) minmax(0, 1fr);
  gap: 28px;
  max-width: 1120px;
}

.settings-section-nav {
  display: grid;
  align-content: start;
  gap: 4px;
  padding-right: 20px;
  border-right: 1px solid var(--line);
}

.settings-section-tabs { display: none; }
.settings-content { min-width: 0; }
.settings-panel { min-width: 0; }
.settings-field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.settings-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line); }

@media (max-width: 860px) {
  .settings-workspace { display: block; max-width: none; }
  .settings-section-nav { display: none; }
  .settings-section-tabs { display: block; margin-bottom: 20px; }
  .settings-field-grid { grid-template-columns: 1fr; }
}
```

Remove the `.settings-card` width constraint. Add button, panel heading,
status, collapse, and `640px` action-control rules consistent with the shared
stylesheet so text wraps rather than overflows.

- [ ] **Step 4: Run static verification**

Run: `npm test && npm run build`

Expected: all existing Vitest tests pass and `vite build` completes after
TypeScript validation.

- [ ] **Step 5: Verify the interaction and responsive layout in a browser**

Run: `npm run dev`

At desktop width, open `/settings`, choose each navigation item, and confirm
only the selected panel is visible. Edit a field, switch categories, and return
to confirm the edit remains. Confirm the KOOK instructions are collapsed by
default and expand correctly. At `390px` width, confirm the tabs are visible,
the side navigation is absent, fields are one column, and all action buttons
fit without overlap.

- [ ] **Step 6: Commit the page and styling change**

```bash
git add src/pages/Settings.tsx src/styles.css
git commit -m "refactor: organize system settings by section"
```

### Task 3: Release Verification

**Files:**
- Modify: no source files expected.

**Interfaces:**
- Consumes: the production deployment process already used by this repository.
- Produces: a deployed settings layout at `/settings` with build artifacts only; do not commit generated assets.

- [ ] **Step 1: Inspect the committed diff and repository status**

Run: `git status --short --branch && git log --oneline -3`

Expected: only the intended commits are present and no generated files or
credentials are staged.

- [ ] **Step 2: Push the release commit**

Run: `git push origin master`

Expected: the tested settings layout commits are available to the production
deployment checkout.

- [ ] **Step 3: Deploy the already-built frontend through the established server workflow**

Run: use the existing production frontend release process that replaces the
deployed `dist/` directory with the verified build from Task 2.

Expected: no backend process is restarted and no Nginx configuration is
changed, because `/settings` is an existing client-side route and the API
origin remains `/miniprogram-api`.

- [ ] **Step 4: Validate the existing Nginx configuration and smoke-test production**

Run: `nginx -t`

Expected: the active configuration is valid; do not reload Nginx because this
release does not modify it.

Open: `https://www.rabbits.ink/settings`

Expected: the four settings categories render, all existing actions are
available, and the layout meets the desktop and mobile checks from Task 2.
