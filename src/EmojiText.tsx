import { Fragment } from 'react';

const assets = import.meta.glob<string>('../assets/emoji/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
export const emojis = Object.entries(assets)
  .map(([path, src]) => ({
    id: path.split('/').pop()!.replace('.png', ''),
    src,
  }))
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
const byId = new Map(emojis.map((emoji) => [emoji.id, emoji.src]));

export function EmojiText({ text }: { text: string }) {
  return text.split(/(\[emoji_\d+\])/g).map((part, index) => {
    const id = part.slice(1, -1);
    const src = byId.get(id);
    return src ? (
      <img key={index} className="inline-emoji" src={src} alt={part} />
    ) : (
      <Fragment key={index}>{part}</Fragment>
    );
  });
}
