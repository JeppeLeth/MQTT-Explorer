import * as React from 'react'
import Clear from '@mui/icons-material/Clear'
import { IconButton, Theme } from '@mui/material'
import { useTheme } from '@mui/material/styles'

interface Props {
  value?: string
  action: any
  style?: React.CSSProperties
  variant?: 'primary'
}

/**
 * Clear button for text input fields
 */
function ClearAdornment(props: Props) {
  const theme = useTheme()

  if (!props.value) {
    return null
  }

  // The primary variant sits in the app bar, use its text color (primary.contrastText is near-black in dark mode)
  const appBarTextColor =
    theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.primary.contrastText
  const color = props.variant === 'primary' ? appBarTextColor : undefined
  return (
    <IconButton style={{ ...props.style, padding: '1px' }} onClick={props.action}>
      <Clear style={{ color, fontSize: '16px' }} />
    </IconButton>
  )
}

export default ClearAdornment
