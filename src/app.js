import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import {pinoHttp} from 'pino-http'
import logger from './utils/logger.js'
import { env } from './utils/env.js'
import authRouter from './routes/auth.route.js'
import testrouter from './routes/test.route.js'
const app = express()

// app.use(pinoHttp(
//     {logger}
// )) // Add pino-http middleware for logging HTTP requests and responses

app.use(express.json({
    limit: '16kb' 
})) // req for req.body


app.use(cors(
    {
        origin: env.CORS_ORIGIN || "*",  
        credentials: true //allow cookies to be sent in cross-origin requests
    }
))

app.use(express.urlencoded({
    extended: true, // allow parsing of nested objects in URL-encoded data
    limit: '16kb'
}))

app.use(express.static('public')) // Serve static files from the 'public' directory
app.use(cookieParser()) // Parse cookies from incoming requests

app.get('/', (req, res) => {
    logger.info("Health Check");
    res.status(200).json({
        success: true,
        message: 'API is working'
    })
})

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/test", testrouter);

app.use((err, req, res, next) => {
    // Log detailed error information for monitoring/debugging
    logger.error(`Error occurred:${err.message}`);
    res.status(err.statusCode || 500).json({
        success: err.success || false,
        message: err.message || 'Internal Server Error',
        errors: err.errors || []
    });
});

export default app