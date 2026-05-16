import fs from "fs"
import path from "path"

const CONFIG_FILE = path.join(process.cwd(), ".app-config.json")

function readStore(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"))
  } catch {
    return {}
  }
}

function writeStore(data: Record<string, string>): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2))
}

export function getConfigValue(key: string): string | null {
  return readStore()[key] ?? null
}

export function setConfigValue(key: string, value: string): void {
  const data = readStore()
  data[key] = value
  writeStore(data)
}

export function deleteConfigValue(key: string): void {
  const data = readStore()
  delete data[key]
  writeStore(data)
}

export function getConfigsWithPrefix(prefix: string): Record<string, string> {
  const data = readStore()
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => k.startsWith(prefix))
  )
}
