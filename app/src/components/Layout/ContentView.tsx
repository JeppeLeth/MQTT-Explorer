import * as React from 'react'
import { SplitPane, Pane } from 'react-split-pane'
import { connect } from 'react-redux'
import { List } from 'immutable'
import ChartPanel from '../ChartPanel'
import Tree from '../Tree'
import { AppState } from '../../reducers'
import { ChartParameters } from '../../reducers/Charts'
import { Sidebar } from '../Sidebar'
import MobileTabs from './MobileTabs'
import PublishTab from '../Sidebar/PublishTab'

interface Props {
  heightProperty: any
  paneDefaults: any
  connectionId?: string
  chartPanelItems: List<ChartParameters>
}

/** Panes dragged smaller than this snap closed */
const COLLAPSE_THRESHOLD_PX = 30
/** The chart panel opens with this height, but never takes more than this share of the window */
const DEFAULT_CHART_PANEL_HEIGHT_PX = 250
const MAX_DEFAULT_CHART_PANEL_SHARE = 0.4
const TITLE_BAR_HEIGHT_PX = 64

/**
 * Pane sizes are kept as a share of the available space (not in px), so that resizing the window scales all panes
 * instead of squeezing the tree and pushing a wide sidebar out of the window.
 */
function shareOf(sizes: Array<number>, index: number): number {
  const total = sizes.reduce((a, b) => a + b, 0)
  return total > 0 ? (sizes[index] ?? 0) / total : 0
}

function toPercent(share: number): string {
  return `${(share * 100).toFixed(3)}%`
}

function defaultChartPanelShare(): number {
  const available = Math.max(window.innerHeight - TITLE_BAR_HEIGHT_PX, 1)
  return Math.min(DEFAULT_CHART_PANEL_HEIGHT_PX / available, MAX_DEFAULT_CHART_PANEL_SHARE)
}

function ContentView(props: Props) {
  // Use different defaults for mobile viewports (<=768px width)
  // Use state for mobile detection that updates on resize
  const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  const [mobileTab, setMobileTab] = React.useState(0) // 0 = topics, 1 = details, 2 = publish, 3 = charts
  // Share of the height used by the chart panel below the tree (0 = closed)
  const [chartPanelShare, setChartPanelShare] = React.useState(0)
  // Share of the width used by the sidebar
  const [sidebarShare, setSidebarShare] = React.useState(0.4)

  // Update mobile state on resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    // Set initial state
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const onSidebarResize = React.useCallback((sizes: Array<number>) => {
    setSidebarShare(shareOf(sizes, 1))
  }, [])

  const closeSidebarCompletelyIfItSitsOnTheEdge = React.useCallback((sizes: Array<number>) => {
    if ((sizes[1] ?? 0) < COLLAPSE_THRESHOLD_PX) {
      setSidebarShare(0)
    }
  }, [])

  const onChartPanelResize = React.useCallback((sizes: Array<number>) => {
    setChartPanelShare(shareOf(sizes, 1))
  }, [])

  const closeChartPanelCompletelyIfItSitsOnTheEdge = React.useCallback((sizes: Array<number>) => {
    if ((sizes[1] ?? 0) < COLLAPSE_THRESHOLD_PX) {
      setChartPanelShare(0)
    }
  }, [])

  // Open chart panel on start and when a new chart is added but the panel is closed
  React.useEffect(() => {
    if (props.chartPanelItems.count() === 0) {
      setChartPanelShare(0)
    } else {
      setChartPanelShare(current => (current === 0 ? defaultChartPanelShare() : current))
    }
  }, [props.chartPanelItems])

  // Hooks must run unconditionally on every render, the mobile-only effects bail out on desktop.
  // Declaring them inside `if (isMobile)` crashed the app ("Rendered more hooks than during the previous render")
  // whenever the window was resized across the 768px breakpoint.

  // Expose tab switching functions for other components to call
  React.useEffect(() => {
    if (!isMobile) {
      return undefined
    }
    const w = window as any
    w.switchToDetailsTab = () => setMobileTab(1)
    w.switchToTopicsTab = () => setMobileTab(0)
    w.switchToPublishTab = () => setMobileTab(2)
    w.switchToChartsTab = () => setMobileTab(3)
    return () => {
      delete w.switchToDetailsTab
      delete w.switchToTopicsTab
      delete w.switchToPublishTab
      delete w.switchToChartsTab
    }
  }, [isMobile])

  // Scroll to selected topic when returning to tree tab
  React.useEffect(() => {
    if (!isMobile || mobileTab !== 0) {
      return undefined
    }
    // Delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      const selectedNode = document.querySelector('.tree .selected')
      if (selectedNode) {
        selectedNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [isMobile, mobileTab])

  // Mobile view with tab switcher
  if (isMobile) {
    const mobileContainerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 64px)', // Full viewport minus titlebar
      width: '100%',
    }

    const tabContentStyle: React.CSSProperties = {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0, // Critical for flex children with overflow
      width: '100%',
      overflow: 'hidden',
      position: 'relative',
    }

    // Tree container needs explicit height for the Tree component's height: 100% to work
    const treeContainerStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
    }

    const sidebarContainerStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      overflow: 'auto',
    }

    return (
      <div style={mobileContainerStyle}>
        <MobileTabs value={mobileTab} onChange={setMobileTab} />
        <div style={tabContentStyle}>
          {/* Topics tab - keep mounted, toggle visibility */}
          <div style={{ ...treeContainerStyle, display: mobileTab === 0 ? 'block' : 'none' }}>
            <Tree />
          </div>
          {/* Details tab - keep mounted, toggle visibility */}
          <div style={{ ...sidebarContainerStyle, display: mobileTab === 1 ? 'block' : 'none' }}>
            <Sidebar connectionId={props.connectionId} />
          </div>
          {/* Publish tab - keep mounted, toggle visibility */}
          <div
            style={{
              ...sidebarContainerStyle,
              padding: '16px', // same as the details tab
              boxSizing: 'border-box',
              display: mobileTab === 2 ? 'block' : 'none',
            }}
          >
            <PublishTab connectionId={props.connectionId} />
          </div>
          {/* Charts tab - keep mounted, toggle visibility */}
          <div style={{ ...sidebarContainerStyle, display: mobileTab === 3 ? 'block' : 'none' }}>
            <ChartPanel />
          </div>
        </div>
      </div>
    )
  }

  // Desktop view with split panes
  return (
    <div className={props.paneDefaults}>
      <SplitPane
        direction="horizontal"
        step={20}
        className={props.heightProperty}
        onResize={onSidebarResize}
        onResizeEnd={closeSidebarCompletelyIfItSitsOnTheEdge}
        dividerSize={2}
        style={{ height: '100%' }}
      >
        <Pane style={{ overflow: 'hidden' }}>
          <SplitPane
            direction="vertical"
            step={10}
            onResize={onChartPanelResize}
            onResizeEnd={closeChartPanelCompletelyIfItSitsOnTheEdge}
            dividerSize={0}
            style={{ height: 'calc(100vh - 64px)' }}
          >
            <Pane style={{ maxHeight: '100%', overflow: 'hidden' }}>
              <Tree />
            </Pane>
            <Pane
              size={toPercent(chartPanelShare)}
              style={{ borderTop: '1px solid #999', display: 'flex', overflow: 'hidden' }}
            >
              {/** Passing height constraints via flex options down */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  height: '100%',
                  width: '100%',
                }}
              >
                <ChartPanel />
              </div>
            </Pane>
          </SplitPane>
        </Pane>
        <Pane size={toPercent(sidebarShare)} style={{ height: '100%', overflow: 'hidden' }}>
          <div
            className={props.paneDefaults}
            style={{
              minWidth: '250px',
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <Sidebar connectionId={props.connectionId} />
          </div>
        </Pane>
      </SplitPane>
    </div>
  )
}

const mapStateToProps = (state: AppState) => ({
  chartPanelItems: state.charts.get('charts'),
})

export default connect(mapStateToProps)(ContentView)
