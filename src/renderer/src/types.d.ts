export interface IElectronAPI {
  getSetting: (key: string) => Promise<string | null>
  saveSetting: (key: string, value: string) => Promise<void>
  createSession: (title?: string) => Promise<string>
  getSessions: () => Promise<any[]>
  getMessages: (sessionId: string) => Promise<any[]>
  saveMessage: (data: {
    sessionId: string;
    role: string;
    content: string;
    type?: string;
    attachments?: any[]
  }) => Promise<string>
  updateSessionTitle: (data: { sessionId: string; title: string }) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  saveImage: (data: { base64: string; mimeType: string; sessionId: string }) => Promise<string>
  getImage: (sessionId: string, filename: string) => Promise<string | null>
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}