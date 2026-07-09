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

export function createAdminUser(values: { username: string; password: string; nickname?: string }) {
  return unwrap<Record<string, unknown>>(http.post('/admin/admin-users', values));
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

export function deleteTakeover(id: React.Key) {
  return unwrap<null>(http.delete(`/admin/takeovers/${id}`));
}

export function listUsers(params: Query) {
  return unwrap<PageResult<Record<string, unknown>>>(
    http.get('/admin/users', { params }),
  );
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
