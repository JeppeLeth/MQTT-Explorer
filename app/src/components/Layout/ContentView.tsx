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
/** Height of the chart panel when it opens automatically */
const DEFAULT_CHART_PANEL_HEIGHT_PX = 250

function ContentView(props: Props) {
  // Use different defaults for mobile viewports (<=768px width)
  // Use state for mobile detection that updates on resize
  const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' && window.innerWidth <= 768)
  const [mobileTab, setMobileTab] = React.useState(0) // 0 = topics, 1 = details, 2 = publish, 3 = charts
  // Height of the chart panel below the tree, in px
  const [chartPanelHeight, setChartPanelHeight] = React.useState(0)
  // Width of the sidebar, a percentage string until the user resizes it, then px
  const [sidebarWidth, setSidebarWidth] = React.useState<string | number>('40%')

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
    setSidebarWidth(sizes[1] ?? 0)
  }, [])

  const closeSidebarCompletelyIfItSitsOnTheEdge = React.useCallback((sizes: Array<number>) => {
    if ((sizes[1] ?? 0) < COLLAPSE_THRESHOLD_PX) {
      setSidebarWidth(0)
    }
  }, [])

  const onChartPanelResize = React.useCallback((sizes: Array<number>) => {
    setChartPanelHeight(sizes[1] ?? 0)
  }, [])

  const closeChartPanelCompletelyIfItSitsOnTheEdge = React.useCallback((sizes: Array<number>) => {
    if ((sizes[1] ?? 0) < COLLAPSE_THRESHOLD_PX) {
      setChartPanelHeight(0)
    }
  }, [])

  // Open chart panel on start and when a new chart is added but the panel is closed
  React.useEffect(() => {
    if (props.chartPanelItems.count() === 0) {
      setChartPanelHeight(0)
    } else {
      setChartPanelHeight(current => (current < COLLAPSE_THRESHOLD_PX ? DEFAULT_CHART_PANEL_HEIGHT_PX : current))
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
          <div style={{ ...sidebarContainerStyle, display: mobileTab === 2 ? 'block' : 'none' }}>
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
            <Pane size={chartPanelHeight} style={{ borderTop: '1px solid #999', display: 'flex', overflow: 'hidden' }}>
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
        <Pane size={sidebarWidth} style={{ height: '100%', overflow: 'hidden' }}>
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
