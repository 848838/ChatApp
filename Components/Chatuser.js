import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, ActivityIndicator, Modal, Alert } from 'react-native';
import io from 'socket.io-client';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ChatUser = ({ route }) => {
    const { selectedUser } = route.params;
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const flatListRef = useRef(null);
    const navigation = useNavigation();
    let socketRef = useRef(null);

    // Fetch current user details
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = await AsyncStorage.getItem('authtoken');
                if (token) {
                    const response = await fetch('http://localhost:5000/userdata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                    });

                    const data = await response.json();
                    if (data.status === 'ok') {
                        setCurrentUser({ id: data.data._id, name: data.data.name });
                    } else {
                        console.error('Failed to fetch user:', data.message);
                    }
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            }
        };

        fetchCurrentUser();
    }, []);

    // Initialize socket and fetch messages after current user is set
    useEffect(() => {
        if (currentUser && selectedUser) {
            // Initialize socket connection
            socketRef.current = io('http://localhost:5000');

            // Fetch initial messages
            const fetchMessages = async () => {
                try {
                    const token = await AsyncStorage.getItem('authtoken');
                    const response = await fetch(`http://localhost:5000/messages?receiverId=${selectedUser.id}`, {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    const data = await response.json();
                    if (data.messages) {
                        setMessages(
                            data.messages.map((msg) => ({
                                ...msg,
                                senderName: msg.senderName || 'Unknown',
                                profileImage: msg.profileImage || 'defaultProfileImageUrl',
                            }))
                        );
                    }
                } catch (error) {
                    console.error('Error fetching messages:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchMessages();

            // Handle receiving new messages
            socketRef.current.on('message', (data) => {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    {
                        message: data.message,
                        senderName: data.senderName,
                        profileImage: data.profileImage,
                        senderId: data.senderId,
                    },
                ]);
            });

            return () => {
                socketRef.current.disconnect();
            };
        }
    }, [currentUser, selectedUser]);

    // Scroll to latest message
    useEffect(() => {
        if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    // Handle sending messages
    const sendMessage = () => {
        if (message.trim() && currentUser && selectedUser) {
            const messageData = {
                senderId: currentUser.id,
                senderName: currentUser.name,
                receiverId: selectedUser.id,
                receiverName: selectedUser.name,
                message,
                profileImage: 'defaultProfileImageUrl', // Optional: Use a default profile image for the sender
            };

            // Emit the message to the server
            socketRef.current.emit('sendMessage', messageData);

            // Update the messages state locally
            setMessages((prevMessages) => [...prevMessages, messageData]);

            // Clear the input field
            setMessage('');
        }
    };

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View>
                    <Image
                        source={{ uri: selectedUser.profileImage }} // assuming selectedUser.profileImage contains the URL
                        style={{ width: 35, height: 35, borderRadius: 20, marginRight: 10 }}
                    />
                </View>
            ),
            title: selectedUser.name,
        });
    }, [selectedUser]);

    // Set navigation title
    // Scroll to the bottom when messages change
    useEffect(() => {
        if (flatListRef.current) {
            // Add a slight delay to allow the new message to be rendered
            setTimeout(() => {
                flatListRef.current.scrollToEnd({ animated: true });
            }, 100);  // 100ms delay can be adjusted if needed
        }
    }, [messages]);  // Trigger scroll every time the messages state changes

    // Handle long press on a message to show delete option
    const handleLongPress = (message) => {
        setSelectedMessage(message);
        setShowDeleteModal(true);
    };

    // Delete the selected message
    const deleteMessage = async () => {
        if (selectedMessage) {
            try {
                const token = await AsyncStorage.getItem('authtoken');
                const response = await fetch(`http://localhost:5000/messages/${selectedMessage._id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await response.json();
                if (data.status === 'ok') {
                    // Remove the deleted message from the state
                    setMessages((prevMessages) =>
                        prevMessages.filter((msg) => msg._id !== selectedMessage._id)
                    );
                } else {
                    console.error('Failed to delete message:', data.message);
                }
            } catch (error) {
                console.error('Error deleting message:', error);
            }
        }
        setShowDeleteModal(false);
    };

    const renderMessage = ({ item }) => {
        const isCurrentUser = item.senderId === currentUser.id;

        return (
            <TouchableOpacity
                onLongPress={() => handleLongPress(item)}
                style={[
                    styles.messageContainer,
                    isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
                ]}
            >
                {!isCurrentUser && <Image style={styles.profileImage} source={{ uri: item.profileImage }} />}
                <View
                    style={[
                        styles.messageBubble,
                        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
                    ]}
                >
                    <Text style={styles.messageText}>{item.message}</Text>
                    <Text style={{ color: 'white', marginLeft: 'auto', marginTop: 10 }}>
                        {moment(item.timestamp).format('h:mm A')}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={messages}
                ref={flatListRef}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderMessage}
                style={styles.messageList}
            />
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message"
                    value={message}
                    onChangeText={setMessage}
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                    <MaterialCommunityIcons size={30} name="send" />
                </TouchableOpacity>
            </View>

            {/* Delete Message Modal */}
            {showDeleteModal && (
                <Modal
                    transparent={true}
                    animationType="fade"
                    visible={showDeleteModal}
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalText}>Are you sure you want to delete this message?</Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                                    <Text style={styles.cancelButton}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={deleteMessage}>
                                    <Text style={styles.deleteButton}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#f8f8f8', height: '90%' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileImage: { height: 40, width: 40, borderRadius: 20, marginRight: 10 },
    messageList: { flex: 1, marginBottom: 10 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    input: {
        flex: 1,
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginRight: -50,
    },
    sendButton: { padding: 10, borderRadius: 5 },
    sendButtonText: { color: '#fff', fontWeight: 'bold' },
    messageContainer: { flexDirection: 'row', marginVertical: 5, alignItems: 'center' },
    currentUserContainer: { justifyContent: 'flex-end', flexDirection: 'row' },
    otherUserContainer: { justifyContent: 'flex-start', flexDirection: 'row' },
    messageBubble: { padding: 10, borderRadius: 10, maxWidth: '70%' },
    currentUserBubble: { backgroundColor: 'black', alignSelf: 'flex-end' },
    otherUserBubble: { backgroundColor: 'red', alignSelf: 'flex-start' },
    messageText: { fontSize: 16, color: '#fff' },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: 300,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalText: { fontSize: 18, marginBottom: 20 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    cancelButton: { fontSize: 16, color: 'grey' },
    deleteButton: { fontSize: 16, color: 'red' },
});

export default ChatUser;
