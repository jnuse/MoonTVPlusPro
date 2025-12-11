import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';
import { getCachedSources } from '@/lib/source-pool';

export const runtime = 'nodejs';

/**
 * 订阅端点（公开）
 * GET /api/subscribe?key=normal&type=video&num=10
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const type = searchParams.get('type') as 'video' | 'stream' | null;
  const numStr = searchParams.get('num');

  // 参数验证
  if (!key || !type) {
    return NextResponse.json({ error: '缺少必需参数 key 或 type' }, { status: 400 });
  }

  if (type !== 'video' && type !== 'stream') {
    return NextResponse.json({ error: 'type 必须是 video 或 stream' }, { status: 400 });
  }

  const num = numStr ? parseInt(numStr, 10) : 10;
  if (isNaN(num) || num < 1 || num > 100) {
    return NextResponse.json({ error: 'num 必须是 1-100 之间的整数' }, { status: 400 });
  }

  try {
    const config = await getConfig();
    const sources = getCachedSources(config.sourcePoolCache, key, type, num);

    if (!sources) {
      return NextResponse.json(
        {
          error: '缓存不存在，请先测试源',
          key,
          type,
        },
        { status: 404 }
      );
    }

    // 构造 api_site 对象
    const apiSite: Record<string, { name: string; api: string; detail: string }> = {};
    sources.forEach((s, index) => {
      const apiKey = `api_${index + 1}`;
      // 从 API URL 提取域名作为 detail
      let detail = '';
      try {
        const url = new URL(s.api);
        detail = `${url.protocol}//${url.host}`;
      } catch {
        detail = s.api;
      }

      apiSite[apiKey] = {
        name: s.name,
        api: s.api,
        detail,
      };
    });

    return NextResponse.json({
      cache_time: await getCacheTime(),
      api_site: apiSite,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}
