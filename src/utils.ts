export function defined<T>(value: T | undefined | null, name: string): T {
  if (value === undefined || value === null) {
    throw new Error(`${name} is not defined`)
  }

  return value
}
