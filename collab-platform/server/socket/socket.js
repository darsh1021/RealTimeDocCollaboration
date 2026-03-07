const { Server } = require('socket.io');
const Document = require('../models/Document');

// In-memory store for active users
// Structure: { [documentId]: [{ socketId, username, color }] }
const activeUsers = {};

const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join document room with identity
        socket.on('join-document', ({ documentId, username, color }) => {
            socket.join(documentId);

            // Add user to active users list
            if (!activeUsers[documentId]) {
                activeUsers[documentId] = [];
            }

            // Avoid duplicate entries for the same socket
            activeUsers[documentId] = activeUsers[documentId].filter(u => u.socketId !== socket.id);
            activeUsers[documentId].push({ socketId: socket.id, username, color });

            console.log(`User ${username} joined document: ${documentId}`);

            // Broadcast updated users list to the room
            io.to(documentId).emit('users-update', activeUsers[documentId]);

            // Confirm to joining client
            socket.emit('document-joined', documentId);
        });

        // Handle real-time changes
        socket.on('send-changes', ({ documentId, content }) => {
            socket.to(documentId).emit('receive-changes', content);
        });

        // Handle cursor movement
        socket.on('cursor-move', ({ documentId, x, y }) => {
            socket.to(documentId).emit('cursor-update', {
                socketId: socket.id,
                x,
                y
            });
        });

        // Handle typing indicator
        socket.on('typing', ({ documentId, username }) => {
            socket.to(documentId).emit('user-typing', username);
        });

        socket.on('stop-typing', ({ documentId }) => {
            socket.to(documentId).emit('user-stop-typing');
        });

        // Handle auto-save — also creates a version snapshot with attribution
        socket.on('save-document', async ({ documentId, content, userId, userName }) => {
            try {
                const doc = await Document.findById(documentId);
                if (!doc) return;

                const { createVersion } = require('../controllers/documentController');
                await createVersion(documentId, content, userId, userName || 'Unknown', 'edit');

                doc.content = content;
                await doc.save();
            } catch (error) {
                console.error(`Error saving document ${documentId}:`, error.message);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);

            // Remove user from all rooms they were in
            for (const documentId in activeUsers) {
                const initialCount = activeUsers[documentId].length;
                activeUsers[documentId] = activeUsers[documentId].filter(u => u.socketId !== socket.id);

                if (activeUsers[documentId].length !== initialCount) {
                    // Broadcast updated list to remaining users
                    io.to(documentId).emit('users-update', activeUsers[documentId]);

                    // Clean up empty rooms
                    if (activeUsers[documentId].length === 0) {
                        delete activeUsers[documentId];
                    }
                }
            }
        });
    });

    return io;
};

module.exports = initSocket;
