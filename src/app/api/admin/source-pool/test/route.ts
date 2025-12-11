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
      // 测试所有启用的源 - 使用流式响应
      const enabledSources = sourcePool.filter((s) => s.enabled);

      if (enabledSources.length === 0) {
        return NextResponse.json({ error: '没有启用的源' }, { status: 400 });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let completed = 0;
          const total = enabledSources.length;

          for (const source of enabledSources) {
            const result = await testVideoSource(source, baseUrl);
            completed++;

            const progress = {
              current: completed,
              total,
              source: { id: source.id, name: source.name },
              result,
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));

            // 更新缓存
            if (updateCache && result.success) {
              for (const key of source.keys) {
                await updateSourcePoolCache(key, source.type);
              }
            }
          }

          controller.enqueue(encoder.encode('data: {"done":true}\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}
