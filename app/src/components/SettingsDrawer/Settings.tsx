import * as React from 'react'
import ChevronRight from '@mui/icons-material/ChevronRight'
import CloudOff from '@mui/icons-material/CloudOff'
import Logout from '@mui/icons-material/Logout'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { shell } from 'electron'
import { Theme } from '@mui/material/styles'
import { withStyles } from '@mui/styles'
import {
  Button,
  Divider,
  Drawer,
  IconButton,
  Input,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
  Tooltip,
} from '@mui/material'
import TimeLocale from './TimeLocale'
import { AppState } from '../../reducers'
import { globalActions, settingsActions, connectionActions } from '../../actions'
import { TopicOrder } from '../../reducers/Settings'
import {
  MAX_MESSAGE_SIZE_OPTIONS,
  MAX_MESSAGE_SIZE_UNLIMITED,
  formatMessageSize,
} from '../../../../events/MessageSizeLimit'
import { isBrowserMode } from '../../utils/browserMode'
import { useAuth } from '../../contexts/AuthContext'

import BrokerStatistics from './BrokerStatistics'
import BooleanSwitch from './BooleanSwitch'

export const autoExpandLimitSet = [
  {
    limit: 0,
    name: 'Collapsed',
  },
  {
    limit: 2,
    name: 'Few',
  },
  {
    limit: 5,
    name: 'Some',
  },
  {
    limit: 15,
    name: 'Most',
  },
  {
    limit: 30,
    name: 'Most',
  },
  {
    limit: 1e6,
    name: 'All',
  },
]

const styles = (theme: Theme) => ({
  drawer: {
    backgroundColor: theme.palette.background.default,
    flexShrink: 0,
    userSelect: 'none' as const,
  },
  paper: {
    width: '300px',
  },
  title: {
    color: theme.palette.text.primary,
    paddingTop: theme.spacing(1),
    ...theme.mixins.toolbar,
  },
  input: {
    minWidth: '150px',
    margin: `auto ${theme.spacing(1)} auto ${theme.spacing(2)}px`,
  },
  author: {
    margin: 'auto 8px 8px auto',
    color: theme.palette.text.secondary,
    cursor: 'pointer' as const,
  },
  mobileButtons: {
    padding: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column' as const,
    gap: theme.spacing(1),
    // Only show on mobile
    [theme.breakpoints.up('md')]: {
      display: 'none' as const,
    },
  },
  mobileButton: {
    justifyContent: 'flex-start',
  },
})

interface Props {
  actions: {
    settings: typeof settingsActions
    global: typeof globalActions
    connection: typeof connectionActions
  }
  autoExpandLimit: number
  classes: any
  highlightTopicUpdates: boolean
  selectTopicWithMouseOver: boolean
  store?: any
  topicOrder: TopicOrder
  visible: boolean
  theme: 'light' | 'dark'
  maxMessageSize: number
}

class Settings extends React.PureComponent<Props, {}> {
  constructor(props: any) {
    super(props)
    this.state = {}
  }

  private openGithubPage = () => {
    shell.openExternal('https://github.com/thomasnordquist')
  }

  private renderHighlightTopicUpdates() {
    const { highlightTopicUpdates, actions } = this.props

    return (
      <BooleanSwitch
        title="Show Activity"
        tooltip="Topics blink when a new message arrives"
        value={highlightTopicUpdates}
        action={actions.settings.toggleHighlightTopicUpdates}
      />
    )
  }

  private selectTopicsOnMouseOver() {
    const { actions, selectTopicWithMouseOver } = this.props
    const toggle = () => actions.settings.selectTopicWithMouseOver(!selectTopicWithMouseOver)

    return (
      <BooleanSwitch
        title="Quick Preview"
        tooltip="Select topics on mouse over"
        value={selectTopicWithMouseOver}
        action={toggle}
      />
    )
  }

  private toggleTheme() {
    const { actions, theme } = this.props

    return (
      <BooleanSwitch
        title="Dark Mode"
        tooltip="Enable dark theme"
        value={theme === 'dark'}
        action={actions.settings.toggleTheme}
        data-testid="dark-mode-toggle"
      />
    )
  }

  private renderAutoExpand() {
    const { classes, autoExpandLimit } = this.props

    const limits = autoExpandLimitSet.map(limit => (
      <MenuItem key={limit.limit} value={limit.limit}>
        {limit.limit < 10000 && limit.limit > 0 ? `≤ ${limit.limit} topics` : limit.name}
      </MenuItem>
    ))
    return (
      <div style={{ padding: '8px', display: 'flex' }}>
        <InputLabel htmlFor="auto-expand" style={{ flex: '1', marginTop: '8px' }}>
          Auto Expand
        </InputLabel>
        <Select
          value={autoExpandLimit}
          onChange={this.onChangeAutoExpand}
          input={<Input name="auto-expand" id="auto-expand-label-placeholder" />}
          name="auto-expand"
          className={classes.input}
          style={{ flex: '1' }}
        >
          {limits}
        </Select>
      </div>
    )
  }

  private onChangeAutoExpand = (e: SelectChangeEvent<number>) => {
    this.props.actions.settings.setAutoExpandLimit(parseInt(String(e.target.value), 10))
  }

  private renderNodeOrder() {
    const { classes, topicOrder } = this.props

    return (
      <div style={{ padding: '8px', display: 'flex' }}>
        <InputLabel htmlFor="auto-expand" style={{ flex: '1', marginTop: '8px' }}>
          Topic Order
        </InputLabel>
        <Select
          value={topicOrder}
          onChange={this.onChangeSorting}
          input={<Input name="node-order" id="node-order-label-placeholder" />}
          displayEmpty
          name="node-order"
          className={classes.input}
          style={{ flex: '1' }}
        >
          <MenuItem value={TopicOrder.none}>
            <em>default</em>
          </MenuItem>
          <MenuItem value={TopicOrder.abc}>a-z</MenuItem>
          <MenuItem value={TopicOrder.messages}>{TopicOrder.messages}</MenuItem>
          <MenuItem value={TopicOrder.topics}>{TopicOrder.topics}</MenuItem>
        </Select>
      </div>
    )
  }

  private onChangeSorting = (e: SelectChangeEvent<TopicOrder>) => {
    this.props.actions.settings.setTopicOrder(e.target.value as TopicOrder)
  }

  private renderMaxMessageSize() {
    const { classes, maxMessageSize } = this.props

    return (
      <Tooltip
        placement="left"
        title="Payloads larger than this are truncated. Larger limits use more memory. Unlimited is reset to the default on restart."
      >
        <div style={{ padding: '8px', display: 'flex' }}>
          <InputLabel htmlFor="max-message-size" style={{ flex: '1', marginTop: '8px' }}>
            Max Message Size
          </InputLabel>
          <Select
            value={maxMessageSize}
            onChange={this.onChangeMaxMessageSize}
            input={<Input name="max-message-size" id="max-message-size" />}
            name="max-message-size"
            className={classes.input}
            style={{ flex: '1' }}
            data-testid="max-message-size-select"
          >
            {MAX_MESSAGE_SIZE_OPTIONS.map(size => (
              <MenuItem key={size} value={size}>
                {size === MAX_MESSAGE_SIZE_UNLIMITED
                  ? `${formatMessageSize(size)} (this session)`
                  : formatMessageSize(size)}
              </MenuItem>
            ))}
          </Select>
        </div>
      </Tooltip>
    )
  }

  private onChangeMaxMessageSize = (e: SelectChangeEvent<number>) => {
    this.props.actions.settings.setMaxMessageSize(Number(e.target.value))
  }

  public render() {
    const { classes, actions, visible } = this.props
    return (
      <Drawer anchor="left" className={classes.drawer} open={visible} variant="persistent">
        <div className={classes.paper} tabIndex={0} role="button">
          <Typography className={classes.title} variant="h6" color="inherit">
            <IconButton onClick={actions.global.toggleSettingsVisibility}>
              <ChevronRight />
            </IconButton>
            Settings
          </Typography>
          <Divider style={{ userSelect: 'none' }} />
        </div>
        <MobileActionButtons classes={classes} actions={actions} />
        <div>
          {this.renderAutoExpand()}
          {this.renderNodeOrder()}
          <TimeLocale />
          {this.renderMaxMessageSize()}
          {this.renderHighlightTopicUpdates()}
          {this.selectTopicsOnMouseOver()}
          {this.toggleTheme()}
        </div>
        <Tooltip placement="top" title="App Author">
          <Typography className={classes.author} onClick={this.openGithubPage}>
            by Thomas Nordquist
          </Typography>
        </Tooltip>
        <BrokerStatistics />
      </Drawer>
    )
  }
}

// Mobile action buttons component (disconnect/logout)
function MobileActionButtons({ classes, actions }: { classes: any; actions: any }) {
  const { authDisabled } = useAuth()

  const handleLogout = async () => {
    // Disconnect first
    actions.connection.disconnect()

    // Clear credentials from sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('mqtt-explorer-username')
      sessionStorage.removeItem('mqtt-explorer-password')
    }

    // Reload page to reset all state and show login dialog
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className={classes.mobileButtons}>
      <Button
        variant="outlined"
        startIcon={<CloudOff />}
        onClick={actions.connection.disconnect}
        className={classes.mobileButton}
        data-testid="mobile-disconnect-button"
      >
        Disconnect
      </Button>
      {isBrowserMode && !authDisabled && (
        <Button
          variant="outlined"
          startIcon={<Logout />}
          onClick={handleLogout}
          className={classes.mobileButton}
          data-testid="mobile-logout-button"
        >
          Logout
        </Button>
      )}
    </div>
  )
}

const mapStateToProps = (state: AppState) => ({
  autoExpandLimit: state.settings.get('autoExpandLimit'),
  topicOrder: state.settings.get('topicOrder'),
  visible: state.globalState.get('settingsVisible'),
  highlightTopicUpdates: state.settings.get('highlightTopicUpdates'),
  selectTopicWithMouseOver: state.settings.get('selectTopicWithMouseOver'),
  theme: state.settings.get('theme'),
  maxMessageSize: state.settings.get('maxMessageSize'),
})

const mapDispatchToProps = (dispatch: any) => ({
  actions: {
    settings: bindActionCreators(settingsActions, dispatch),
    global: bindActionCreators(globalActions, dispatch),
    connection: bindActionCreators(connectionActions, dispatch),
  },
})

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(Settings))
