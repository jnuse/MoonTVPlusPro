# TODO - 订阅URL端点系统

## 功能概述

创建一个订阅URL端点系统，用于管理和优选视频源/直播源：
- 维护去重的源池子
- 支持禁用不喜欢的源
- 通过延迟和画质测试进行优选排序
- 提供订阅端点返回排序后的源

## 数据结构设计

```typescript
// 源池子项
interface SourcePoolItem {
  id: string;                    // 唯一ID
  name: string;                  // 源名称
  api: string;                   // API地址（用于去重）
  type: 'video' | 'stream';      // 视频源或直播源
  keys: string[];                // 分类标签 ['normal', 'anime']
  testKeyword: string;           // 测试关键词（如"斗罗大陆"）
  enabled: boolean;              // 是否启用
  createdAt: number;             // 创建时间
  lastTestTime?: number;         // 上次测试时间
  metrics?: {
    latency: number;             // 延迟（毫秒）
    quality: number;             // 画质分数（0-100）
    success: boolean;            // 测试是否成功
  };
}

// 缓存结构
interface SourcePoolCache {
  [key_type: string]: {          // 如 "normal_video"
    sources: SourcePoolItem[];
    updatedAt: number;
  };
}
```

## 画质评分标准

基于 `vod_remarks` 字段：
- 4K/超高清: 100分
- 蓝光/BD: 90分
- 1080p/全高清: 80分
- 720p/高清/HD: 60分
- 标清/SD: 40分
- 其他/无标签: 20分

## 排序算法

1. 过滤：enabled=true 且匹配 key 和 type
2. 过滤：有有效 metrics（测试成功）
3. 排序：先按 latency 升序（延迟越低越好）
4. 排序：延迟相同时按 quality 降序（画质越高越好）
5. 返回前 num 个

## API 端点设计

### 订阅端点（公开）
- `GET /api/subscribe?key=normal&type=video&num=10`

### 管理端点（需要站长权限）
- `GET /api/admin/source-pool` - 获取所有源
- `POST /api/admin/source-pool` - 添加源
- `PUT /api/admin/source-pool/[id]` - 更新源（禁用/启用/修改）
- `DELETE /api/admin/source-pool/[id]` - 删除源
- `POST /api/admin/source-pool/test` - 测试源（单个或全部）
- `POST /api/admin/source-pool/import` - 从现有配置导入

## 实现步骤

### 阶段1：数据层（基础）
- [ ] 创建类型定义 `src/types/source-pool.types.ts`
- [ ] 扩展 `AdminConfig` 接口支持 sourcePool 和 sourcePoolCache
- [ ] 创建工具函数 `src/lib/source-pool.ts`（CRUD、去重、排序）

### 阶段2：测试服务（核心）
- [ ] 创建 `src/lib/source-tester.ts`
- [ ] 实现 `testVideoSource()` - 调用搜索API测试延迟和画质
- [ ] 实现 `calculateQualityScore()` - 根据 vod_remarks 计算分数
- [ ] 实现 `sortSources()` - 排序逻辑

### 阶段3：API 实现
- [ ] `src/app/api/subscribe/route.ts` - 订阅端点
- [ ] `src/app/api/admin/source-pool/route.ts` - 列表和添加
- [ ] `src/app/api/admin/source-pool/[id]/route.ts` - 更新和删除
- [ ] `src/app/api/admin/source-pool/test/route.ts` - 测试
- [ ] `src/app/api/admin/source-pool/import/route.ts` - 导入

### 阶段4：管理界面
- [ ] 在 `/admin` 页面添加"源池子管理"标签页
- [ ] 源列表展示（名称、类型、状态、测试结果）
- [ ] 操作按钮（测试、禁用/启用、编辑、删除）
- [ ] 添加源表单
- [ ] 导入按钮

## 技术要点

### 去重逻辑
基于 `api` 字段去重（相同API地址视为同一源）

### 测试流程
1. 调用 `/api/search?keyword={testKeyword}&site={sourceKey}`
2. 测量响应时间（延迟）
3. 分析返回结果的 vod_remarks，计算平均画质分数
4. 存储到 metrics

### 缓存策略
- 测试完成后更新对应 key_type 的缓存
- 订阅端点优先返回缓存
- 缓存不存在时提示需要先测试

### 错误处理
- 测试超时30秒视为失败
- 失败源不参与排序
- 记录失败原因

### 性能优化
- 测试采用异步处理
- 批量测试时限流（避免同时测试过多源）

## 数据初始化

- 首次使用时从 `AdminConfig.ConfigFile.api_site` 和 `lives` 导入现有源
- 为每个源自动分配默认 key（'normal'）
- 站长可后续修改 key 和 testKeyword

---

**创建时间：** 2025-12-11
**执行者：** Claude Code
