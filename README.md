# 四喵对话生成器 · 独立可编辑版

React + TypeScript + Vite 项目，所需图标、表情和默认头像均包含在本目录内，不依赖原 simiaoChat 目录。

## 启动

需要 Node.js 20.19+。

```sh
npm ci
npm run dev
```

## 构建

```sh
npm run build
npm run preview
```

部署 dist/ 中的文件即可，支持子路径部署。

## 目录

- src/：编辑器、聊天预览、样式、草稿数据模型
- assets/icon/：深浅模式和语音图标
- assets/emoji/：108 个表情资源
- public/media/：默认头像

支持文字、图片、语音、时间消息；角色编辑；深浅模式和气泡配色；状态栏设置；固定高度与消息滚动；3 倍 PNG 导出。草稿自动保存在当前浏览器，域名或端口变化后不会自动同步。
