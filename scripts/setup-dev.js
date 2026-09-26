import { spawn } from "node:child_process"
import { copyFileSync, existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const frontendRoot = join(projectRoot, "frontend")
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"

function ensureEnvironmentFile(target, example) {
    if (existsSync(target)) return false
    copyFileSync(example, target)
    console.log(`Created ${target.replace(`${projectRoot}/`, "")} from its example`)
    return true
}

function readEnvironmentValue(contents, key) {
    const line = contents
        .split(/\r?\n/)
        .find((entry) => new RegExp(`^\\s*${key}\\s*=`).test(entry))
    if (!line) return null

    const value = line.slice(line.indexOf("=") + 1).trim()
    if (value === "" || value === '""' || value === "''") return null
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1)
    }
    return value
}

const backendEnvCreated = ensureEnvironmentFile(
    join(projectRoot, ".env"),
    join(projectRoot, ".env.sample")
)
ensureEnvironmentFile(
    join(frontendRoot, ".env"),
    join(frontendRoot, ".env.example")
)

if (backendEnvCreated) {
    console.log(
        "\n[setup] IMPORTANT: Created new .env file. Please check DATABASE_URL and BOOTSTRAP_ADMIN_* credentials in .env before proceeding.\n"
    )
}

const backendEnv = readFileSync(join(projectRoot, ".env"), "utf8")
const configuredDatabaseUrl = readEnvironmentValue(backendEnv, "DATABASE_URL")
if (!configuredDatabaseUrl) {
    throw new Error(".env must contain a non-empty DATABASE_URL")
}

const databaseUrl = new URL(configuredDatabaseUrl)
if (
    ["postgres:", "postgresql:"].includes(databaseUrl.protocol) &&
    !databaseUrl.searchParams.has("schema")
) {
    databaseUrl.searchParams.set("schema", "public")
}

const commandEnvironment = {
    ...process.env,
    npm_config_cache: join(projectRoot, ".npm"),
    DATABASE_URL: databaseUrl.toString(),
}

async function run(
    label,
    args,
    cwd = projectRoot,
    attempts = 1,
    environment = commandEnvironment
) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        console.log(
            `\n[setup] ${label}${attempts > 1 ? ` (attempt ${attempt}/${attempts})` : ""}`
        )
        const status = await new Promise((resolve, reject) => {
            const child = spawn(npmCommand, args, {
                cwd,
                env: environment,
                stdio: "inherit",
            })
            child.once("error", reject)
            child.once("exit", resolve)
        })
        if (status === 0) return
        if (attempt === attempts) {
            throw new Error(`${label} failed with exit code ${status}`)
        }
        console.warn(`[setup] ${label} failed; retrying in 2 seconds`)
        await new Promise((resolve) => setTimeout(resolve, 2_000))
    }
}

async function waitForUrl(url, label, processToWatch, timeoutMs = 45_000) {
    const deadline = Date.now() + timeoutMs
    let lastError = "No response"

    while (Date.now() < deadline) {
        if (processToWatch.exitCode !== null) {
            throw new Error(`${label} stopped with exit code ${processToWatch.exitCode}`)
        }

        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(2_000),
            })
            if (response.ok) return
            lastError = `HTTP ${response.status}`
        } catch (error) {
            lastError = error.message
        }

        await new Promise((resolve) => setTimeout(resolve, 750))
    }

    throw new Error(`${label} did not become ready: ${lastError}`)
}

function startDevelopmentServer(label, cwd) {
    console.log(`[setup] Starting ${label}`)
    return spawn(npmCommand, ["run", "dev"], {
        cwd,
        env: commandEnvironment,
        stdio: "inherit",
    })
}

if (!readEnvironmentValue(backendEnv, "BOOTSTRAP_ADMIN_EMAIL")) {
    console.warn(
        "[setup] BOOTSTRAP_ADMIN_* is empty. Reference data will be seeded, but no administrator account will be created."
    )
}

// 1. Dependency installation using npm install for dev resilience
await run("Installing backend dependencies", ["install"])
await run("Installing frontend dependencies", ["install"], frontendRoot)

// 2. Database migration & generation
await run(
    "Applying committed database migrations",
    ["run", "prisma:deploy"],
    projectRoot,
    3
)
await run("Generating the Prisma client", ["run", "prisma:generate"])
await run("Seeding reference data", ["run", "seed"], projectRoot, 3)

// 3. Start development servers
const backend = startDevelopmentServer("backend", projectRoot)
const frontend = startDevelopmentServer("frontend", frontendRoot)
let stopping = false

function stop(exitCode = 0) {
    if (stopping) return
    stopping = true
    if (backend && backend.exitCode === null) backend.kill("SIGTERM")
    if (frontend && frontend.exitCode === null) frontend.kill("SIGTERM")
    setTimeout(() => process.exit(exitCode), 200)
}

process.on("SIGINT", () => stop(0))
process.on("SIGTERM", () => stop(0))

try {
    await waitForUrl(
        "http://localhost:3000/api/v1/health/ready",
        "Backend and database",
        backend
    )
    console.log("[setup] Backend is ready and the database connection is healthy")

    await waitForUrl("http://localhost:5173", "Frontend", frontend)
    console.log("[setup] Frontend is ready at http://localhost:5173")
    console.log("[setup] Press Ctrl+C to stop both development servers")

    await Promise.race([
        new Promise((resolve) => backend.once("exit", resolve)),
        new Promise((resolve) => frontend.once("exit", resolve)),
    ])
    if (!stopping) {
        console.error("[setup] A development server stopped unexpectedly")
        stop(1)
    }
} catch (error) {
    console.error(`[setup] ${error.message}`)
    stop(1)
}