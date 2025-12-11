/**
 * 源池子项
 */
export interface SourcePoolItem {
  id: string; // 唯一ID
  name: string; // 源名称
  api: string; // API地址（用于去重）
  type: 'video' | 'stream'; // 视频源或直播源
  keys: string[]; // 分类标签 ['normal', 'anime']
  testKeyword: string; // 测试关键词（如"斗罗大陆"）
  enabled: boolean; // 是否启用
  createdAt: number; // 创建时间
  lastTestTime?: number; // 上次测试时间
  metrics?: {
    latency: number; // 延迟（毫秒）
    quality: number; // 画质分数（0-100）
    success: boolean; // 测试是否成功
    error?: string; // 失败原因
  };
}

/**
 * 缓存结构
 */
export interface SourcePoolCache {
  [key_type: string]: {
    // 如 "normal_video"
    sources: SourcePoolItem[];
    updatedAt: number;
  };
}
