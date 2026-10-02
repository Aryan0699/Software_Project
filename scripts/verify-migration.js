import "dotenv/config"
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { PrismaClient } from "../src/generated/prisma/client.js"

const schemaName = `uras_verify_${randomUUID().replaceAll("-", "")}`
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to verify migrations")
}

const verificationUrl = new URL(databaseUrl)
verificationUrl.searchParams.set("schema", schemaName)

function deployToVerificationSchema() {
    return new Promise((resolve, reject) => {
        const child = spawn(
            "./node_modules/.bin/prisma",
            ["migrate", "deploy"],
            {
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    DATABASE_URL: verificationUrl.toString(),
                },
                stdio: "inherit",
            }
        )

        child.once("error", reject)
        child.once("exit", (code) => {
            if (code === 0) resolve()
            else
                reject(
                    new Error(`Migration verification exited with code ${code}`)
                )
        })
    })
}

const cleanupClient = new PrismaClient()

try {
    await deployToVerificationSchema()
    console.log(
        `Migration verified successfully in disposable schema ${schemaName}`
    )
} finally {
    await cleanupClient.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`
    )
    // The hosted development pool may reuse this PostgreSQL session. Restore
    // its default after removing the disposable schema so later Prisma CLI
    // commands never inherit a search path that no longer exists.
    await cleanupClient.$executeRawUnsafe(`SET search_path TO public`)
    await cleanupClient.$disconnect()
}
