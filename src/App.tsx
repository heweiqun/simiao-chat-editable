import { emojis, EmojiText } from './EmojiText';
import { useEffect, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import {
  Cat,
  Users,
  MessageSquare,
  SlidersHorizontal,
  Download,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Check,
  Pencil,
  X,
} from 'lucide-react';
import ChatPreview, { Avatar } from './ChatPreview';
import {
  phoneModels,
  loadDraft,
  readImage,
  uid,
  STORAGE_KEY,
  getBubbleColors,
  currentMessageTime,
  formatMessageTime,
} from './model';
import type { Message } from './model';
export default function App() {
  const isOffline = location.protocol === 'file:';
  const [draft, setDraft] = useState(loadDraft);
  const [previewZoom, setPreviewZoom] = useState<number | null>(null);
  const [previewBounds, setPreviewBounds] = useState({
    width: 600,
    height: 650,
  });
  const previewCanvas = useRef<HTMLDivElement>(null);
  const fitZoom = Math.max(
    0.25,
    Math.min(
      1,
      (previewBounds.width - 40) / (draft.settings.width + 14),
      (previewBounds.height - 40) / (draft.settings.height + 14),
    ),
  );
  const zoom = previewZoom ?? fitZoom;
  useEffect(() => {
    const canvas = previewCanvas.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) =>
      setPreviewBounds({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  const [tab, setTab] = useState('messages');
  const [roleId, setRoleId] = useState(draft.roles[0].id);
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [type, setType] = useState<Message['type']>('text');
  const [amount, setAmount] = useState('88.88');
  const [remark, setRemark] = useState('');
  const [transferFooter, setTransferFooter] = useState('微信转账');
  const [redpacketFooter, setRedpacketFooter] = useState('微信红包');
  const [received, setReceived] = useState(false);
  const [duration, setDuration] = useState('2');
  const [messageTime, setMessageTime] = useState(currentMessageTime);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const [exporting, setExporting] = useState(false);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSaveError('');
    } catch {
      setSaveError('浏览器存储空间不足，当前修改尚未保存；请减少图片数量。');
    }
  }, [draft]);
  const updateRole = (id: string, patch: object) =>
    setDraft((d) => ({
      ...d,
      roles: d.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  const cancelEdit = () => {
    setEditing(null);
    setText('');
    setImage('');
  };
  const deleteRole = (id: string) => {
    if (draft.roles.length === 1) return;
    const count = draft.messages.filter((m) => m.roleId === id).length;
    if (count && !window.confirm(`删除此角色及其 ${count} 条消息？`)) return;
    setDraft((d) => ({
      ...d,
      roles: d.roles
        .filter((r) => r.id !== id)
        .map((r, index, remaining) => ({
          ...r,
          self: remaining.some((role) => role.self) ? r.self : index === 0,
        })),
      messages: d.messages.filter((m) => m.roleId !== id),
    }));
    if (roleId === id) {
      setRoleId(draft.roles.find((r) => r.id !== id)!.id);
      cancelEdit();
    }
  };
  const upload = async (
    file: File | undefined,
    done: (url: string) => void,
  ) => {
    if (!file) return;
    try {
      done(await readImage(file));
      setNotice('');
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const content =
    type === 'transfer' || type === 'redpacket'
      ? /^\d{1,8}(\.\d{1,2})?$/.test(amount) && Number(amount) > 0
        ? remark.trim() ||
          (type === 'transfer' ? '转账给你' : '恭喜发财，大吉大利')
        : ''
      : type === 'text'
        ? text.trim()
        : type === 'image'
          ? image
          : type === 'voice'
            ? Number.isInteger(Number(duration)) &&
              Number(duration) >= 1 &&
              Number(duration) <= 60
              ? duration
              : ''
            : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(messageTime)
              ? messageTime
              : '';
  const submit = () => {
    if (!content) return;
    const message: Message = {
      id: editing || uid(),
      roleId,
      type,
      content,
      ...(type === 'transfer' || type === 'redpacket'
        ? {
            amount: Number(amount).toFixed(2),
            received,
            footer: type === 'transfer' ? transferFooter : redpacketFooter,
          }
        : {}),
    };
    setDraft((d) => ({
      ...d,
      messages: editing
        ? d.messages.map((m) => (m.id === editing ? message : m))
        : [...d.messages, message],
    }));
    cancelEdit();
  };
  const move = (index: number, delta: number) =>
    setDraft((d) => {
      const messages = [...d.messages];
      const target = index + delta;
      if (target < 0 || target >= messages.length) return d;
      [messages[index], messages[target]] = [messages[target], messages[index]];
      return { ...d, messages };
    });
  const exportImage = async () => {
    if (!preview.current) return;
    setExporting(true);
    setNotice('');
    let exportHost: HTMLDivElement | undefined;
    try {
      await document.fonts.ready;
      if (draft.settings.backgroundImage) {
        const background = new Image();
        background.src = draft.settings.backgroundImage;
        await background.decode();
      }
      await Promise.all(
        Array.from(preview.current.querySelectorAll('img')).map((img) =>
          img.decode(),
        ),
      );
      // HTML-to-image does not preserve scrollTop when it clones the DOM.
      // Flatten the visible scroll offset into a transform on an export-only copy.
      const exportCopy = preview.current.cloneNode(true) as HTMLDivElement;
      // Keep off-screen positioning on a parent that is NOT captured.
      exportHost = document.createElement('div');
      exportHost.style.cssText =
        'position:fixed;left:-100000px;top:0;pointer-events:none;';
      exportHost.setAttribute('aria-hidden', 'true');
      exportHost.appendChild(exportCopy);
      const sourceMessages =
        preview.current.querySelector<HTMLElement>('.chat-messages');
      const copiedMessages =
        exportCopy.querySelector<HTMLElement>('.chat-messages');
      if (sourceMessages && copiedMessages) {
        const content = document.createElement('div');
        content.style.display = 'flow-root';
        content.style.transform = `translateY(-${sourceMessages.scrollTop}px)`;
        while (copiedMessages.firstChild)
          content.appendChild(copiedMessages.firstChild);
        copiedMessages.appendChild(content);
        copiedMessages.style.overflow = 'hidden';
      }
      document.body.appendChild(exportHost);
      await Promise.all(
        Array.from(exportCopy.querySelectorAll('img')).map((img) =>
          img.decode(),
        ),
      );
      const blob = await toBlob(exportCopy, {
        pixelRatio: 3,
        filter: (node) =>
          !(
            node instanceof Element && node.classList.contains('preview-delete')
          ),
        backgroundColor:
          draft.settings.theme === 'dark' ? '#00020e' : '#f5f5f5',
        cacheBust: false,
      });
      if (!blob) throw new Error('图片生成失败');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `四喵对话-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setNotice('图片已导出（3 倍清晰度）');
    } catch (e) {
      setNotice(`导出失败：${(e as Error).message}`);
    } finally {
      exportHost?.remove();
      setExporting(false);
    }
  };
  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const downloadOffline = async () => {
    const link = document.createElement('a');
    link.download = '四喵对话生成器-离线版.html';
    if (location.protocol === 'file:') {
      link.href = location.href;
      link.click();
      return;
    }
    setDownloadingOffline(true);
    try {
      const response = await fetch(
        import.meta.env.DEV
          ? '/__offline-download'
          : new URL('./index.html', location.href),
        { cache: 'no-store' },
      );
      if (!response.ok)
        throw new Error('离线文件不存在，请先执行 npm run build');
      const html = await response.text();
      const documentCopy = new DOMParser().parseFromString(html, 'text/html');
      if (
        !documentCopy.querySelector('#root') ||
        documentCopy.querySelector('script[src], link[rel="stylesheet"]')
      )
        throw new Error('请先构建单文件离线版');
      const url = URL.createObjectURL(
        new Blob([html], { type: 'text/html;charset=utf-8' }),
      );
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setNotice('离线版已下载，可直接用浏览器打开');
    } catch (error) {
      setNotice(`下载失败：${(error as Error).message}`);
    } finally {
      setDownloadingOffline(false);
    }
  };
  const tabs = [
    { id: 'messages', label: '对话', icon: MessageSquare },
    { id: 'roles', label: '角色', icon: Users },
    { id: 'settings', label: '显示设置', icon: SlidersHorizontal },
  ];
  return (
    <>
      <header className="topbar">
        <a className="brand" href="./">
          <span>
            <Cat size={25} />
          </span>
          四喵
          <span className="brand-divider" />
          对话生成器
        </a>
        <div className="topbar-actions">
          {isOffline ? (
            <a
              className="secondary offline-download online-link"
              href="https://heweiqun.github.io/simiao-chat-editable/"
              target="_blank"
              rel="noopener noreferrer"
            >
              打开在线版
            </a>
          ) : (
            <button
              className="secondary offline-download"
              onClick={downloadOffline}
              disabled={downloadingOffline}
            >
              <Download size={15} />
              {downloadingOffline ? '正在下载…' : '下载离线版'}
            </button>
          )}
          <div className="version">
            可编辑版 <span>V1.0</span>
          </div>
        </div>
      </header>
      <main className="workspace">
        <section className="editor">
          <div className="editor-heading">
            <span className="eyebrow">CHAT STUDIO</span>
            <h1>让对话，生动起来。</h1>
            <p>编辑角色与消息，实时生成你的专属聊天画面。</p>
          </div>
          <div className="editor-layout">
            <nav className="tabs">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={tab === t.id ? 'active' : ''}
                  onClick={() => setTab(t.id)}
                >
                  <t.icon size={17} />
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="panel">
              {tab === 'roles' && (
                <>
                  <div className="section-title">
                    <h2>角色管理</h2>
                    <button
                      className="text-button"
                      onClick={() => {
                        const id = uid();
                        setDraft((d) => ({
                          ...d,
                          roles: [
                            ...d.roles,
                            { id, name: '新角色', avatar: '', self: false },
                          ],
                        }));
                      }}
                    >
                      <Plus size={16} />
                      添加角色
                    </button>
                  </div>
                  <p className="hint">
                    点击头像更换图片；“自己”的消息显示在右侧。
                  </p>
                  {draft.roles.map((r) => (
                    <div className="role-card" key={r.id}>
                      <label className="avatar-upload">
                        <Avatar role={r} />
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          aria-label={`上传${r.name}头像`}
                          onChange={(e) => {
                            upload(e.target.files?.[0], (url) =>
                              updateRole(r.id, { avatar: url }),
                            );
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <div className="role-info">
                        <input
                          aria-label="角色名称"
                          value={r.name}
                          maxLength={30}
                          onChange={(e) =>
                            updateRole(r.id, { name: e.target.value })
                          }
                        />
                        <label className="checkbox">
                          <input
                            type="radio"
                            name="self"
                            checked={r.self}
                            onChange={() =>
                              setDraft((d) => ({
                                ...d,
                                roles: d.roles.map((role) => ({
                                  ...role,
                                  self: role.id === r.id,
                                })),
                              }))
                            }
                          />
                          设为自己
                        </label>
                      </div>
                      <button
                        className="icon-button danger"
                        aria-label={`删除角色${r.name}`}
                        disabled={draft.roles.length === 1}
                        onClick={() => deleteRole(r.id)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </>
              )}
              {tab === 'messages' && (
                <>
                  <div className="section-title">
                    <h2>{editing ? '编辑消息' : '添加消息'}</h2>
                    <span className="subtle">{draft.roles.length} 位角色</span>
                  </div>
                  <label className="field">
                    发送角色
                    <select
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                    >
                      {draft.roles.map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.name}
                          {r.self ? '（自己）' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="type-switch">
                    <button
                      className={type === 'text' ? 'selected' : ''}
                      onClick={() => setType('text')}
                    >
                      <MessageSquare size={15} />
                      文字消息
                    </button>
                    <button
                      className={type === 'image' ? 'selected' : ''}
                      onClick={() => setType('image')}
                    >
                      <ImagePlus size={15} />
                      图片消息
                    </button>
                    <button
                      className={type === 'voice' ? 'selected' : ''}
                      onClick={() => setType('voice')}
                    >
                      语音消息
                    </button>
                    <button
                      className={type === 'time' ? 'selected' : ''}
                      onClick={() => setType('time')}
                    >
                      时间消息
                    </button>
                    {(['transfer', 'redpacket'] as const).map((kind) => (
                      <button
                        key={kind}
                        className={type === kind ? 'selected' : ''}
                        onClick={() => setType(kind)}
                      >
                        {kind === 'transfer' ? '转账消息' : '红包消息'}
                      </button>
                    ))}
                  </div>
                  {type === 'transfer' || type === 'redpacket' ? (
                    <>
                      <label className="field">
                        {type === 'transfer' ? '转账' : '红包'}金额
                        <input
                          type="number"
                          min="0.01"
                          max="99999999.99"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        {type === 'transfer' ? '转账' : '红包'}备注
                        <input
                          value={remark}
                          maxLength={100}
                          placeholder={
                            type === 'transfer'
                              ? '转账给你'
                              : '恭喜发财，大吉大利'
                          }
                          onChange={(e) => setRemark(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        底部文字
                        <input
                          value={
                            type === 'transfer'
                              ? transferFooter
                              : redpacketFooter
                          }
                          maxLength={40}
                          onChange={(e) =>
                            type === 'transfer'
                              ? setTransferFooter(e.target.value)
                              : setRedpacketFooter(e.target.value)
                          }
                        />
                      </label>
                      <label className="checkbox financial-received">
                        <input
                          type="checkbox"
                          checked={received}
                          onChange={(e) => setReceived(e.target.checked)}
                        />
                        已接收
                      </label>
                    </>
                  ) : type === 'voice' ? (
                    <label className="field">
                      语音时长（秒）
                      <input
                        type="number"
                        min="1"
                        max="60"
                        step="1"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </label>
                  ) : type === 'time' ? (
                    <label className="field">
                      消息日期与时间
                      <input
                        type="datetime-local"
                        value={messageTime}
                        onChange={(e) => setMessageTime(e.target.value)}
                      />
                    </label>
                  ) : type === 'text' ? (
                    <>
                      <textarea
                        ref={textInput}
                        placeholder="写点什么，让故事开始…"
                        aria-label="消息内容"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                      />
                      <details className="emoji-picker" open>
                        <summary>选择表情</summary>
                        <div className="emoji-grid">
                          {emojis.map((emoji) => (
                            <button
                              type="button"
                              key={emoji.id}
                              title={emoji.id}
                              aria-label={`插入表情 ${emoji.id}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const input = textInput.current;
                                const start =
                                  input?.selectionStart ?? text.length;
                                const end = input?.selectionEnd ?? text.length;
                                const token = `[${emoji.id}]`;
                                setText(
                                  text.slice(0, start) +
                                    token +
                                    text.slice(end),
                                );
                                requestAnimationFrame(() => {
                                  input?.focus();
                                  input?.setSelectionRange(
                                    start + token.length,
                                    start + token.length,
                                  );
                                });
                              }}
                            >
                              <img src={emoji.src} alt="" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      </details>
                    </>
                  ) : (
                    <label className="image-upload">
                      {image ? (
                        <img src={image} alt="待发送图片" />
                      ) : (
                        <>
                          <ImagePlus size={27} />
                          <strong>点击上传图片</strong>
                          <span>PNG / JPG / WebP / GIF · 最大 8 MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        aria-label="上传消息图片"
                        onChange={(e) => {
                          upload(e.target.files?.[0], setImage);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  <div className="compose-actions">
                    {editing && (
                      <button className="secondary" onClick={cancelEdit}>
                        <X size={16} />
                        取消
                      </button>
                    )}
                    <button
                      className="primary"
                      disabled={!content}
                      onClick={submit}
                    >
                      {editing ? <Check size={17} /> : <Plus size={17} />}{' '}
                      {editing ? '保存修改' : '添加到对话'}
                    </button>
                  </div>
                  <div className="message-list-heading">
                    <h2>消息列表</h2>
                    <span>{draft.messages.length} 条消息</span>
                  </div>
                  <div className="message-list">
                    {draft.messages.length === 0 && (
                      <p className="empty">还没有消息，添加第一条对话吧。</p>
                    )}
                    {draft.messages.map((m, index) => (
                      <div
                        className={`message-card ${editing === m.id ? 'editing' : ''}`}
                        key={m.id}
                      >
                        <div className="message-number">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className="message-summary">
                          <strong>
                            {draft.roles.find((r) => r.id === m.roleId)?.name}
                          </strong>
                          {m.type !== 'image' ? (
                            <p>
                              {m.type === 'time' ? (
                                formatMessageTime(m.content)
                              ) : m.type === 'voice' ? (
                                `语音 ${m.content}″`
                              ) : (
                                <EmojiText text={m.content} />
                              )}
                            </p>
                          ) : (
                            <img src={m.content} alt="消息缩略图" />
                          )}
                        </div>
                        <div className="message-actions">
                          <button
                            aria-label="上移消息"
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            aria-label="下移消息"
                            disabled={index === draft.messages.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            aria-label="编辑消息"
                            onClick={() => {
                              setEditing(m.id);
                              setRoleId(m.roleId);
                              setType(m.type);
                              if (
                                m.type === 'transfer' ||
                                m.type === 'redpacket'
                              ) {
                                setAmount(m.amount || '88.88');
                                setRemark(m.content);
                                setReceived(m.received === true);
                                if (m.type === 'transfer')
                                  setTransferFooter(m.footer ?? '微信转账');
                                else setRedpacketFooter(m.footer ?? '微信红包');
                              }
                              if (m.type === 'voice') setDuration(m.content);
                              if (m.type === 'time') setMessageTime(m.content);
                              setText(m.type === 'text' ? m.content : '');
                              setImage(m.type === 'image' ? m.content : '');
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            aria-label="删除消息"
                            onClick={() => {
                              setDraft((d) => ({
                                ...d,
                                messages: d.messages.filter(
                                  (x) => x.id !== m.id,
                                ),
                              }));
                              if (editing === m.id) cancelEdit();
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {tab === 'settings' && (
                <>
                  <div className="section-title">
                    <h2>画面设置</h2>
                    <SlidersHorizontal size={18} />
                  </div>
                  <label className="field">
                    显示模式
                    <select
                      value={draft.settings.theme}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          settings: {
                            ...d.settings,
                            theme: e.target.value as 'light' | 'dark',
                          },
                        }))
                      }
                    >
                      <option value="light">浅色模式</option>
                      <option value="dark">深色模式</option>
                    </select>
                  </label>
                  <div className="field-grid">
                    {(['other', 'self'] as const).map((side) => (
                      <label className="field" key={side}>
                        {side === 'other'
                          ? '对方聊天框背景色'
                          : '己方聊天框背景色'}
                        <input
                          type="color"
                          value={getBubbleColors(draft.settings)[side]}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              settings: {
                                ...d.settings,
                                bubbleColors: {
                                  ...d.settings.bubbleColors,
                                  [d.settings.theme]: {
                                    ...getBubbleColors(d.settings),
                                    [side]: e.target.value,
                                  },
                                },
                              },
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="text-button"
                          onClick={(e) => {
                            e.preventDefault();
                            setDraft((d) => ({
                              ...d,
                              settings: {
                                ...d.settings,
                                bubbleColors: {
                                  ...d.settings.bubbleColors,
                                  [d.settings.theme]: {
                                    ...getBubbleColors(d.settings),
                                    [side]: getBubbleColors({
                                      ...d.settings,
                                      bubbleColors: undefined,
                                    })[side],
                                  },
                                },
                              },
                            }));
                          }}
                        >
                          重置
                        </button>
                      </label>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        settings: {
                          ...d.settings,
                          bubbleColors: {
                            ...d.settings.bubbleColors,
                            [d.settings.theme]: undefined,
                          },
                        },
                      }))
                    }
                  >
                    恢复当前模式默认颜色
                  </button>
                  <p className="hint color-hint">
                    浅色和深色模式的气泡颜色分别保存。
                  </p>
                  <label className="field">
                    对话标题
                    <input
                      value={draft.settings.title}
                      maxLength={40}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          settings: { ...d.settings, title: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <div className="field-grid">
                    <label className="field">
                      手机时间
                      <input
                        type="time"
                        value={draft.settings.time}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            settings: { ...d.settings, time: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      电池电量 {draft.settings.battery}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={draft.settings.battery}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            settings: {
                              ...d.settings,
                              battery: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="checkbox location-setting">
                    <input
                      type="checkbox"
                      checked={draft.settings.location}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          settings: {
                            ...d.settings,
                            location: e.target.checked,
                          },
                        }))
                      }
                    />
                    显示定位图标
                  </label>
                  <label className="field">
                    WiFi 信号
                    <select
                      value={draft.settings.wifi}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          settings: {
                            ...d.settings,
                            wifi: Number(e.target.value) as 0 | 1 | 2 | 3,
                          },
                        }))
                      }
                    >
                      <option value="0">关闭 WiFi 图标</option>
                      <option value="1">1 级 · 弱</option>
                      <option value="2">2 级 · 中</option>
                      <option value="3">3 级 · 强</option>
                    </select>
                  </label>
                  <div className="field">
                    聊天背景图片
                    <label className="image-upload background-upload">
                      {draft.settings.backgroundImage ? (
                        <img
                          src={draft.settings.backgroundImage}
                          alt="当前聊天背景"
                        />
                      ) : (
                        <>
                          <ImagePlus size={25} />
                          <span>点击上传背景图片 · 最大 8 MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        aria-label="上传聊天背景图片"
                        onChange={(e) => {
                          upload(e.target.files?.[0], (url) =>
                            setDraft((d) => ({
                              ...d,
                              settings: { ...d.settings, backgroundImage: url },
                            })),
                          );
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {draft.settings.backgroundImage && (
                      <button
                        className="text-button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            settings: {
                              ...d.settings,
                              backgroundImage: undefined,
                            },
                          }))
                        }
                      >
                        移除背景图片
                      </button>
                    )}
                  </div>
                  <label className="field">
                    手机型号选择
                    <select
                      value={
                        phoneModels.find(
                          (m) =>
                            m.id === draft.settings.phoneModel &&
                            m.width === draft.settings.width &&
                            m.height === draft.settings.height,
                        )?.id ??
                        phoneModels.find(
                          (m) =>
                            m.width === draft.settings.width &&
                            m.height === draft.settings.height,
                        )?.id ??
                        ''
                      }
                      onChange={(e) => {
                        const model = phoneModels.find(
                          (m) => m.id === e.target.value,
                        );
                        if (!model) return;
                        setDraft((d) => ({
                          ...d,
                          settings: {
                            ...d.settings,
                            phoneModel: model.id,
                            width: model.width,
                            height: model.height,
                          },
                        }));
                      }}
                    >
                      <option value="" disabled>
                        当前尺寸 {draft.settings.width} ×{' '}
                        {draft.settings.height}
                      </option>
                      {phoneModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}（{m.width} × {m.height}）
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={draft.settings.online}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          settings: { ...d.settings, online: e.target.checked },
                        }))
                      }
                    />
                    显示在线状态
                  </label>
                  <div className="info-box">
                    画面高度固定，消息区域可上下滚动；导出当前画面可见的对话。
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="save-status">
            {saveError || (
              <>
                <span />
                修改自动保存在此浏览器
              </>
            )}
          </div>
        </section>
        <section className="preview-section">
          <aside className="preview-side-tools">
            <div className="preview-toolbar">
              <div>
                <span className="live-dot" />
                实时预览
                <span className="preview-size">
                  {draft.settings.width} px · 3× 导出
                </span>
              </div>
              <button
                className="primary export"
                disabled={exporting}
                onClick={exportImage}
              >
                <Download size={16} />
                {exporting ? '正在生成…' : '导出图片'}
              </button>
            </div>
            <div className="preview-zoom">
              <label htmlFor="preview-zoom">缩放</label>
              <input
                id="preview-zoom"
                type="range"
                min="25"
                max="125"
                step="5"
                value={Math.round(zoom * 100)}
                onChange={(e) => setPreviewZoom(Number(e.target.value) / 100)}
              />
              <span>{Math.round(zoom * 100)}%</span>
              <button
                className="text-button"
                onClick={() => setPreviewZoom(null)}
              >
                适应窗口
              </button>
            </div>
          </aside>
          <div className="preview-canvas" ref={previewCanvas}>
            <div
              className="scaled-preview"
              style={{
                width: (draft.settings.width + 14) * zoom,
                height: (draft.settings.height + 14) * zoom,
              }}
            >
              <div
                className="phone-frame"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: draft.settings.width + 14,
                }}
              >
                <ChatPreview
                  draft={draft}
                  ref={preview}
                  onDelete={(id) => {
                    setDraft((d) => ({
                      ...d,
                      messages: d.messages.filter((m) => m.id !== id),
                    }));
                    if (editing === id) cancelEdit();
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer>
        四喵对话生成器 <span>·</span> 自由编辑，即刻成图
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="关闭提示" onClick={() => setNotice('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
