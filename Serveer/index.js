const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const twilio = require('twilio');
const User = require('./Modals/User');
const { Server } = require('socket.io');  // Importing Socket.IO Server
const http = require('http');
const Message = require('./Modals/Message');
const client = twilio('AC41ade280a24309b9a2b3af230309f1a6', 'ee887d469faae638aad2f25d26b22ec0');

const app = express();
const port = 5000;

const JWT_SECRET = "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jdsds039[]]pou89ywe";

// Create HTTP server using the app
const server = http.createServer(app);

// Attach Socket.IO to the server
const io = new Server(server, {
    cors: {
        origin: "*",  // Allowing all origins, adjust for security in production
        methods: ["GET", "POST"]
    }
});

// Use middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("connected to backend server...");
}).catch((err) => {
    console.log('error found', err);
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Email or password incorrect' });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name, profileImage: user.profileImage },
            JWT_SECRET
        );

        res.status(200).json({ token, user: { id: user._id, email: user.email, name: user.name, profileImage: user.profileImage } });
    } catch (error) {
        return res.status(500).json({ error: "Login failed" });
    }
});

// User data route
app.post('/userdata', async (req, res) => {
    const { token } = req.body;
    try {
        const decodedUser = jwt.verify(token, JWT_SECRET);
        const user = await User.findOne({ email: decodedUser.email });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.send({ status: "ok", data: user });
    } catch (error) {
        console.error("Error verifying token in /userdata:", error.message);
        return res.status(401).json({ error: "Invalid or expired token" });
    }
});


io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('sendMessage', async (messageData) => {
        console.log(`Message received from ${socket.id}:`, messageData);

        const { senderId, senderName, receiverId, message } = messageData;

        try {
            // Fetch the sender's profile details
            const sender = await User.findById(senderId).select('name profileImage');
            if (!sender) {
                console.error('Sender not found in database');
                return;
            }

            // Save the message to the database
            const newMessage = new Message({
                senderId,
                receiverId,
                message,
            });

            await newMessage.save();

            // Broadcast the message, including sender's profile details
            socket.broadcast.emit('message', {
                message: newMessage.message,
                senderName: sender.name, // Use the fetched sender's name
                senderId: sender._id,
                receiverId,
                profileImage: sender.profileImage, // Include the profile image
                timestamp: newMessage.timestamp,
            });

            console.log('Message saved and broadcasted with profile details:', newMessage);
        } catch (error) {
            console.error('Error handling sendMessage event:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Fetch messages between users
// Fetch messages between users
// Fetch messages between users
app.get('/messages', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token
    const { receiverId } = req.query;

    if (!token) {
        return res.status(400).json({ message: 'No token provided' });
    }

    if (!receiverId) {
        return res.status(400).json({ message: 'Receiver ID is required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const senderId = decoded.id;

        // Fetch all messages between the logged-in user and the receiver
        const messages = await Message.find({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        }).sort({ timestamp: 1 }); // Sort by timestamp in ascending order (oldest first)

        // Populate sender information for each message
        const messagesWithProfile = await Promise.all(
            messages.map(async (msg) => {
                const sender = await User.findById(msg.senderId).sort('name, profileImage')
                return {
                    ...msg._doc,
                    senderName: sender?.name || 'unknow',
                    profileImage: sender?.profileImage || 'dd'

                }
            })
        )
        if (!messagesWithProfile || messagesWithProfile.length === 0) {
            return res.status(404).json({ message: 'No messages found' });
        }

        res.status(200).json({ messages: messagesWithProfile });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
});
// On backend (Express) for handling message deletion
app.delete('/messages/:id', async (req, res) => {
    try {
        const message = await Message.findByIdAndDelete(req.params.id);
        if (!message) {
            return res.status(404).json({ status: 'error', message: 'Message not found' });
        }
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ status: 'error', message: 'Failed to delete message' });
    }
});




//fetch other users in server
app.get('/users', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Assuming Bearer token
    if (!token) {
        return res.status(400).json({ message: 'No token provided' });
    }

    try {
        // Decode the JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        const loggedInUserId = decoded.id; // Assuming the JWT contains the user ID in 'id' field

        if (!loggedInUserId) {
            return res.status(400).json({ message: 'User not authenticated' });
        }

        // Fetch all users excluding the logged-in user
        const users = await User.find({ _id: { $ne: loggedInUserId } })
            .select('-password -verificationToken') // Exclude sensitive fields like password and verificationToken
            .exec();

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        res.status(200).json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});
// Start the server
server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
