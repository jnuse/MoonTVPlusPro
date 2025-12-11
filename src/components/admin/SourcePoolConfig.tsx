'use client';

import { useState, useEffect } from 'react';
import { Play, Trash2, Plus, Download } from 'lucide-react';

import type { SourcePoolItem } from '@/types/source-pool.types';

const buttonStyles = {
  primary: 'px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg',
  success: 'px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg',
  danger: 'px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg',
  dangerSmall: 'px-2 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md',
  successSmall: 'px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md',
};

export default function SourcePoolConfig() {
  const [sources, setSources] = useState<SourcePoolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    api: '',
    type: 'video' as 'video' | 'stream',
    keys: 'normal',
    testKeyword: '斗罗大陆',
  });

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/admin/source-pool');
      const data = await res.json();
      if (res.ok) {
        setSources(data.sources || []);
      }
    } catch (error) {
      console.error('获取源列表失败', error);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/source-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keys: formData.keys.split(',').map((k) => k.trim()),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('添加成功');
        setShowAddForm(false);
        setFormData({ name: '', api: '', type: 'video', keys: 'normal', testKeyword: '斗罗大陆' });
        fetchSources();
      } else {
        setMessage(`错误: ${data.error}`);
      }
    } catch (error) {
      setMessage('添加失败');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除？')) return;
    try {
      const res = await fetch(`/api/admin/source-pool/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('删除成功');
        fetchSources();
      }
    } catch (error) {
      setMessage('删除失败');
    }
  };

  const handleTest = async (id?: string) => {
    setLoading(true);
    setMessage(id ? '测试中...' : '批量测试中...');
    try {
      const res = await fetch('/api/admin/source-pool/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        fetchSources();
      } else {
        setMessage(`错误: ${data.error}`);
      }
    } catch (error) {
      setMessage('测试失败');
    }
    setLoading(false);
  };

  const handleImport = async () => {
    setLoading(true);
    setMessage('导入中...');
    try {
      const res = await fetch('/api/admin/source-pool/import', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(`导入完成: ${data.imported} 个源，跳过 ${data.skipped} 个`);
        fetchSources();
      } else {
        setMessage(`错误: ${data.error}`);
      }
    } catch (error) {
      setMessage('导入失败');
    }
    setLoading(false);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/source-pool/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) {
        fetchSources();
      }
    } catch (error) {
      setMessage('更新失败');
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-lg">
          {message}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setShowAddForm(!showAddForm)} className={buttonStyles.success}>
          <Plus className="inline w-4 h-4 mr-1" />
          添加源
        </button>
        <button onClick={() => handleTest()} disabled={loading} className={buttonStyles.primary}>
          <Play className="inline w-4 h-4 mr-1" />
          全部测试
        </button>
        <button onClick={handleImport} disabled={loading} className={buttonStyles.primary}>
          <Download className="inline w-4 h-4 mr-1" />
          从配置导入
        </button>
      </div>

      {showAddForm && (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="源名称"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 rounded bg-white dark:bg-gray-700"
          />
          <input
            type="text"
            placeholder="API 地址"
            value={formData.api}
            onChange={(e) => setFormData({ ...formData, api: e.target.value })}
            className="w-full p-2 rounded bg-white dark:bg-gray-700"
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="w-full p-2 rounded bg-white dark:bg-gray-700"
          >
            <option value="video">视频源</option>
            <option value="stream">直播源</option>
          </select>
          <input
            type="text"
            placeholder="分类标签（逗号分隔，如: normal,anime）"
            value={formData.keys}
            onChange={(e) => setFormData({ ...formData, keys: e.target.value })}
            className="w-full p-2 rounded bg-white dark:bg-gray-700"
          />
          <input
            type="text"
            placeholder="测试关键词"
            value={formData.testKeyword}
            onChange={(e) => setFormData({ ...formData, testKeyword: e.target.value })}
            className="w-full p-2 rounded bg-white dark:bg-gray-700"
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={loading} className={buttonStyles.success}>
              确认添加
            </button>
            <button onClick={() => setShowAddForm(false)} className={buttonStyles.danger}>
              取消
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="p-2 text-left">名称</th>
              <th className="p-2 text-left">类型</th>
              <th className="p-2 text-left">标签</th>
              <th className="p-2 text-left">状态</th>
              <th className="p-2 text-left">延迟</th>
              <th className="p-2 text-left">画质</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-b dark:border-gray-700">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.type === 'video' ? '视频' : '直播'}</td>
                <td className="p-2">{s.keys.join(', ')}</td>
                <td className="p-2">
                  <button
                    onClick={() => handleToggle(s.id, s.enabled)}
                    className={s.enabled ? buttonStyles.successSmall : buttonStyles.dangerSmall}
                  >
                    {s.enabled ? '启用' : '禁用'}
                  </button>
                </td>
                <td className="p-2">{s.metrics?.latency ? `${s.metrics.latency}ms` : '-'}</td>
                <td className="p-2">{s.metrics?.quality || '-'}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <button onClick={() => handleTest(s.id)} className={buttonStyles.successSmall}>
                      测试
                    </button>
                    <button onClick={() => handleDelete(s.id)} className={buttonStyles.dangerSmall}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
