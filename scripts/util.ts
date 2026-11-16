import { spawn, ChildProcess } from 'child_process'

function quoteArgument(arg: string) {
  return /^[\w@%+=:,./\\-]+$/.test(arg) ? arg : `"${arg}"`
}

/**
 * Runs a command with its output passed through. Fails when the command can not be started or
 * exits with an error code.
 */
export async function exec(cmd: string, args: Array<string> = []) {
  const commandLine = [cmd, ...args].map(quoteArgument).join(' ')
  // On Windows tools like yarn are .cmd scripts, which only start through a shell. Passing the
  // arguments separately with `shell: true` is deprecated (DEP0190), so pass one quoted line.
  const child = process.platform === 'win32' ? spawn(commandLine, { shell: true }) : spawn(cmd, args)
  redirectOutputFor(child)
  await waitFor(child, commandLine)
}

function redirectOutputFor(child: ChildProcess) {
  const printStdout = (data: Buffer) => {
    process.stdout.write(data.toString())
  }
  const printStderr = (data: Buffer) => {
    process.stderr.write(data.toString())
  }
  child.stdout?.on('data', printStdout)
  child.stderr?.on('data', printStderr)

  child.once('close', () => {
    child.stdout?.off('data', printStdout)
    child.stderr?.off('data', printStderr)
  })
}

async function waitFor(child: ChildProcess, commandLine: string) {
  return new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`"${commandLine}" exited with code ${code}`))
      }
    })
  })
}
