import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export class ChatStorage {
  private static getBaseDir() {
    return path.join(app.getPath('userData'), 'storage', 'chats');
  }

  static getSessionDir(sessionId: string) {
    return path.join(this.getBaseDir(), sessionId);
  }

  /**
   * 将 Base64 保存到 Session 关联的目录
   */
  static async saveBase64File(sessionId: string, base64Data: string, mimeType: string): Promise<string> {
    const sessionDir = this.getSessionDir(sessionId);
    
    // 确保目录存在
    await fs.mkdir(sessionDir, { recursive: true });

    const extension = mimeType.split('/')[1]?.split(';')[0] || 'png';
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(sessionDir, fileName);

    // 去掉 Base64 头部（如果存在）
    const pureBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(pureBase64, 'base64');
    
    await fs.writeFile(filePath, buffer);

    // 返回自定义协议路径: chat-file://sessionId/fileName
    return `chat-file://${sessionId}/${fileName}`;
  }

  /**
   * 删除整个会话的文件夹
   */
  static async deleteSessionStorage(sessionId: string): Promise<void> {
    const sessionDir = this.getSessionDir(sessionId);
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`[ChatStorage] Failed to delete storage for session ${sessionId}:`, error);
    }
  }
}
