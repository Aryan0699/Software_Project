import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
const app = express()

app.use(express.json()) // req for req.body
app.use(cors(
    {
        origin: "*",
        credentials: true //allow cookies to be sent in cross-origin requests
    }
))

app.use(express.urlencoded({
    extended: true // allow parsing of nested objects in URL-encoded data
}))

app.use(express.static('public')) // Serve static files from the 'public' directory
app.use(cookieParser()) // Parse cookies from incoming requests

app.get('/', (req, res) => {
    res.send('Hello World!')
})

export default app