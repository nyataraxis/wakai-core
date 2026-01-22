import { app, BrowserWindow } from 'electron'
import * as path from 'node:path'

const WINDOW_WIDTH = 1280
const WINDOW_HEIGHT = 720
const DEV_SERVER_URL = 'http://localhost:5173'

const createWindow = () => {
  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  const url = process.env.VITE_DEV_SERVER_URL ?? ''
  if (url) {
    win.loadURL(url)
    return
  }

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(DEV_SERVER_URL)
    return
  }

  const indexPath = path.resolve(__dirname, '../../web/dist/index.html')
  win.loadFile(indexPath)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
