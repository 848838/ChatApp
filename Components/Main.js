import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
    const fetchUsers = async () => {
        try {
            const token = await AsyncStorage.getItem('authtoken');
            const response = await fetch('http://localhost:5000/users', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            let usersList = data.users;

            // Step 1: Check if there's a recent user and move them to the top
            const recentUserId = await AsyncStorage.getItem('recentUserId');
            if (recentUserId) {
                const recentUserIndex = usersList.findIndex(user => user._id === recentUserId);
                if (recentUserIndex > -1) {
                    const recentUser = usersList[recentUserIndex];
                    // Move the recent user to the top
                    usersList = [recentUser, ...usersList.filter(user => user._id !== recentUserId)];
                    console.log("Recent user moved to top:", recentUser);
                }
            }

            // Step 2: Sort users based on last message timestamp
            usersList.sort((a, b) => {
                const lastMessageA = getLastMessage(a._id);
                const lastMessageB = getLastMessage(b._id);
                return new Date(lastMessageB.timestamp) - new Date(lastMessageA.timestamp); // Sort in descending order
            });

            setUsers(usersList); // Update the state with the sorted list
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };


    // Use effect to fetch users when the component mounts
    useEffect(() => {
        fetchUsers()
    }, []);

    // Fetch current user data
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

    // Fetch messages when selectedUser is set
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
        console.log('Selected User:', user);
        setSelectedUser(user); // Set selectedUser to be used in modal

        // Save the recent user interaction to AsyncStorage
        AsyncStorage.setItem('recentUserId', user._id);

        navigation.navigate('Chatuser', { selectedUser: user });
    };

    // Get last message for each user
    const getLastMessage = (userId) => {
        if (!Array.isArray(messages)) {
            return { message: 'No messages', timestamp: 0 }; // Return a default message and timestamp if no messages
        }

        const userMessages = messages.filter(
            (msg) => msg.receiverId === userId || msg.senderId === userId
        );
        if (userMessages.length === 0) {
            return { message: 'Chat with them', timestamp: 0 }; // No messages for this user
        }

        const lastMessage = userMessages[userMessages.length - 1];
        const timestamp = lastMessage.timestamp ? new Date(lastMessage.timestamp) : new Date();
        return { message: lastMessage.message || 'No message content', timestamp };
    };


    // Open image modal
    const openImageModal = (image, user) => {
        setSelectedImage(image);
        setImageModalVisible(true);
    };

    // Close image modal
    const closeImageModal = () => {
        setImageModalVisible(false);
        setSelectedImage(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={users}
                extraData={users}  // Ensure this triggers re-render when users state changes
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                    const lastMessage = getLastMessage(item._id);
                    return (
                        <TouchableOpacity
                            style={styles.userItem}
                            onPress={() =>
                                handleSelectUser({ id: item._id, name: item.name, profileImage: item.profileImage })
                            }>
                            <View style={{ flexDirection: 'row', backgroundColor: 'white', padding: 20, borderRadius: 10, marginTop: -20 }}>
                                <TouchableOpacity onPress={() => openImageModal(item.profileImage, item)}>
                                    <Image
                                        style={{ width: 40, height: 40, borderRadius: 100 }}
                                        source={{ uri: item.profileImage }}
                                    />
                                </TouchableOpacity>
                                <View style={{ marginLeft: 15 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                                    <Text style={{ color: 'green', padding: 1, width: 240 }}>{lastMessage.message}</Text>
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
    container: { flex: 1, marginTop: -40 },
    userItem: { padding: 10, marginVertical: 5, borderRadius: 5 },
    userName: { fontSize: 16 },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'whitesmoke',
    },
});

export default Main;
