import { autoUpdater } from 'electron-updater'
import { dialog } from 'electron'
import log from 'electron-log'

// Configure logging
autoUpdater.logger = log
// @ts-ignore
autoUpdater.logger.transports.file.level = 'info'

export function setupUpdater() {
  // Check for updates every 2 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify()
  }, 2 * 60 * 60 * 1000)

  // Initial check
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', () => {
    log.info('Update available.')
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded')
    dialog.showMessageBox({
      type: 'info',
      title: '更新可用',
      message: `新版本 ${info.version} 已下载，是否立即安装并重启？`,
      buttons: ['是', '稍后']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater: ' + err)
  })
}
