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
