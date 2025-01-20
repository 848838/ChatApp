const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profileImage: {
        type: String,
  default: '' // Default to an empty string if no profile image is available
        
    },
    hobby: {
        type: String, // You can change this to Array if you want multiple hobbies
    },
    profession: {
        type: String, // Same goes for this field, adjust type as needed
    },
    verificationToken: {
        type: String,
    },
});

const User = mongoose.model("User",userSchema);

module.exports = User;