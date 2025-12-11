# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

MoonTVPlus 是基于 Next.js 14 开发的影视聚合播放器，支持多源搜索、在线播放、弹幕系统、外部播放器跳转、视频超分等功能。

技术栈：Next.js 14 (App Router) + TypeScript + Tailwind CSS + ArtPlayer + Socket.IO

## 开发命令

```bash
# 安装依赖（使用 pnpm）
pnpm install

# 开发模式（生成 manifest 并启动自定义服务器）
pnpm dev

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 代码检查并自动修复
pnpm lint:fix

# 严格模式检查（零警告）
pnpm lint:strict

# 代码格式化
pnpm format

# 格式化检查
pnpm format:check

# 运行测试
pnpm test

# 测试监听模式
pnpm test:watch

# 生成 PWA manifest
pnpm gen:manifest

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 启动观影室独立服务器（端口 3001）
pnpm watch-room:server
```

## 测试相关

运行单个测试文件：
```bash
pnpm test -- path/to/test-file.test.ts
```

## 核心架构

### 1. 存储层抽象（src/lib/db.ts）

项目使用统一的存储抽象层 `IStorage`，支持多种后端：
- **Redis**：`RedisStorage` (src/lib/redis.db.ts)
- **Kvrocks**：`KvrocksStorage` (src/lib/kvrocks.db.ts) - 推荐
- **Upstash**：`UpstashRedisStorage` (src/lib/upstash.db.ts)
- **LocalStorage**：仅客户端使用

通过环境变量 `NEXT_PUBLIC_STORAGE_TYPE` 控制存储类型。

存储内容包括：
- 用户认证信息
- 播放记录（PlayRecord）
- 收藏（Favorite）
- 搜索历史
- 管理员配置（AdminConfig）
- 跳过配置（SkipConfig）
- 弹幕过滤配置（DanmakuFilterConfig）

### 2. 配置系统（src/lib/config.ts）

配置分为两层：
- **环境变量配置**：站点基础设置（站点名、公告、代理类型等）
- **动态配置文件**：视频源、直播源、自定义分类（存储在 AdminConfig.ConfigFile 中）

配置文件结构：
```json
{
  "cache_time": 7200,
  "api_site": {
    "key": {
      "api": "http://example.com/api.php/provide/vod",
      "name": "示例资源",
      "detail": "http://example.com"
    }
  },
  "custom_category": [
    {
      "name": "华语",
      "type": "movie",
      "query": "华语"
    }
  ],
  "lives": {
    "key": {
      "name": "直播源名称",
      "url": "http://example.com/live.m3u",
      "ua": "User-Agent",
      "epg": "http://epg.example.com"
    }
  }
}
```

配置使用内存缓存（`cachedConfig`），通过 `getConfig()` 获取。

### 3. API 路由结构（src/app/api/）

- **搜索**：`/api/search` - 多源聚合搜索，支持流式输出
- **详情**：`/api/detail` - 获取视频详情
- **播放记录**：`/api/playrecords` - CRUD 播放记录
- **收藏**：`/api/favorites` - CRUD 收藏
- **弹幕**：`/api/danmaku/*` - 弹幕搜索、匹配、加载
- **豆瓣**：`/api/douban/*` - 豆瓣数据代理
- **直播**：`/api/live/*` - 直播频道、EPG
- **管理**：`/api/admin/*` - 管理员配置、用户管理、源管理
- **代理**：`/api/proxy/*` - M3U8/TS 片段代理

### 4. 认证与中间件（src/middleware.ts）

使用 JWT token 进行认证，存储在 cookie 中。

受保护路由：
- `/admin` - 仅站长（owner）可访问
- `/api/admin/*` - 管理 API
- `/api/favorites` - 需要登录
- `/api/playrecords` - 需要登录

公开路由：
- `/login` - 登录页
- `/api/login` - 登录 API
- `/api/search` - 搜索 API
- `/api/detail` - 详情 API

### 5. 组件架构

**布局组件**：
- `PageLayout` - 页面主布局（侧边栏 + 内容区）
- `Sidebar` - 桌面端侧边栏导航
- `MobileBottomNav` - 移动端底部导航
- `MobileHeader` - 移动端顶部标题栏

**功能组件**：
- `VideoCard` - 视频卡片
- `EpisodeSelector` - 剧集选择器
- `DanmakuPanel` - 弹幕面板
- `DownloadPanel` - M3U8 下载面板
- `DoubanComments` - 豆瓣评论
- `ContinueWatching` - 继续观看

**上下文**：
- `SiteProvider` - 全局站点配置
- `ThemeProvider` - 主题切换
- `WatchRoomProvider` - 观影室状态
- `DownloadContext` - 下载管理

### 6. 播放器集成

使用 ArtPlayer 作为主播放器，支持：
- HLS.js 流媒体播放
- 弹幕插件（artplayer-plugin-danmuku）
- 视频超分（Anime4K WebGPU）
- 外部播放器跳转（PotPlayer、VLC、MPV 等）

播放器相关代码位于 `/play` 页面。

### 7. 观影室功能（实验性）

基于 Socket.IO 实现多人同步观影：
- 服务端：`src/lib/watch-room-server.ts`
- 客户端：`src/hooks/useWatchRoom.ts`
- 语音聊天：`src/hooks/useVoiceChat.ts`（WebRTC P2P + 服务器中转）

独立服务器：`server/watch-room-standalone-server.js`

## 路径别名

```typescript
@/*  -> src/*
~/*  -> public/*
```

## 代码规范

### Import 顺序（由 ESLint 自动排序）

1. 外部库和副作用导入
2. CSS 文件
3. Lib 和 hooks (`@/lib`, `@/hooks`)
4. 静态数据 (`@/data`)
5. 组件 (`@/components`)
6. Store (`@/store`)
7. 其他 `@/` 导入
8. 相对路径导入（最多 3 层）
9. 类型 (`@/types`)

### 命名约定

- 组件文件：PascalCase（如 `VideoCard.tsx`）
- 工具函数：camelCase（如 `fetchVideoDetail.ts`）
- 类型文件：kebab-case 或 camelCase（如 `admin.types.ts`）
- API 路由：kebab-case（如 `change-password/route.ts`）

### TypeScript

- 启用严格模式
- 避免使用 `any`（除非必要时添加 `@typescript-eslint/no-explicit-any` 注释）
- 优先使用接口而非类型别名（用于对象结构）

### React

- 使用函数组件和 Hooks
- 避免使用 `React.FC`（直接声明函数）
- Props 解构优先
- 使用 `'use client'` 标记客户端组件

## 环境变量

关键环境变量（参考 README.md）：
- `USERNAME` / `PASSWORD` - 站长账号（必填）
- `NEXT_PUBLIC_STORAGE_TYPE` - 存储类型（redis/kvrocks/upstash）
- `REDIS_URL` / `KVROCKS_URL` / `UPSTASH_URL` - 存储连接地址
- `NEXT_PUBLIC_SITE_NAME` - 站点名称
- `DANMAKU_API_BASE` / `DANMAKU_API_TOKEN` - 弹幕 API 配置
- `WATCH_ROOM_ENABLED` - 是否启用观影室

## 部署

### Docker

项目使用 `output: 'standalone'` 模式构建，支持 Docker 部署。

Dockerfile 位于项目根目录，使用自定义服务器（`server.js`）而非 Next.js 默认服务器。

### Vercel

支持一键部署到 Vercel，但需要配置环境变量和外部存储（Upstash）。

## 注意事项

1. **存储一致性**：所有用户数据操作必须通过 `db` 实例（`src/lib/db.ts`）
2. **配置缓存**：修改配置后需调用 `setCachedConfig()` 更新内存缓存
3. **认证检查**：新增受保护路由需在 `middleware.ts` 中配置
4. **API 格式**：视频源 API 必须符合苹果 CMS V10 格式
5. **PWA**：修改 manifest 需运行 `pnpm gen:manifest`
6. **代码混淆**：生产构建时部分代码会被混淆（`webpack-obfuscator`）
7. **Git Hooks**：提交前会自动运行 lint-staged（ESLint + Prettier）
8. **React Strict Mode**：已禁用（`reactStrictMode: false`）以避免某些库的兼容性问题
