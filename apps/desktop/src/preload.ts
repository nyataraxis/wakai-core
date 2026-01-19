import { contextBridge } from 'electron'

const api = {
  platform: 'desktop'
}

contextBridge.exposeInMainWorld('kanjiAlchemy', api)
