import { addIssueDependencies, type IssueDependencyMap } from './issues.ts'
import { run } from './iteration.ts'

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args[0] === 'issues' && args[1] === 'dependencies' && args[2] === 'add') {
    const raw = args[3]

    if (!raw) {
      console.error(`Usage: matrix issues dependencies add '{"<issue>": [<dep>, ...],...}'`)
      process.exit(1)
    }

    console.log(raw)

    const map: IssueDependencyMap = JSON.parse(raw)

    await addIssueDependencies(map)

    return
  }

  await run()
}

await main()
