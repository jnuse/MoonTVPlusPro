import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getSourceById, updateSourcePoolCache } from '@/lib/source-pool';
import { testVideoSource, testMultipleSources } from '@/lib/source-tester';

export const runtime = 'nodejs';

/**
 * 测试源
 * POST /api/admin/source-pool/test
 * Body: { id?: string, updateCache?: boolean }
 */
export async function POST(request: NextRequest) {
  // 权限验证
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || authInfo.username !== process.env.USERNAME) {
    return NextResponse.json({ error: '需要站长权限' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, updateCache = true } = body;

    // 获取 baseUrl
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    const config = await getConfig();
    const sourcePool = config.sourcePool || [];

    if (id) {
      // 测试单个源
      const source = getSourceById(id, sourcePool);
      if (!source) {
        return NextResponse.json({ error: '源不存在' }, { status: 404 });
      }

      const result = await testVideoSource(source, baseUrl);

      // 更新缓存
      if (updateCache && result.success) {
        for (const key of source.keys) {
          await updateSourcePoolCache(key, source.type);
        }
      }

      return NextResponse.json({
        message: '测试完成',
        source: {
          id: source.id,
          name: source.name,
        },
        result,
      });
    } else {
      // 测试所有启用的源
      const enabledSources = sourcePool.filter((s) => s.enabled);

      if (enabledSources.length === 0) {
        return NextResponse.json({ error: '没有启用的源' }, { status: 400 });
      }

      await testMultipleSources(enabledSources, baseUrl);

      // 更新所有缓存
      if (updateCache) {
        const uniqueKeyTypes = new Set<string>();
        enabledSources.forEach((s) => {
          s.keys.forEach((key) => {
            uniqueKeyTypes.add(`${key}_${s.type}`);
          });
        });

        for (const keyType of Array.from(uniqueKeyTypes)) {
          const [key, type] = keyType.split('_');
          await updateSourcePoolCache(key, type as 'video' | 'stream');
        }
      }

      return NextResponse.json({
        message: '批量测试完成',
        total: enabledSources.length,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}
