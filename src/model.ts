import defaultAvatar from '../assets/media/role1.5a2a8193.jpeg';
export interface Role {
  id: string;
  name: string;
  avatar: string;
  self: boolean;
}
export interface Message {
  id: string;
  roleId: string;
  type: 'text' | 'image' | 'voice' | 'time' | 'transfer' | 'redpacket';
  amount?: string;
  received?: boolean;
  footer?: string;
  content: string;
}
export const phoneModels = [
  { id: '13-mini', name: 'iPhone 13 Mini', width: 375, height: 812 },
  { id: '13-pro', name: 'iPhone 13 Pro', width: 390, height: 844 },
  { id: '14-pro', name: 'iPhone 14 Pro', width: 390, height: 844 },
  { id: '14-pro-max', name: 'iPhone 14 Pro Max', width: 428, height: 928 },
  { id: '15', name: 'iPhone 15', width: 393, height: 852 },
  { id: '15-pro-max', name: 'iPhone 15 Pro Max', width: 430, height: 932 },
  { id: '16', name: 'iPhone 16', width: 393, height: 852 },
  { id: '17', name: 'iPhone 17', width: 402, height: 874 },
];
export interface Settings {
  theme: 'light' | 'dark';
  bubbleColors?: Partial<
    Record<'light' | 'dark', { other: string; self: string }>
  >;
  phoneModel?: string;
  backgroundImage?: string;
  title: string;
  time: string;
  battery: number;
  location: boolean;
  wifi: 0 | 1 | 2 | 3;
  online: boolean;
  width: number;
  height: number;
}
export function getBubbleColors(settings: Settings) {
  const defaults =
    settings.theme === 'dark'
      ? { other: '#2c2c2c', self: '#7391ec' }
      : { other: '#ffffff', self: '#b8ed19' };
  const saved = settings.bubbleColors?.[settings.theme];
  const valid = (color: unknown): color is string =>
    typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);
  return {
    other: valid(saved?.other) ? saved.other : defaults.other,
    self: valid(saved?.self) ? saved.self : defaults.self,
  };
}
export interface Draft {
  roles: Role[];
  messages: Message[];
  settings: Settings;
}
export const uid = () => crypto.randomUUID();
export const defaultDraft: Draft = {
  roles: [
    {
      id: 'friend',
      name: '喵喵',
      avatar: defaultAvatar,
      self: false,
    },
    { id: 'me', name: '自己', avatar: '', self: true },
  ],
  messages: [
    { id: 'one', roleId: 'friend', type: 'text', content: '今天也要开心呀 ☀️' },
    {
      id: 'two',
      roleId: 'me',
      type: 'text',
      content: '收到！一起去喝杯咖啡吧 ☕',
    },
  ],
  settings: {
    theme: 'light',
    title: '喵喵',
    time: '12:22',
    battery: 60,
    location: false,
    wifi: 3,
    online: true,
    width: 375,
    height: 812,
  },
};
export const STORAGE_KEY = 'simiao-editable-v1';
export function loadDraft(): Draft {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (
      d &&
      Array.isArray(d.roles) &&
      d.roles.length &&
      d.roles.every(
        (r: Role) =>
          typeof r.id === 'string' &&
          typeof r.name === 'string' &&
          typeof r.avatar === 'string' &&
          typeof r.self === 'boolean',
      ) &&
      Array.isArray(d.messages) &&
      d.messages.every(
        (m: Message) =>
          typeof m.id === 'string' &&
          ['text', 'image', 'voice', 'time', 'transfer', 'redpacket'].includes(
            m.type,
          ) &&
          typeof m.content === 'string' &&
          d.roles.some((r: Role) => r.id === m.roleId),
      ) &&
      d.settings &&
      typeof d.settings.title === 'string' &&
      typeof d.settings.time === 'string' &&
      [375, 390, 393, 402, 414, 428, 430].includes(d.settings.width) &&
      Number.isFinite(d.settings.height) &&
      d.settings.height >= 500 &&
      d.settings.height <= 1600 &&
      Number.isFinite(d.settings.battery)
    )
      return {
        ...d,
        roles: d.roles.map((role: Role) => ({
          ...role,
          avatar: /^(?:\.\/|\/)?media\/role1\.5a2a8193\.jpeg$/.test(role.avatar)
            ? defaultAvatar
            : role.avatar,
        })),
        settings: {
          ...d.settings,
          theme: d.settings.theme === 'dark' ? 'dark' : 'light',
          location: d.settings.location === true,
          wifi: [0, 1, 2, 3].includes(d.settings.wifi) ? d.settings.wifi : 3,
          battery: Math.max(0, Math.min(100, Math.round(d.settings.battery))),
        },
      };
  } catch {
    /* A damaged draft falls back to a usable example. */
  }
  return structuredClone(defaultDraft);
}
export async function readImage(file: File): Promise<string> {
  if (
    !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)
  )
    throw new Error('请选择 PNG、JPG、WebP 或 GIF 图片');
  if (file.size > 8 * 1024 * 1024) throw new Error('图片不能超过 8 MB');
  const url = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('图片读取失败'));
    r.readAsDataURL(file);
  });
  const img = new Image();
  img.src = url;
  await img.decode();
  return url;
}

export function currentMessageTime(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return parts.replace(' ', 'T');
}
export function formatMessageTime(value: string, now = new Date()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const date = `${year}-${month}-${day}`;
  const today = currentMessageTime(now).slice(0, 10);
  const yesterday = currentMessageTime(
    new Date(now.getTime() - 86400000),
  ).slice(0, 10);
  if (date === yesterday) return `昨天 ${hour}:${minute}`;
  if (date === today)
    return `${Number(hour) < 12 ? '上午' : '下午'} ${hour}:${minute}`;
  return `${year}年${Number(month)}月${Number(day)}日 ${hour}:${minute}`;
}
