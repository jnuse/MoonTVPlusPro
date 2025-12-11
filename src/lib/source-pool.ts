import type { AdminConfig } from '@/lib/admin.types';
import type { SourcePoolItem, SourcePoolCache } from '@/types/source-pool.types';
import { db } from '@/lib/db';
import { getConfig, setCachedConfig } from '@/lib/config';

/**
 * 规范化 API 地址（用于去重）
 */
export function normalizeApiUrl(api: string): string {
  return api.trim().toLowerCase().replace(/\/+$/, '');
}

/**
 * 检查是否重复（基于 API 地址）
 */
export function isDuplicate(api: string, existingSources: SourcePoolItem[]): boolean {
  const normalized = normalizeApiUrl(api);
  return existingSources.some((s) => normalizeApiUrl(s.api) === normalized);
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 添加源到池子
 */
export async function addSource(
  source: Omit<SourcePoolItem, 'id' | 'createdAt'>
): Promise<SourcePoolItem> {
  const config = await getConfig();
  const sourcePool = config.sourcePool || [];

  // 去重检查
  if (isDuplicate(source.api, sourcePool)) {
    throw new Error('源已存在（API 地址重复）');
  }

  const newSource: SourcePoolItem = {
    ...source,
    id: generateId(),
    createdAt: Date.now(),
  };

  sourcePool.push(newSource);
  config.sourcePool = sourcePool;

  await db.saveAdminConfig(config);
  await setCachedConfig(config);

  return newSource;
}

/**
 * 更新源
 */
export async function updateSource(
  id: string,
  updates: Partial<Omit<SourcePoolItem, 'id' | 'createdAt'>>
): Promise<SourcePoolItem> {
  const config = await getConfig();
  const sourcePool = config.sourcePool || [];

  const index = sourcePool.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error('源不存在');
  }

  // 如果更新 API 地址，检查去重
  if (updates.api && updates.api !== sourcePool[index].api) {
    const otherSources = sourcePool.filter((s) => s.id !== id);
    if (isDuplicate(updates.api, otherSources)) {
      throw new Error('API 地址与其他源重复');
    }
  }

  sourcePool[index] = { ...sourcePool[index], ...updates };
  config.sourcePool = sourcePool;

  await db.saveAdminConfig(config);
  await setCachedConfig(config);

  return sourcePool[index];
}

/**
 * 删除源
 */
export async function deleteSource(id: string): Promise<void> {
  const config = await getConfig();
  const sourcePool = config.sourcePool || [];

  const index = sourcePool.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error('源不存在');
  }

  sourcePool.splice(index, 1);
  config.sourcePool = sourcePool;

  await db.saveAdminConfig(config);
  await setCachedConfig(config);
}

/**
 * 根据 ID 获取源
 */
export function getSourceById(id: string, sourcePool: SourcePoolItem[]): SourcePoolItem | null {
  return sourcePool.find((s) => s.id === id) || null;
}

/**
 * 根据测试结果排序源
 * 1. 过滤：enabled=true 且匹配 key 和 type
 * 2. 过滤：有有效 metrics（测试成功）
 * 3. 排序：先按 latency 升序（延迟越低越好）
 * 4. 排序：延迟相同时按 quality 降序（画质越高越好）
 */
export function sortSourcesByMetrics(
  sources: SourcePoolItem[],
  key: string,
  type: 'video' | 'stream'
): SourcePoolItem[] {
  return sources
    .filter((s) => s.enabled && s.type === type && s.keys.includes(key))
    .filter((s) => s.metrics && s.metrics.success)
    .sort((a, b) => {
      const aMetrics = a.metrics!;
      const bMetrics = b.metrics!;

      // 先按延迟排序
      if (aMetrics.latency !== bMetrics.latency) {
        return aMetrics.latency - bMetrics.latency;
      }

      // 延迟相同时按画质排序
      return bMetrics.quality - aMetrics.quality;
    });
}

/**
 * 更新源池子缓存
 */
export async function updateSourcePoolCache(
  key: string,
  type: 'video' | 'stream'
): Promise<void> {
  const config = await getConfig();
  const sourcePool = config.sourcePool || [];

  const sortedSources = sortSourcesByMetrics(sourcePool, key, type);

  const cacheKey = `${key}_${type}`;
  const cache: SourcePoolCache = config.sourcePoolCache || {};

  cache[cacheKey] = {
    sources: sortedSources,
    updatedAt: Date.now(),
  };

  config.sourcePoolCache = cache;

  await db.saveAdminConfig(config);
  await setCachedConfig(config);
}

/**
 * 获取缓存的排序源列表
 */
export function getCachedSources(
  cache: SourcePoolCache | undefined,
  key: string,
  type: 'video' | 'stream',
  num: number
): SourcePoolItem[] | null {
  if (!cache) return null;

  const cacheKey = `${key}_${type}`;
  const cached = cache[cacheKey];

  if (!cached) return null;

  return cached.sources.slice(0, num);
}
