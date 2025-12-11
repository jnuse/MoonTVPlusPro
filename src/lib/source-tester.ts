import type { SourcePoolItem } from '@/types/source-pool.types';
import { updateSource } from '@/lib/source-pool';

/**
 * 根据 vod_remarks 计算画质分数
 * 画质评分标准：
 * - 4K/超高清: 100分
 * - 蓝光/BD: 90分
 * - 1080p/全高清: 80分
 * - 720p/高清/HD: 60分
 * - 标清/SD: 40分
 * - 其他/无标签: 20分
 */
export function calculateQualityScore(remarks: string): number {
  if (!remarks) return 20;

  const lowerRemarks = remarks.toLowerCase();

  // 4K/超高清
  if (lowerRemarks.includes('4k') || lowerRemarks.includes('超高清')) {
    return 100;
  }

  // 蓝光/BD
  if (
    lowerRemarks.includes('蓝光') ||
    lowerRemarks.includes('blu-ray') ||
    lowerRemarks.includes('bd')
  ) {
    return 90;
  }

  // 1080p/全高清
  if (
    lowerRemarks.includes('1080') ||
    lowerRemarks.includes('全高清') ||
    lowerRemarks.includes('fhd')
  ) {
    return 80;
  }

  // 720p/高清/HD
  if (
    lowerRemarks.includes('720') ||
    lowerRemarks.includes('高清') ||
    lowerRemarks.includes('hd')
  ) {
    return 60;
  }

  // 标清/SD
  if (lowerRemarks.includes('标清') || lowerRemarks.includes('sd')) {
    return 40;
  }

  return 20;
}

/**
 * 测试单个视频源
 */
export async function testVideoSource(
  source: SourcePoolItem,
  baseUrl: string
): Promise<{ latency: number; quality: number; success: boolean; error?: string }> {
  const startTime = Date.now();

  try {
    // 构造搜索 URL
    const searchUrl = `${baseUrl}/api/search?q=${encodeURIComponent(source.testKeyword)}&site=${source.id}`;

    // 使用 AbortController 实现 30 秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    // 解析结果并计算平均画质分数
    const results = data.results || [];
    if (results.length === 0) {
      return {
        latency,
        quality: 0,
        success: false,
        error: '无搜索结果',
      };
    }

    // 计算平均画质分数（取前 10 个结果）
    const qualityScores = results.slice(0, 10).map((item: any) => {
      const remarks = item.vod_remarks || '';
      return calculateQualityScore(remarks);
    });

    const avgQuality = Math.round(
      qualityScores.reduce((sum: number, score: number) => sum + score, 0) / qualityScores.length
    );

    return {
      latency,
      quality: avgQuality,
      success: true,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;

    if (error.name === 'AbortError') {
      return {
        latency,
        quality: 0,
        success: false,
        error: '测试超时（30秒）',
      };
    }

    return {
      latency,
      quality: 0,
      success: false,
      error: error.message || '测试失败',
    };
  }
}

/**
 * 批量测试源（限流 3 并发）
 */
export async function testMultipleSources(
  sources: SourcePoolItem[],
  baseUrl: string,
  onProgress?: (current: number, total: number, source: SourcePoolItem) => void
): Promise<void> {
  const concurrency = 3;
  let completed = 0;

  // 分批处理
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency);

    await Promise.all(
      batch.map(async (source) => {
        const result = await testVideoSource(source, baseUrl);

        // 更新源的 metrics
        await updateSource(source.id, {
          lastTestTime: Date.now(),
          metrics: result,
        });

        completed++;
        if (onProgress) {
          onProgress(completed, sources.length, source);
        }
      })
    );
  }
}
