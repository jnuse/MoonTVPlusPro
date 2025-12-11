import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { updateSource, deleteSource } from '@/lib/source-pool';

export const runtime = 'nodejs';

/**
 * 更新源
 * PUT /api/admin/source-pool/[id]
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // 权限验证
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || authInfo.username !== process.env.USERNAME) {
    return NextResponse.json({ error: '需要站长权限' }, { status: 403 });
  }

  try {
    const { id } = params;
    const body = await request.json();

    // 允许更新的字段
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.api !== undefined) updates.api = body.api;
    if (body.type !== undefined) updates.type = body.type;
    if (body.keys !== undefined) updates.keys = body.keys;
    if (body.testKeyword !== undefined) updates.testKeyword = body.testKeyword;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.metrics !== undefined) updates.metrics = body.metrics;
    if (body.lastTestTime !== undefined) updates.lastTestTime = body.lastTestTime;

    const source = await updateSource(id, updates);

    return NextResponse.json({
      message: '更新成功',
      source,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}

/**
 * 删除源
 * DELETE /api/admin/source-pool/[id]
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // 权限验证
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || authInfo.username !== process.env.USERNAME) {
    return NextResponse.json({ error: '需要站长权限' }, { status: 403 });
  }

  try {
    const { id } = params;
    await deleteSource(id);

    return NextResponse.json({
      message: '删除成功',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 });
  }
}
