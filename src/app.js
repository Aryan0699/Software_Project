import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import logger from './utils/logger.js'
import { env } from './utils/env.js'
import authRouter from './routes/auth.route.js'
import testrouter from './routes/test.route.js'
import bookingRouter from './routes/booking.routes.js'
import adminRouter from './routes/admin.routes.js'
import profileRouter from './routes/profile.routes.js'

const app = express()

app.use(cookieParser())

app.use(express.json({
    limit: '16kb' 
}))

app.use(cors(
    {
        origin: env.CORS_ORIGIN || "*",  
        credentials: true
    }
))

app.use(express.urlencoded({
    extended: true,
    limit: '16kb'
}))

app.use(express.static('public'))

app.get('/', (req, res) => {
    logger.info("Health Check");
    res.status(200).json({
        success: true,
        message: 'API is working'
    })
})

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/test", testrouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/profile", profileRouter);

// Global error handler
app.use((err, req, res, next) => {
    logger.error(`Error occurred: ${err.message}`);
    res.status(err.statusCode || 500).json({
        success: err.success || false,
        message: err.message || 'Internal Server Error',
        errors: err.errors || [],
        data: err.data || null,  // includes suggestedAlternatives when room unavailable
    });
});

export default app