import dotenv from "dotenv";
dotenv.config({
    path:"./.env"
})
import app from "./app.js";
import { connectDB } from "./db/index.js";
const PORT = process.env.PORT || 3000

connectDB().then(() => {
    app.on("error", (error) => {
        console.log("Cannot Listen")
        throw error
    })
    app.listen(PORT, () => {
        console.log(`App is listening on port ${PORT}`)
    })
}).catch((err) => {
    console.log("PostgreSQL Connection Failed:", err)
})