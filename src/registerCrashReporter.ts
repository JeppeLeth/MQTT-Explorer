import { crashReporter } from 'electron'

/**
 * Crash dumps are kept locally (in the app's Crashpad directory) for troubleshooting, but never uploaded.
 * They used to be sent unencrypted to a third-party telemetry endpoint without asking (#538, #52, #874).
 */
export function registerCrashReporter() {
  crashReporter.start({
    productName: 'MQTT Explorer',
    companyName: 'thomasnordquist',
    uploadToServer: false,
  })
}
