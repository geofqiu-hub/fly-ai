import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  saveSetting: (key: string, value: string) => ipcRenderer.invoke('save-setting', key, value),
  createSession: (title?: string) => ipcRenderer.invoke('create-session', title),
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getMessages: (sessionId: string) => ipcRenderer.invoke('get-messages', sessionId),
  saveMessage: (data: any) => ipcRenderer.invoke('save-message', data),
  updateSessionTitle: (data: any) => ipcRenderer.invoke('update-session-title', data),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('delete-session', sessionId),
  saveImage: (data: { base64: string; mimeType: string; sessionId: string }) => ipcRenderer.invoke('save-image', data),
  getImage: (sessionId: string, filename: string) => ipcRenderer.invoke('get-image', sessionId, filename),
})