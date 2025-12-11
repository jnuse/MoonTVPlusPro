# 源池子管理系统 ✅

**状态：** 已完成
**完成时间：** 2025-12-11
**执行者：** Claude Code

## 功能概述

源池子管理系统用于管理和优选视频源/直播源：
- 维护去重的源池子
- 支持禁用不喜欢的源
- 通过延迟和画质测试进行优选排序
- 提供订阅端点返回排序后的源

## 使用指南

### 1. 管理界面

访问 `/admin` 页面，展开"源池子管理"标签（仅站长可见）：

- **添加源**：填写源名称、API 地址、类型、分类标签、测试关键词
- **导入源**：从现有配置（SourceConfig/LiveConfig）一键导入
- **测试源**：单个测试或全部测试，自动更新延迟和画质数据
- **启用/禁用**：控制源是否参与排序
- **删除源**：移除不需要的源

### 2. 订阅端点

公开端点，返回优选后的源列表：

```bash
GET /api/subscribe?key=normal&type=video&num=10
```

**参数：**
- `key`：分类标签（如 normal、anime）
- `type`：源类型（video 或 stream）
- `num`：返回数量（1-100，默认 10）

**响应示例：**
```json
{
  "key": "normal",
  "type": "video",
  "count": 10,
  "sources": [
    {
      "key": "source_xxx",
      "name": "示例源",
      "api": "http://example.com/api",
      "latency": 150,
      "quality": 80
    }
  ],
  "updatedAt": 1702300000000
}
```

### 3. 管理 API

需要站长权限：

- `GET /api/admin/source-pool` - 获取所有源
- `POST /api/admin/source-pool` - 添加源
- `PUT /api/admin/source-pool/[id]` - 更新源
- `DELETE /api/admin/source-pool/[id]` - 删除源
- `POST /api/admin/source-pool/test` - 测试源
- `POST /api/admin/source-pool/import` - 导入源

## 技术实现

### 数据结构

```typescript
interface SourcePoolItem {
  id: string;
  name: string;
  api: string;
  type: 'video' | 'stream';
  keys: string[];
  testKeyword: string;
  enabled: boolean;
  createdAt: number;
  lastTestTime?: number;
  metrics?: {
    latency: number;
    quality: number;
    success: boolean;
    error?: string;
  };
}
```

### 画质评分

基于 `vod_remarks` 字段：
- 4K/超高清: 100分
- 蓝光/BD: 90分
- 1080p/全高清: 80分
- 720p/高清/HD: 60分
- 标清/SD: 40分
- 其他: 20分

### 排序算法

1. 过滤启用且匹配的源
2. 过滤测试成功的源
3. 按延迟升序排序
4. 延迟相同时按画质降序排序

### 性能优化

- 测试超时：30秒
- 批量测试限流：3 并发
- 缓存机制：按 key_type 分组缓存

## 文件清单

**类型定义：**
- `src/types/source-pool.types.ts`

**核心逻辑：**
- `src/lib/source-pool.ts` - CRUD、去重、排序
- `src/lib/source-tester.ts` - 测试、画质评分

**API 端点：**
- `src/app/api/subscribe/route.ts`
- `src/app/api/admin/source-pool/route.ts`
- `src/app/api/admin/source-pool/[id]/route.ts`
- `src/app/api/admin/source-pool/test/route.ts`
- `src/app/api/admin/source-pool/import/route.ts`

**管理界面：**
- `src/components/admin/SourcePoolConfig.tsx`
- `src/app/admin/page.tsx`（已集成）

## 后续改进建议

- [ ] 添加定时自动测试功能
- [ ] 支持自定义画质评分规则
- [ ] 添加源测试历史记录
- [ ] 支持批量编辑源标签
- [ ] 添加源性能趋势图表
