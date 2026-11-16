import * as builder from 'electron-builder'
import * as fs from 'fs'
import * as path from 'path'
import { execFileSync } from 'child_process'
import { setProperty } from 'dot-prop'

// Only publish to GitHub releases when a token is available (CI). Local builds never publish.
const publish = process.env.GH_TOKEN ? 'always' : 'never'

const linuxAppImage: builder.CliOptions = {
  x64: true,
  ia32: false,
  armv7l: true,
  arm64: true,
  projectDir: './build/clean',
  publish,
}

const linuxSnap: builder.CliOptions = {
  x64: true,
  ia32: false,
  armv7l: false, // not supported to build on x64
  arm64: false, // not supported to build on x64
  projectDir: './build/clean',
  publish,
}

const linuxDeb: builder.CliOptions = {
  x64: true,
  ia32: false,
  armv7l: true,
  arm64: true,
  projectDir: './build/clean',
  publish,
}

const winPortable: builder.CliOptions = {
  x64: true,
  ia32: false,
  armv7l: false,
  arm64: false,
  projectDir: './build/clean',
  publish,
}

const winNsis: builder.CliOptions = {
  x64: true,
  ia32: false,
  armv7l: false,
  arm64: false,
  projectDir: './build/clean',
  publish,
}

const winAppx: builder.CliOptions = {
  x64: true,
  ia32: false,
  armv7l: false,
  arm64: false,
  projectDir: './build/clean',
  publish: process.env.GH_TOKEN ? 'onTag' : 'never',
}

// A single universal (arm64 + x64) DMG, so nobody ends up running the Intel build under Rosetta on Apple Silicon
const mac: builder.CliOptions = {
  universal: true,
  projectDir: './build/clean',
  publish,
}

// Quick native build of the current working tree for this Mac (run `yarn build` first), see Readme
const macLocal: builder.CliOptions = {
  arm64: process.arch === 'arm64',
  x64: process.arch === 'x64',
  projectDir: '.',
  publish: 'never',
}

async function executeBuild() {
  switch (process.argv[2]) {
    case 'win':
      await buildWithOptions(winPortable, { platform: 'win', package: 'portable' })
      await buildWithOptions(winNsis, { platform: 'win', package: 'nsis' })
      break
    case 'appx':
      await buildWithOptions(winAppx, { platform: 'win', package: 'appx' })
      break
    case 'linux':
      await buildWithOptions(linuxAppImage, { platform: 'linux', package: 'AppImage' })
      await buildWithOptions(linuxSnap, { platform: 'linux', package: 'snap' })
      await buildWithOptions(linuxDeb, { platform: 'linux', package: 'deb' })
      break
    case 'mac':
      await buildWithOptions(mac, { platform: 'mac', package: 'dmg' })
      // await buildWithOptions(mac, { platform: 'mac', package: 'mas' })
      // await buildWithOptions(mac, { platform: 'mac', package: 'zip' })
      break
    case 'mac-local':
      await buildWithOptions(macLocal, { platform: 'mac', package: process.argv[3] === 'dmg' ? 'dmg' : 'dir' })
      break
    case 'branch':
      await buildBranchPackages()
      break
    default:
      await buildWithOptions({ ...mac, projectDir: '' }, { platform: 'mac', package: 'mas-dev' })
  }
}

/**
 * Downloadable packages for the platform this runs on, without store packages (snap, appx) and without publishing.
 * Used by .github/workflows/branch-builds.yml, which uploads the files to a GitHub release itself.
 */
async function buildBranchPackages() {
  const never: Partial<builder.CliOptions> = { publish: 'never' }
  if (process.platform === 'darwin') {
    await buildWithOptions({ ...mac, ...never }, { platform: 'mac', package: 'dmg' })
  } else if (process.platform === 'win32') {
    await buildWithOptions({ ...winNsis, ...never }, { platform: 'win', package: 'nsis' })
    await buildWithOptions({ ...winPortable, ...never }, { platform: 'win', package: 'portable' })
  } else {
    await buildWithOptions({ ...linuxAppImage, ...never }, { platform: 'linux', package: 'AppImage' })
    await buildWithOptions({ ...linuxDeb, ...never }, { platform: 'linux', package: 'deb' })
  }
}

export interface BuildInfo {
  platform: 'win' | 'linux' | 'mac'
  package: Packages
}

type Packages = 'portable' | 'nsis' | 'appx' | 'AppImage' | 'snap' | 'dmg' | 'zip' | 'mas' | 'mas-dev' | 'deb' | 'dir'

/**
 * Whether a "Developer ID Application" certificate is available to electron-builder,
 * either via CSC_LINK / CSC_NAME or in the keychain.
 */
function hasDeveloperIdCertificate(): boolean {
  if (process.env.CSC_LINK || process.env.CSC_NAME) {
    return true
  }
  if (process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false') {
    return false
  }
  try {
    const identities = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning']).toString()
    return identities.includes('Developer ID Application')
  } catch {
    return false
  }
}

async function buildWithOptions(options: builder.CliOptions, buildInfo: BuildInfo) {
  const buildOptionsLocation = path.join(options.projectDir!, 'buildOptions.json')
  fs.writeFileSync(buildOptionsLocation, JSON.stringify(buildInfo))

  const jsonLocation = path.join(options.projectDir as string, 'package.json')
  const packageJsonStr = fs.readFileSync(jsonLocation).toString()

  const packageJson = JSON.parse(fs.readFileSync(jsonLocation).toString())

  // Builds that are not versioned (e.g. branch builds) pass their version in, it ends up in the file names and the app
  if (process.env.BUILD_VERSION) {
    setProperty(packageJson, 'version', process.env.BUILD_VERSION)
  }

  // electron-builder resolves hook modules relative to the working directory and rejects paths outside of the
  // project directory (here build/clean), so point the hooks at the copies inside the project directory.
  const projectDir = path.resolve(options.projectDir || '.')
  setProperty(packageJson, 'build.afterPack', path.join(projectDir, 'dist', 'scripts', 'afterPack.js'))
  setProperty(packageJson, 'build.afterSign', path.join(projectDir, 'dist', 'scripts', 'notarize.js'))

  // AppX must have a different name since the store name is already taken (but not used)
  if (buildInfo.package === 'appx') {
    setProperty(packageJson, 'build.productName', 'MQTT-Explorer')
  }

  if (buildInfo.platform === 'mac') {
    console.log(buildInfo.package)
    const isAppStoreBuild = buildInfo.package === 'mas' || buildInfo.package === 'mas-dev'
    if (isAppStoreBuild || hasDeveloperIdCertificate()) {
      const provisioningProfile =
        buildInfo.package === 'mas'
          ? 'res/MQTT_Explorer_Store_Distribution_Profile.provisionprofile'
          : 'res/MQTTExplorerdmg.provisionprofile'
      setProperty(packageJson, 'build.mac.provisioningProfile', provisioningProfile)
    } else {
      // Without a certificate electron-builder would skip signing entirely. Apple Silicon refuses to launch
      // unsigned code (the bundle shows up as "damaged"), so sign ad-hoc instead. Hardened runtime has to be
      // off for ad-hoc builds, otherwise library validation rejects the pre-signed Electron framework.
      console.warn('No "Developer ID Application" certificate found, signing ad-hoc (not notarized)')
      setProperty(packageJson, 'build.mac.identity', '-')
      setProperty(packageJson, 'build.mac.hardenedRuntime', false)
    }

    // Set different entitlements for MAS vs DMG builds
    if (buildInfo.package === 'mas') {
      // MAS builds use the same sandboxed entitlements for parent and child processes
      setProperty(packageJson, 'build.mac.entitlements', 'res/entitlements.mas.plist')
      setProperty(packageJson, 'build.mac.entitlementsInherit', 'res/entitlements.mas.plist')
    } else {
      // DMG builds use different entitlements for notarization
      // Parent app has network permissions, child processes have minimal permissions
      setProperty(packageJson, 'build.mac.entitlements', 'res/entitlements.mac.plist')
      setProperty(packageJson, 'build.mac.entitlementsInherit', 'res/entitlements.mac.inherit.plist')
    }
  }

  try {
    // Write modified package.json
    fs.writeFileSync(jsonLocation, JSON.stringify(packageJson))
    await builder.build({
      ...options,
      [buildInfo.platform]: [buildInfo.package],
    })
  } finally {
    // Roll back changes to package.json
    fs.writeFileSync(jsonLocation, packageJsonStr)
    fs.rmSync(buildOptionsLocation, { force: true })
  }
}

executeBuild().catch(error => {
  console.error(error)
  process.exit(1)
})
