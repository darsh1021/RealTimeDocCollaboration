require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const initSocket = require('./socket/socket');

const app = express();
const server = http.createServer(app);

// Connect to Database
connectDB();

// Middleware
const allowedOrigins = [
    "http://localhost:5173",
    "https://real-time-doc-collaboration-wp6vly2s4-darshas-projects-feb79bd7.vercel.app"
];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);
app.use(express.json());

// Socket.IO
const io = initSocket(server);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/health', require('./routes/health'));
app.use('/api/documents', require('./routes/documentRoutes'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
