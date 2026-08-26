import { execFile, spawn } from "node:child_process"
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { createInterface } from "node:readline/promises"
import { StringDecoder } from "node:string_decoder"
import { promisify } from "node:util"

import { z } from "zod"

import {
  CliRequestError,
  defaultPaperAmigoUrl,
  doctor,
  readCliConfiguration,
  type CliConfiguration,
  type CliEnvironment,
  type StoredCliCredentials,
} from "./client"

const execFileAsync = promisify(execFile)
const keychainService = "app.paper-amigo.cli"
const securityExecutable = "/usr/bin/security"

const credentialMetadataSchema = z.object({
  appUrl: z.url(),
  email: z.email(),
})

type CredentialMetadata = z.infer<typeof credentialMetadataSchema>

function nonEmpty(value: string | undefined): string | undefined {
  const cleaned = value?.trim()

  if (!cleaned) {
    return undefined
  }

  return cleaned
}

function credentialDirectory(environment: CliEnvironment): string {
  return (
    nonEmpty(environment["PAPER_AMIGO_CONFIG_DIR"]) ??
    join(homedir(), ".config", "paper-amigo")
  )
}

function credentialFile(environment: CliEnvironment): string {
  return join(credentialDirectory(environment), "config.json")
}

async function readCredentialMetadata(
  environment: CliEnvironment
): Promise<CredentialMetadata | undefined> {
  try {
    const contents = await readFile(credentialFile(environment), "utf8")
    const parsed = credentialMetadataSchema.safeParse(JSON.parse(contents))

    if (!parsed.success) {
      throw new CliRequestError(
        "Saved login is invalid. Run paper-amigo login again",
        "invalid-saved-login"
      )
    }

    return parsed.data
  } catch (error) {
    if (error instanceof CliRequestError) {
      throw error
    }

    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined
    }

    throw new CliRequestError(
      "Could not read the saved login",
      "saved-login-read-failed"
    )
  }
}

async function readKeychainPassword(email: string): Promise<string> {
  if (process.platform !== "darwin") {
    throw new CliRequestError(
      "Saved login currently requires macOS Keychain",
      "keychain-unavailable"
    )
  }

  try {
    const { stdout } = await execFileAsync(securityExecutable, [
      "find-generic-password",
      "-s",
      keychainService,
      "-a",
      email,
      "-w",
    ])
    const password = stdout.trimEnd()

    if (!password) {
      throw new Error("Empty Keychain password")
    }

    return password
  } catch {
    throw new CliRequestError(
      "Password is missing from Keychain. Run paper-amigo login again",
      "keychain-password-missing"
    )
  }
}

function quoteSecurityValue(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
}

function saveKeychainPassword(email: string, password: string): Promise<void> {
  if (process.platform !== "darwin") {
    throw new CliRequestError(
      "paper-amigo login currently requires macOS Keychain",
      "keychain-unavailable"
    )
  }

  return new Promise((resolve, reject) => {
    const child = spawn(securityExecutable, ["-i"], {
      stdio: ["pipe", "ignore", "ignore"],
    })
    const passwordHex = Buffer.from(password, "utf8").toString("hex")
    const command = [
      "add-generic-password",
      "-U",
      "-s",
      quoteSecurityValue(keychainService),
      "-a",
      quoteSecurityValue(email),
      "-l",
      quoteSecurityValue("Paper Amigo CLI"),
      "-X",
      passwordHex,
    ].join(" ")

    child.once("error", () => {
      reject(
        new CliRequestError(
          "Could not open macOS Keychain",
          "keychain-write-failed"
        )
      )
    })
    child.once("exit", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new CliRequestError(
            "Keychain did not save the password",
            "keychain-write-failed"
          )
        )
      }
    })
    child.stdin.end(`${command}\n`)
  })
}

async function deleteKeychainPassword(email: string): Promise<void> {
  if (process.platform !== "darwin") {
    return
  }

  await execFileAsync(securityExecutable, [
    "delete-generic-password",
    "-s",
    keychainService,
    "-a",
    email,
  ]).catch(() => undefined)
}

async function writeCredentialMetadata(
  environment: CliEnvironment,
  metadata: CredentialMetadata
): Promise<void> {
  const directory = credentialDirectory(environment)
  const file = credentialFile(environment)
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await writeFile(file, `${JSON.stringify(metadata, undefined, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  await chmod(file, 0o600)
}

function hasCompleteEnvironmentLogin(environment: CliEnvironment): boolean {
  return Boolean(
    environment["PAPER_AMIGO_OWNER_EMAIL"]?.trim() &&
    environment["PAPER_AMIGO_OWNER_PASSWORD"]
  )
}

export async function loadCliConfiguration(
  environment: CliEnvironment
): Promise<CliConfiguration> {
  if (hasCompleteEnvironmentLogin(environment)) {
    return readCliConfiguration(environment)
  }

  const metadata = await readCredentialMetadata(environment)

  if (!metadata) {
    return readCliConfiguration(environment)
  }

  const password = await readKeychainPassword(metadata.email)
  const storedCredentials: StoredCliCredentials = { ...metadata, password }

  return readCliConfiguration(environment, storedCredentials)
}

async function promptForEmail(
  defaultEmail: string | undefined
): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new CliRequestError(
      "paper-amigo login needs an interactive terminal",
      "interactive-terminal-required"
    )
  }

  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    const answer = await terminal.question(
      defaultEmail ? `Email [${defaultEmail}]: ` : "Email: "
    )
    const email = answer.trim() || defaultEmail
    const parsed = z.email().safeParse(email)

    if (!parsed.success) {
      throw new CliRequestError("Enter a valid email address", "invalid-email")
    }

    return parsed.data.toLowerCase()
  } finally {
    terminal.close()
  }
}

function promptForPassword(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new CliRequestError(
      "paper-amigo login needs an interactive terminal",
      "interactive-terminal-required"
    )
  }

  const input = process.stdin
  const output = process.stdout
  const decoder = new StringDecoder("utf8")
  const wasPaused = input.isPaused()
  const wasRaw = input.isRaw
  let password = ""
  output.write("Password: ")
  input.setRawMode(true)
  input.resume()

  return new Promise((resolve, reject) => {
    function cleanup(): void {
      input.removeListener("data", onData)
      input.setRawMode(wasRaw)

      if (wasPaused) {
        input.pause()
      }

      output.write("\n")
    }

    function onData(chunk: Buffer): void {
      const characters = decoder.write(chunk)

      for (const character of characters) {
        if (character === "\r" || character === "\n") {
          cleanup()

          if (password.length === 0) {
            reject(
              new CliRequestError("Password cannot be empty", "empty-password")
            )
          } else {
            resolve(password)
          }
          return
        }

        if (character === "\u0003") {
          cleanup()
          reject(new CliRequestError("Login cancelled", "login-cancelled"))
          return
        }

        if (character === "\u007f" || character === "\b") {
          const passwordCharacters = Array.from(password)
          passwordCharacters.pop()
          password = passwordCharacters.join("")
        } else if (character >= " ") {
          password += character
        }
      }
    }

    input.on("data", onData)
  })
}

export async function saveLogin(
  environment: CliEnvironment
): Promise<Readonly<{ email: string; storageConfigured: boolean }>> {
  const previous = await readCredentialMetadata(environment)
  const email = await promptForEmail(previous?.email)
  const password = await promptForPassword()
  const appUrl =
    nonEmpty(environment["PAPER_AMIGO_URL"]) ??
    previous?.appUrl ??
    defaultPaperAmigoUrl

  const configuration = readCliConfiguration({}, { appUrl, email, password })
  const diagnosis = await doctor(configuration)
  await saveKeychainPassword(email, password)
  await writeCredentialMetadata(environment, { appUrl, email })

  if (previous && previous.email !== email) {
    await deleteKeychainPassword(previous.email)
  }

  return { email, storageConfigured: diagnosis.storageConfigured }
}

export async function clearLogin(environment: CliEnvironment): Promise<void> {
  const metadata = await readCredentialMetadata(environment)

  if (metadata) {
    await deleteKeychainPassword(metadata.email)
  }

  try {
    await unlink(credentialFile(environment))
  } catch (error) {
    if (!(
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    )) {
      throw new CliRequestError(
        "Could not remove the saved login",
        "saved-login-delete-failed"
      )
    }
  }
}
