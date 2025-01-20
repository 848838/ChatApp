import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import Entypo from 'react-native-vector-icons/Entypo';

const Main = () => {
    const [users, setUsers] = useState([]); // All available users
    const [messages, setMessages] = useState([]); // All messages from the socket
    const [currentUser, setCurrentUser] = useState(null); // Current logged-in user
    const [selectedUser, setSelectedUser] = useState(null); // The recipient
    const [imageModalVisible, setImageModalVisible] = useState(false); // For showing image modal
    const [selectedImage, setSelectedImage] = useState(null); // For the selected image
    const navigation = useNavigation();
    const socketRef = useRef(null);

    // Fetch all users to display
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = await AsyncStorage.getItem('authtoken');
                const response = await fetch('http://localhost:5000/users', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await response.json();
                setUsers(data.users); // Store the list of users
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    // Fetch current user
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = await AsyncStorage.getItem('authtoken');
                const response = await fetch('http://localhost:5000/userdata', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();
                if (data.status === 'ok') {
                    setCurrentUser({ id: data.data._id, name: data.data.name });
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, []);

    // Initialize socket and listen for incoming messages
    useEffect(() => {
        if (currentUser) {
            socketRef.current = io('http://localhost:5000');

            socketRef.current.on('message', (data) => {
                setMessages((prevMessages) => {
                    const newMessages = [
                        ...prevMessages,
                        {
                            message: data.message,
                            senderName: data.senderName,
                            profileImage: data.profileImage,
                            senderId: data.senderId,
                            receiverId: data.receiverId,
                        },
                    ];

                    // Save new messages to AsyncStorage
                    AsyncStorage.setItem('messages', JSON.stringify(newMessages));
                    return newMessages;
                });
            });

            return () => {
                socketRef.current.disconnect();
            };
        }
    }, [currentUser]);

    // Fetch messages when the selected user is set
    useEffect(() => {
        const fetchMessagesFromStorage = async () => {
            try {
                const savedMessages = await AsyncStorage.getItem('messages');
                if (savedMessages) {
                    setMessages(JSON.parse(savedMessages)); // Restore messages from storage
                }
            } catch (error) {
                console.error('Error fetching messages from storage:', error);
            }
        };

        fetchMessagesFromStorage();
    }, []);

    // Fetch messages from the server when a user is selected
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const token = await AsyncStorage.getItem('authtoken');
                const response = await fetch(`http://localhost:5000/messages?receiverId=${selectedUser.id}`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await response.json();
                if (data.messages) {
                    setMessages(data.messages); // Update the state with fetched messages
                    // Optionally, save the fetched messages to AsyncStorage
                    AsyncStorage.setItem('messages', JSON.stringify(data.messages));
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        if (selectedUser) {
            fetchMessages();
        }
    }, [selectedUser]);

    // Handle selecting a user to chat with
    const handleSelectUser = (user) => {
        setSelectedUser(user); // Set selectedUser to be used in modal
        navigation.navigate('Chatuser', { selectedUser: user });
    };

    // Get last message for each user
   // Get last message for each user
const getLastMessage = (userId) => {
    if (!Array.isArray(messages)) {
        return 'No messages'; // Return a default message if messages is not an array
    }

    const userMessages = messages.filter(
        (msg) => msg.receiverId === userId || msg.senderId === userId
    );
    const lastMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
    return lastMessage ? lastMessage.message : 'Chat with him';
};
const getLatetMessage = (userId) => {
    if (!Array.isArray(messages)) {
        return 'No messages'; // Return a default message if messages is not an array
    }

    const userMessages = messages.filter(
        (msg) => msg.receiverId === userId 
    );
    const lastestMessage = userMessages.length > 0 ? userMessages[userMessages.length - messages] : null;
};


    // Open image modal
    const openImageModal = (imageUrl, user) => {
        setSelectedImage(imageUrl);
        setSelectedUser(user); // Set selectedUser for modal use
        setImageModalVisible(true);
    };

    // Close image modal
    const closeImageModal = () => {
        setImageModalVisible(false);
        setSelectedImage(null);
        setSelectedUser(null); // Reset selectedUser when modal is closed
    };

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                    const lastMessage = getLastMessage(item._id);
                    const lastnewMessage = getLatetMessage(item._id);
                    return (
                        <TouchableOpacity
                            style={styles.userItem}
                            onPress={() =>
                                handleSelectUser({ id: item._id, name: item.name, profileImage: item.profileImage })
                            }>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity onPress={() => openImageModal(item.profileImage, item)}>
                                    <Image
                                        style={{ width: 40, height: 40, borderRadius: 100 }}
                                        source={{ uri: item.profileImage }}
                                    />
                                </TouchableOpacity>
                                <View style={{ marginLeft: 15 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                                    <Text style={{ color: 'green', padding:1, width:240 }}>{lastMessage}</Text>
                                </View>
                                <View style={{ marginLeft: 'auto' }}>
                                    <Entypo style={{ marginTop: 6 }} size={20} name='dots-three-vertical' />
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Modal for displaying the selected image */}
            <Modal
                visible={imageModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeImageModal}
            >
                <TouchableWithoutFeedback onPress={closeImageModal}>
                    <View style={styles.modalBackground}>
                        <Image style={{ width: 250, height: 250, borderRadius: 200 }} source={{ uri: selectedImage }} />
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, marginTop: -50 },
    userItem: { padding: 10, marginVertical: 5, borderRadius: 5 },
    userName: { fontSize: 16 },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.505)', // Add semi-transparent black background
    },
    fullScreenImage: {
        width: '80%', // Adjust the width as needed
        height: '80%', // Adjust the height as needed
        resizeMode: 'contain',
    },
});

export default Main;
