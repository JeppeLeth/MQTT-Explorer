import * as React from 'react'
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon'

/**
 * "01" glyph drawn on the standard 24x24 Material icon grid with the same 2px stroke weight and a
 * footprint matching the neighbouring Code / Reorder icons, so it sizes like any other MUI icon.
 */
export function BinaryIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M6.5 5A3.5 3.5 0 0 0 3 8.5V15.5A3.5 3.5 0 0 0 6.5 19A3.5 3.5 0 0 0 10 15.5V8.5A3.5 3.5 0 0 0 6.5 5ZM6.5 7A1.5 1.5 0 0 1 8 8.5V15.5A1.5 1.5 0 0 1 6.5 17A1.5 1.5 0 0 1 5 15.5V8.5A1.5 1.5 0 0 1 6.5 7ZM16 5H18V17H20.5V19H13.5V17H16V8L14.2 9.4L13 7.9Z"
      />
    </SvgIcon>
  )
}
