import { execFileSync } from 'child_process'
import { readdirSync } from 'fs'
import path from 'path'

describe('published package contents', () => {
  it('includes every compiled file that dist/threshold-control.js depends on', () => {
    const root = path.join(__dirname, '..', '..')
    const distDir = path.join(root, 'dist')
    const distJsFiles = readdirSync(distDir).filter(f => f.endsWith('.js'))
    expect(distJsFiles.length).toBeGreaterThan(0)

    const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: root,
      encoding: 'utf8'
    })
    const [{ files }] = JSON.parse(output) as Array<{ files: Array<{ path: string }> }>
    const packedPaths = files.map(f => f.path)

    for (const file of distJsFiles) {
      expect(packedPaths).toContain(`dist/${file}`)
    }
  })
})
