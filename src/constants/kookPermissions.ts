export const kookPermissionOptions = [
  { value: 1, label: '管理员' },
  { value: 2, label: '管理服务器' },
  { value: 4, label: '查看管理日志' },
  { value: 8, label: '创建服务器邀请' },
  { value: 16, label: '管理邀请' },
  { value: 32, label: '频道管理' },
  { value: 64, label: '踢出用户' },
  { value: 128, label: '封禁用户' },
  { value: 256, label: '管理自定义表情' },
  { value: 512, label: '修改服务器昵称' },
  { value: 1024, label: '管理角色权限' },
  { value: 2048, label: '查看文字、语音频道' },
  { value: 4096, label: '发布消息' },
  { value: 8192, label: '管理消息' },
  { value: 16384, label: '上传文件' },
  { value: 32768, label: '语音链接' },
  { value: 65536, label: '语音管理' },
  { value: 131072, label: '提及@全体成员' },
  { value: 262144, label: '添加反应' },
  { value: 524288, label: '跟随添加反应' },
  { value: 1048576, label: '被动连接语音频道' },
  { value: 2097152, label: '仅使用按键说话' },
  { value: 4194304, label: '使用自由麦' },
  { value: 8388608, label: '说话' },
  { value: 16777216, label: '服务器静音' },
  { value: 33554432, label: '服务器闭麦' },
  { value: 67108864, label: '修改他人昵称' },
  { value: 134217728, label: '播放伴奏' },
  { value: 268435456, label: '屏幕分享' },
  { value: 536870912, label: '回复帖子' },
  { value: 1073741824, label: '开启录音' },
];

export function permissionBits(value: unknown) {
  const numeric = Number(value) || 0;
  return kookPermissionOptions
    .filter((item) => (numeric & item.value) === item.value)
    .map((item) => item.value);
}

export function permissionValue(bits: unknown) {
  if (!Array.isArray(bits)) return Number(bits) || 0;
  return bits.reduce((sum, bit) => sum | (Number(bit) || 0), 0);
}

export function permissionText(value: unknown) {
  const labels = permissionBits(value)
    .map((bit) => kookPermissionOptions.find((item) => item.value === bit)?.label)
    .filter(Boolean);
  return labels.length ? labels.join('、') : '无';
}
