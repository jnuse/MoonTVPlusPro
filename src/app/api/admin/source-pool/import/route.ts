import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { addSource, isDuplicate } from '@/lib/source-pool';
import type { SourcePoolItem } from '@/types/source-pool.types';

export const runtime = 'nodejs';

/**
 * 从现有配置导入源
 * POST /api/admin/source-pool/import
 */
export async function POST(request: NextRequest) {
  // 权限验证
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || authInfo.username !== process.env.USERNAME) {
    return NextResponse.json({ error: '需要站长权限' }, { status: 403 });
  }

  try {
    const config = await getConfig();
    const sourcePool = config.sourcePool || [];

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // 导入视频源
    for (const source of config.SourceConfig) {
      if (source.disabled) continue;

      // 去重检查
      if (isDuplicate(source.api, sourcePool)) {
        skipped++;
        continue;
      }

      try {
        const newSource: Omit<SourcePoolItem, 'id' | 'createdAt'> = {
          name: source.name,
          api: source.api,
          type: 'video',
          keys: ['normal'], // 默认分类
          testKeyword: '斗罗大陆', // 默认测试关键词
          enabled: true,
        };

        await addSource(newSource);
        imported++;
      } catch (error: any) {
        errors.push(`${source.name}: ${error.message}`);
      }
    }

    // 导入直播源
    if (config.LiveConfig) {
      for (const live of config.LiveConfig) {
        if (live.disabled) continue;

        // 去重检查（使用 url 作为 api）
        if (isDuplicate(live.url, sourcePool)) {
          skipped++;
          continue;
        }

        try {
          const newSource: Omit<SourcePoolItem, 'id' | 'createdAt'> = {
            name: live.name,
            api: live.url,
            type: 'stream',
            keys: ['normal'], // 默认分类
            testKeyword: 'CCTV', // 直播源默认测试关键词
            enabled: true,
          };

          await addSource(newSource);
          imported++;
        } catch (error: any) {
          errors.push(`${live.name}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      message: '导入完成',
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}
