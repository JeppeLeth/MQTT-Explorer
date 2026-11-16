import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow, Rectangle, app, screen } from 'electron'

export interface WindowState {
  bounds: Rectangle
  maximized: boolean
  fullScreen: boolean
}

export const DEFAULT_WINDOW_SIZE = { width: 1024, height: 720 }
export const MINIMUM_WINDOW_SIZE = { width: 360, height: 400 }

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json')
}

/**
 * True if enough of the window would be visible on one of the connected displays to grab it.
 * Saved positions can point to a display that is no longer connected (e.g. an unplugged external monitor).
 */
export function isVisibleOnSomeDisplay(bounds: Rectangle, displays: Array<Rectangle>): boolean {
  const minimumVisible = 100
  return displays.some(area => {
    const overlapX = Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x)
    const overlapY = Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y)
    return overlapX >= minimumVisible && overlapY >= minimumVisible
  })
}

/**
 * The window state of the last session, or undefined if there is none or it would not be visible.
 */
export function loadWindowState(): WindowState | undefined {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile(), 'utf8')) as WindowState
    const { bounds } = state
    if (![bounds?.x, bounds?.y, bounds?.width, bounds?.height].every(n => Number.isFinite(n))) {
      return undefined
    }
    const workAreas = screen.getAllDisplays().map(display => display.workArea)
    if (!isVisibleOnSomeDisplay(bounds, workAreas)) {
      return undefined
    }
    return {
      bounds: {
        ...bounds,
        width: Math.max(bounds.width, MINIMUM_WINDOW_SIZE.width),
        height: Math.max(bounds.height, MINIMUM_WINDOW_SIZE.height),
      },
      maximized: Boolean(state.maximized),
      fullScreen: Boolean(state.fullScreen),
    }
  } catch {
    return undefined
  }
}

function saveWindowState(window: BrowserWindow) {
  if (window.isDestroyed()) {
    return
  }
  const state: WindowState = {
    // The bounds of the window when it is neither maximized nor in full screen
    bounds: window.getNormalBounds(),
    maximized: window.isMaximized(),
    fullScreen: window.isFullScreen(),
  }
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(state))
  } catch (error) {
    console.error('Could not save window state', error)
  }
}

/**
 * Remembers size, position and maximized / full screen state of the window for the next start.
 */
export function trackWindowState(window: BrowserWindow) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const saveSoon = () => {
    timer && clearTimeout(timer)
    timer = setTimeout(() => saveWindowState(window), 500)
  }
  window.on('resize', saveSoon)
  window.on('move', saveSoon)
  window.on('maximize', saveSoon)
  window.on('unmaximize', saveSoon)
  window.on('enter-full-screen', saveSoon)
  window.on('leave-full-screen', saveSoon)
  window.on('close', () => {
    timer && clearTimeout(timer)
    saveWindowState(window)
  })
}
