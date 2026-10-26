import { consola } from 'consola'
import { addIssueDependencies, type IssueDependencyMap } from './issues.ts'
import { run } from './iteration.ts'

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args[0] === 'issues' && args[1] === 'dependencies' && args[2] === 'add') {
    const raw = args[3]

    if (!raw) {
      consola.error(`Usage: matrix issues dependencies add '{"<issue>": [<dep>, ...],...}'\n`)
      process.exit(1)
    }

    const map: IssueDependencyMap = JSON.parse(raw)

    await addIssueDependencies(map)

    return
  }

  await run()
}

await main()
