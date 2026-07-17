import { AdminUser } from '../auth';
import { http, unwrap } from './http';

export type PageResult<T> = {
  list?: T[];
  items?: T[];
  total: number;
  page: number;
  pageSize?: number;
  page_size?: number;
};

export type Query = Record<string, string | number | boolean | undefined>;

export function adminLogin(values: { username: string; password: string }) {
  return unwrap<{ token: string; expiresIn: number; admin: AdminUser }>(
    http.post('/admin/auth/login', values),
  );
}

export function adminLogout() {
  return unwrap<null>(http.post('/admin/auth/logout'));
}

export function getAdminMe() {
  return unwrap<AdminUser>(http.get('/admin/me'));
}

export function listAdminUsers(params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get('/admin/admin-users', { params }),
  );
}

export function createAdminUser(values: { username: string; password: string; nickname?: string; role?: string }) {
  return unwrap<Record<string, unknown>>(http.post('/admin/admin-users', values));
}

export function updateAdminUser(id: React.Key, values: { password?: string; nickname?: string; role?: string; enabled?: boolean }) {
  return unwrap<Record<string, unknown>>(http.put(`/admin/admin-users/${id}`, values));
}

export function listRoleMenus() {
  return unwrap<{ allMenus: { key: string; label: string }[]; roles: { role: string; label: string; menuKeys: string[] }[] }>(
    http.get('/admin/role-menus'),
  );
}

export function updateRoleMenus(roles: { role: string; menuKeys: string[] }[]) {
  return unwrap<null>(http.put('/admin/role-menus', { roles }));
}

export function updateAdminMe(values: { nickname?: string; avatarUrl?: string }) {
  return unwrap<AdminUser>(http.put('/admin/me', values));
}

export function updateAdminPassword(values: { oldPassword: string; newPassword: string }) {
  return unwrap<null>(http.put('/admin/me/password', values));
}

export function getDashboardSummary() {
  return unwrap<Record<string, number>>(http.get('/admin/dashboard/summary'));
}

export function listTakeovers(params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get('/admin/takeovers', { params }),
  );
}

export function getTakeover(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.get(`/admin/takeovers/${id}`));
}

export function listTakeoverMemberActivities(id: React.Key, params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get(`/admin/takeovers/${id}/member-activities`, { params }),
  );
}

export function createTakeover(values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.post('/admin/takeovers', values));
}

export function updateTakeover(id: React.Key, values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.put(`/admin/takeovers/${id}`, values));
}

export function refreshTakeoverSummaries() {
  return unwrap<{ count: number }>(http.post('/admin/takeovers/summary/refresh'));
}

export function deleteTakeover(id: React.Key) {
  return unwrap<null>(http.delete(`/admin/takeovers/${id}`));
}

export function listUsers(params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get('/admin/users', { params }),
  );
}

export function listUserBlocks(params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get('/admin/user-blocks', { params }),
  );
}

export function createUserBlock(values: { ownerUserId: React.Key; blockedUserId: React.Key }) {
  return unwrap<Record<string, unknown>>(http.post('/admin/user-blocks', values));
}

export function updateUserBlock(id: React.Key, values: { ownerUserId: React.Key; blockedUserId: React.Key }) {
  return unwrap<Record<string, unknown>>(http.put(`/admin/user-blocks/${id}`, values));
}

export function deleteUserBlock(id: React.Key) {
  return unwrap<null>(http.delete(`/admin/user-blocks/${id}`));
}

export function getUser(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.get(`/admin/users/${id}`));
}

export function banUser(id: React.Key, reason: string) {
  return unwrap<null>(http.post(`/admin/users/${id}/ban`, { reason }));
}

export function unbanUser(id: React.Key) {
  return unwrap<null>(http.post(`/admin/users/${id}/unban`));
}

export function restoreUserCredit(id: React.Key, toScore = 100) {
  return unwrap<null>(http.post(`/admin/users/${id}/credit`, { toScore }));
}

export function batchPublishWhitelist(openids: string[]) {
  return unwrap<{ count: number }>(
    http.post('/admin/publish-whitelist/batch', { openids }),
  );
}

export function batchTakeoverView(userIds: React.Key[], canViewAllTakeovers: boolean) {
  return unwrap<{ count: number }>(
    http.post('/admin/takeover-view/batch', { userIds, canViewAllTakeovers }),
  );
}

export function listFeedbacks(params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get('/admin/user-feedbacks', { params }),
  );
}

export function getFeedback(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.get(`/admin/user-feedbacks/${id}`));
}

export function updateFeedbackStatus(id: React.Key, status: number) {
  return unwrap<{ message: string }>(
    http.put(`/admin/user-feedbacks/${id}/status`, { status }),
  );
}

export function listReports(params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get('/admin/reports', { params }),
  );
}

export function getReport(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.get(`/admin/reports/${id}`));
}

export function approveReport(id: React.Key, values: { content?: string; penaltyScore: number }) {
  return unwrap<null>(http.post(`/admin/reports/${id}/approve`, values));
}

export function rejectReport(id: React.Key, values: { reason?: string }) {
  return unwrap<null>(http.post(`/admin/reports/${id}/reject`, values));
}

export function listAnnouncements(params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get('/admin/announcements', { params }),
  );
}

export function getAnnouncement(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.get(`/admin/announcements/${id}`));
}

export function createAnnouncement(values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.post('/admin/announcements', values));
}

export function updateAnnouncement(id: React.Key, values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.put(`/admin/announcements/${id}`, values));
}

export function enableAnnouncement(id: React.Key) {
  return unwrap<null>(http.post(`/admin/announcements/${id}/enable`));
}

export function disableAnnouncement(id: React.Key) {
  return unwrap<null>(http.post(`/admin/announcements/${id}/disable`));
}

export function deleteAnnouncement(id: React.Key) {
  return unwrap<null>(http.delete(`/admin/announcements/${id}`));
}

export function listKookMembers(params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get('/admin/kook-members', { params }),
  );
}

export function getKookMember(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.get(`/admin/kook-members/${id}`));
}

export function createKookMember(values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.post('/admin/kook-members', values));
}

export function updateKookMember(id: React.Key, values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.put(`/admin/kook-members/${id}`, values));
}

export function deleteKookMember(id: React.Key) {
  return unwrap<null>(http.delete(`/admin/kook-members/${id}`));
}

export function syncKookMembers() {
  return unwrap<{ count: number }>(http.post('/admin/kook-members/sync'));
}

export function blacklistKookMember(id: React.Key, values: { reason?: string; delMsgDays?: number }) {
  return unwrap<null>(http.post(`/admin/kook-members/${id}/blacklist`, values));
}

export function unblacklistKookMember(id: React.Key) {
  return unwrap<null>(http.post(`/admin/kook-members/${id}/unblacklist`));
}

export function listKookChannels(params: Query) {
  return unwrap<Record<string, unknown>>(http.get('/admin/kook-channels', { params }));
}

export type KookChannelUsage = {
  channelId: string;
  durationSeconds: number;
  durationText: string;
  occupiedDurationSeconds: number;
  occupiedDurationText: string;
  sessionCount: number;
  activeUserCount: number;
};

export type KookChannelSortScheduleType = 'daily' | 'weekly' | 'monthly';
export type KookChannelSortRunStatus =
  | 'planning'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'rollback_failed';

export type KookChannelSortRun = {
  id: number;
  trigger: 'scheduled' | 'manual';
  status: KookChannelSortRunStatus;
  rangeStart: string;
  rangeEnd: string;
  plannedCount: number;
  movedCount: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type KookChannelSortRunsResult = {
  list: KookChannelSortRun[];
  total: number;
  page: number;
  pageSize: number;
};

export type KookChannelSortConfigUpdate = {
  enabled: boolean;
  groupIds: string[];
  scheduleType: KookChannelSortScheduleType;
  weekday: number | null;
  monthday: number | null;
  hour: number;
};

export type KookChannelSortConfig = KookChannelSortConfigUpdate & {
  nextRunAt: string | null;
  latestRun: KookChannelSortRun | null;
};

export type KookChannelSortPlanGroup = {
  groupId: string;
  groupName: string;
  order: number;
  channelCount: number;
};

export type KookChannelSortMove = {
  channelId: string;
  channelName: string;
  fromParentId: string;
  fromParentName: string;
  toParentId: string;
  toParentName: string;
  fromLevel: number;
  toLevel: number;
  usageSeconds: number;
  usageText: string;
  occupiedDurationSeconds: number;
  occupiedDurationText: string;
};

export type KookChannelSortPlan = {
  range: { startTime: string; endTime: string };
  groups: KookChannelSortPlanGroup[];
  moves: KookChannelSortMove[];
  moveCount: number;
};

export type KookChannelMoveRequest = {
  targetParentId: string;
  placement: 'top' | 'bottom' | 'before' | 'after';
  anchorChannelId?: string;
};

export function listKookChannelUsageSummary(params: Query) {
  return unwrap<{ range: { startTime: string; endTime: string }; list: KookChannelUsage[] }>(
    http.get('/admin/kook-channels/usage-summary', { params }),
  );
}

export function getKookChannelSortConfig() {
  return unwrap<KookChannelSortConfig>(http.get('/admin/kook-channel-sort/config'));
}

export function updateKookChannelSortConfig(values: KookChannelSortConfigUpdate) {
  return unwrap<KookChannelSortConfig>(http.put('/admin/kook-channel-sort/config', values));
}

export function previewKookChannelSort() {
  return unwrap<KookChannelSortPlan>(http.post('/admin/kook-channel-sort/preview'));
}

export function runKookChannelSort() {
  return unwrap<KookChannelSortRun>(http.post('/admin/kook-channel-sort/run'));
}

export function listKookChannelSortRuns(params: Query) {
  return unwrap<KookChannelSortRunsResult>(
    http.get('/admin/kook-channel-sort/runs', { params }),
  );
}

export function moveKookChannel(id: React.Key, values: KookChannelMoveRequest) {
  return unwrap<Record<string, unknown>>(http.post(`/admin/kook-channels/${id}/move`, values));
}

export function getKookChannel(id: React.Key, params?: Query) {
  return unwrap<Record<string, unknown>>(http.get(`/admin/kook-channels/${id}`, { params }));
}

export function createKookChannel(values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.post('/admin/kook-channels', values));
}

export function updateKookChannel(id: React.Key, values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.put(`/admin/kook-channels/${id}`, values));
}

export function deleteKookChannel(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.delete(`/admin/kook-channels/${id}`));
}

export function listKookChannelUsers(id: React.Key) {
  return unwrap<Record<string, unknown>[]>(http.get(`/admin/kook-channels/${id}/users`));
}

export function moveKookChannelUsers(id: React.Key, userIds: string[]) {
  return unwrap<Record<string, unknown>>(http.post(`/admin/kook-channels/${id}/move-user`, { userIds }));
}

export function kickoutKookChannelUser(id: React.Key, userId: string) {
  return unwrap<Record<string, unknown>>(http.post(`/admin/kook-channels/${id}/kickout`, { userId }));
}

export function getKookChannelRoles(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.get(`/admin/kook-channels/${id}/roles`));
}

export function createKookChannelRole(id: React.Key, values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.post(`/admin/kook-channels/${id}/roles`, values));
}

export function updateKookChannelRole(id: React.Key, values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.put(`/admin/kook-channels/${id}/roles`, values));
}

export function deleteKookChannelRole(id: React.Key, values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(
    http.delete(`/admin/kook-channels/${id}/roles`, { data: values }),
  );
}

export function syncKookChannelRoles(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.post(`/admin/kook-channels/${id}/roles/sync`));
}

export function listKookRoles(params: Query) {
  return unwrap<Record<string, unknown>>(http.get('/admin/kook-roles', { params }));
}

export function createKookRole(values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.post('/admin/kook-roles', values));
}

export function updateKookRole(id: React.Key, values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.put(`/admin/kook-roles/${id}`, values));
}

export function deleteKookRole(id: React.Key) {
  return unwrap<Record<string, unknown>>(http.delete(`/admin/kook-roles/${id}`));
}

export function grantKookRole(id: React.Key, userId: string) {
  return unwrap<Record<string, unknown>>(http.post(`/admin/kook-roles/${id}/grant`, { userId }));
}

export function revokeKookRole(id: React.Key, userId: string) {
  return unwrap<Record<string, unknown>>(http.post(`/admin/kook-roles/${id}/revoke`, { userId }));
}

export function getKookUserMe() {
  return unwrap<Record<string, unknown>>(http.get('/admin/kook-users/me'));
}

export function getKookUser(userId: string) {
  return unwrap<Record<string, unknown>>(http.get(`/admin/kook-users/view/${userId}`));
}

export function offlineKookBot() {
  return unwrap<Record<string, unknown>>(http.post('/admin/kook-users/bot/offline'));
}

export function onlineKookBot() {
  return unwrap<Record<string, unknown>>(http.post('/admin/kook-users/bot/online'));
}

export function getKookBotOnlineStatus() {
  return unwrap<Record<string, unknown>>(http.get('/admin/kook-users/bot/online-status'));
}

export type KookVoiceUsage = {
  guildId?: string;
  channelId?: string;
  channelName?: string;
  kookUserId?: string;
  username?: string;
  nickname?: string;
  date?: string;
  durationSeconds: number;
  durationText: string;
  sessionCount: number;
  lastJoinedAt?: string;
};

export type KookVoiceSession = {
  id: React.Key;
  guildId: string;
  channelId: string;
  channelName?: string;
  kookUserId: string;
  username?: string;
  nickname?: string;
  joinedAt: string;
  exitedAt?: string;
  durationSeconds: number;
  durationText: string;
  status: string;
  source: string;
};

export type KookVoiceStats = {
  range: { startTime: string; endTime: string };
  userStats: KookVoiceUsage[];
  channelStats: KookVoiceUsage[];
  dailyRanking: KookVoiceUsage[];
  sessions: KookVoiceSession[];
  total: number;
  page: number;
  pageSize: number;
};

export function getKookVoiceStats(params: Query) {
  return unwrap<KookVoiceStats>(http.get('/admin/kook-voice/stats', { params }));
}

export function uploadAdminImage(file: File) {
  const data = new FormData();
  data.append('file', file);
  return unwrap<{ url: string; objectKey: string }>(
    http.post('/admin/uploads/image', data),
  );
}

export function uploadAnnouncementImage(file: File) {
  return uploadAdminImage(file);
}

export function getSettings() {
  return unwrap<Record<string, unknown>>(http.get('/admin/settings'));
}

export function updateSettings(values: Record<string, unknown>) {
  return unwrap<Record<string, unknown>>(http.put('/admin/settings', values));
}
