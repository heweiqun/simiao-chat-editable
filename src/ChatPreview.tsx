import { EmojiText } from './EmojiText';
import { forwardRef, type CSSProperties } from 'react';
import { getBubbleColors, formatMessageTime } from './model';
import type { Draft, Role } from './model';
const iconAssets = import.meta.glob<string>('../assets/icon/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function ChatIcon({
  name,
  theme,
  label,
}: {
  name: string;
  theme: 'light' | 'dark';
  label: string;
}) {
  // Asset suffixes describe the icon color: dark ink for a light background.
  const color = theme === 'dark' ? 'light' : 'dark';
  return (
    <img
      className="chat-icon"
      src={iconAssets[`../assets/icon/${name}_${color}.png`]}
      alt={label}
    />
  );
}

export function Avatar({ role }: { role: Role }) {
  return role.avatar ? (
    <img className="avatar" src={role.avatar} alt={role.name} />
  ) : (
    <div className={`avatar initials ${role.self ? 'self' : ''}`}>
      {role.name.slice(0, 1) || '喵'}
    </div>
  );
}
const ChatPreview = forwardRef<
  HTMLDivElement,
  { draft: Draft; onDelete: (id: string) => void }
>(({ draft, onDelete }, ref) => {
  const { settings: s, roles, messages } = draft;
  const deleteButton = (id: string) => (
    <button
      type="button"
      className="preview-delete"
      aria-label="删除此消息"
      onClick={() => onDelete(id)}
    >
      删除
    </button>
  );
  const colors = getBubbleColors(s);
  const ink = s.theme === 'dark' ? 'light' : 'dark';
  const battery = Math.max(0, Math.min(100, s.battery));
  return (
    <div
      className={`phone theme-${s.theme}`}
      ref={ref}
      style={
        {
          width: s.width,
          height: s.height,
          backgroundImage: s.backgroundImage
            ? `url(${JSON.stringify(s.backgroundImage)})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          '--chat-bubble': colors.other,
          '--chat-mine': colors.self,
        } as CSSProperties
      }
    >
      <div className="status-bar">
        <span className="status-time">
          <strong>{s.time}</strong>
          {s.location && (
            <img
              className="location-icon"
              src={iconAssets[`../assets/icon/ios-location-${ink}.png`]}
              alt="定位已开启"
            />
          )}
        </span>
        <span className="status-icons">
          <img
            className="signal-icon"
            src={iconAssets[`../assets/icon/ios-single-4-${ink}.png`]}
            alt="蜂窝信号 4 格"
          />
          {s.wifi > 0 && (
            <img
              className="wifi-icon"
              src={iconAssets[`../assets/icon/ios-wifi-${s.wifi}-${ink}.png`]}
              alt={`WiFi 信号 ${s.wifi} 级`}
            />
          )}
          <span
            className="battery"
            role="img"
            aria-label={`电池电量 ${battery}%`}
          >
            <img
              src={iconAssets[`../assets/icon/ios-battery_${ink}.png`]}
              alt=""
            />
            <span className="battery-level">
              <i style={{ width: `${battery}%` }} />
            </span>
            <b>{battery}</b>
          </span>
        </span>
      </div>
      <div className="chat-header">
        <ChatIcon name="back" theme={s.theme} label="返回" />
        <div>
          <strong>{s.title || '未命名对话'}</strong>
          {s.online && (
            <small>
              <i />
              在线
            </small>
          )}
        </div>
        <ChatIcon name="more" theme={s.theme} label="更多" />
      </div>
      <div className="chat-messages">
        {!messages.some((m) => m.type === 'time') && (
          <div className="time-notice">今天 {s.time}</div>
        )}
        {messages.map((m) => {
          if (m.type === 'time')
            return (
              <div key={m.id} className="time-notice deletable-time">
                {formatMessageTime(m.content)}
                {deleteButton(m.id)}
              </div>
            );
          const role = roles.find((r) => r.id === m.roleId);
          if (!role) return null;
          return (
            <div key={m.id} className={`chat-row ${role.self ? 'mine' : ''}`}>
              <Avatar role={role} />
              <div className="message-body">
                {deleteButton(m.id)}
                <div
                  className={`bubble ${m.type === 'image' ? 'image-bubble' : m.type === 'voice' ? 'voice-bubble' : ''}`}
                >
                  {m.type === 'text' ? (
                    <EmojiText text={m.content} />
                  ) : m.type === 'voice' ? (
                    <span
                      className="voice-message"
                      style={{
                        minWidth: 44 + Math.min(60, Number(m.content)) * 1.5,
                      }}
                    >
                      <img
                        src={
                          iconAssets[
                            `../assets/icon/voice-icon-${role.self ? 'light' : s.theme}.png`
                          ]
                        }
                        alt="语音"
                      />
                      <span>{m.content}″</span>
                    </span>
                  ) : (
                    <img src={m.content} alt="图片消息" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat-input">
        <ChatIcon name="voice" theme={s.theme} label="语音" />
        <div>发送信息</div>
        <ChatIcon name="emjio" theme={s.theme} label="表情" />
        <ChatIcon name="plus" theme={s.theme} label="添加" />
      </div>
      <div className="home-bar">
        <i />
      </div>
    </div>
  );
});
export default ChatPreview;
