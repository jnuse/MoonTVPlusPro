import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { addSource } from '@/lib/source-pool';
import type { SourcePoolItem } from '@/types/source-pool.types';

export const runtime = 'nodejs';

/**
 * 获取所有源
 * GET /api/admin/source-pool
 */
export async function GET(request: NextRequest) {
  // 权限验证
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || authInfo.username !== process.env.USERNAME) {
    return NextResponse.json({ error: '需要站长权限' }, { status: 403 });
  }

  try {
    const config = await getConfig();
    const sourcePool = config.sourcePool || [];

    return NextResponse.json({
      sources: sourcePool,
      total: sourcePool.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}

/**
 * 添加源
 * POST /api/admin/source-pool
 */
export async function POST(request: NextRequest) {
  // 权限验证
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || authInfo.username !== process.env.USERNAME) {
    return NextResponse.json({ error: '需要站长权限' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, api, type, keys, testKeyword, enabled } = body;

    // 参数验证
    if (!name || !api || !type || !keys || !testKeyword) {
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 });
    }

    if (type !== 'video' && type !== 'stream') {
      return NextResponse.json({ error: 'type 必须是 video 或 stream' }, { status: 400 });
    }

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: 'keys 必须是非空数组' }, { status: 400 });
    }

    const newSource: Omit<SourcePoolItem, 'id' | 'createdAt'> = {
      name,
      api,
      type,
      keys,
      testKeyword,
      enabled: enabled !== false, // 默认启用
    };

    const source = await addSource(newSource);

    return NextResponse.json({
      message: '添加成功',
      source,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}
