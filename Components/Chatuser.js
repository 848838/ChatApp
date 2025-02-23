import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, ActivityIndicator, Modal, Button } from 'react-native';
import io from 'socket.io-client';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'react-native-image-picker';
import EmojiSelector from 'react-native-emoji-selector';

const ChatUser = ({ route }) => {
    const { selectedUser } = route.params;
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [image, setImage] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);


    const [lastOnline, setLastOnline] = useState(null);

    const flatListRef = useRef(null);
    const socketRef = useRef(null);
    const navigation = useNavigation();

    // Fetch current user data
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
                    }
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            }
        };

        fetchCurrentUser();
    }, []);

    // Initialize socket and fetch messages when currentUser and selectedUser are available
    useEffect(() => {
        if (currentUser && selectedUser) {
            socketRef.current = io('http://localhost:5000');

            // Emit the current user's online status
            socketRef.current.emit('userOnline', currentUser.id);  // Emit userOnline event


            // Fetch messages
            const fetchMessages = async () => {
                try {
                    const token = await AsyncStorage.getItem('authtoken');
                    const response = await fetch(`http://localhost:5000/messages?receiverId=${selectedUser.id}`, {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await response.json();
                    if (data.messages) {
                        setMessages(data.messages);
                    }
                } catch (error) {
                    console.error('Error fetching messages:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchMessages();

            socketRef.current.on('message', (data) => {
                setMessages((prevMessages) => [...prevMessages, data]);
            });

            return () => {
                socketRef.current.disconnect(); // Cleanup on unmount
            };
        }
    }, [currentUser, selectedUser]);

    // Update navigation header with last online status
    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: '',
            headerLeft: () => (
                <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Main', { user: selectedUser })}
                        style={{ marginRight: 10 }}
                    >
                        <MaterialIcons name="arrow-back" size={30} color="black" />
                    </TouchableOpacity>
                    <Image style={{ width: 35, height: 35, borderRadius: 40 }} source={{ uri: selectedUser.profileImage }} />
                    <View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('OtherUserprofile', {
                                id: selectedUser.id,
                                name: selectedUser.name,
                                profileImage: selectedUser.profileImage,
                                profession: selectedUser.profession,
                                imageUri: selectedUser.imageUri, // Pass the imageUri as well
                                selectedUser: selectedUser,
                                lastOnline: lastOnline
                            })}
                        >




                            <Text style={{ fontWeight: 'bold', fontSize: 18, marginTop: 1, marginLeft: 10 }}>{selectedUser.name}</Text>
                            <Text style={{ fontSize: 14, color: 'green', marginLeft: 10, marginBottom: 10 }}>
                                {lastOnline ? ` ${'Last online:', lastOnline}` : 'Online'}
                            </Text>

                        </TouchableOpacity>
                    </View>


                </View >
            ),
        });
    }, [selectedUser, lastOnline]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messages.length > 0 && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current.scrollToEnd({ animated: true });
            }, 100); // Delay ensures layout updates
        }
    }, [messages]);

    // Send message with optional image
    const sendMessage = async () => {
        if (!message.trim() && !image) return;

        const formData = new FormData();
        formData.append('senderId', currentUser.id);
        formData.append('receiverId', selectedUser.id);
        formData.append('message', message);

        if (image) {
            formData.append('image', {
                uri: image,
                type: 'image/jpeg',
                name: 'message-image.jpg',
            });
        }

        try {
            const token = await AsyncStorage.getItem('authtoken');
            const response = await fetch('http://localhost:5000/sendMessageWithImage', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();
            if (data.status === 'ok') {
                setMessage('');
                setImage(null);
                


            } else {
                console.error('Failed to send message:', data.message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Open image picker
    const selectImage = async () => {
        const options = { mediaType: 'photo', quality: 1 };
        ImagePicker.launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.errorMessage) {
                console.error('ImagePicker Error:', response.errorMessage);
            } else {
                setImage(response.assets[0].uri);
            }
        });
    };

    // Handle message long press to show delete modal
    const handleLongPress = (message) => {
        setSelectedMessage(message);
        setShowDeleteModal(true);
    };

    // Delete message
    const deleteMessage = async (messageId) => {
        try {
            const token = await AsyncStorage.getItem('authtoken');
            const response = await fetch(`http://localhost:5000/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.status === 'ok') {
                setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== messageId));
                setShowDeleteModal(false);
            } else {
                console.error('Failed to delete message:', data.message);
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            setShowDeleteModal(false);
        }
    };

    // Fetch and update user status last status
    useEffect(() => {
        const fetchUserStatus = async () => {
            try {
                const response = await fetch(`http://localhost:5000/user/${selectedUser.id}`);
                const data = await response.json();
                if (data.lastOnline) {
                    setLastOnline(moment(data.lastOnline).fromNow());
                } else {
                    setLastOnline('Online'); // User is online if lastOnline is null
                }
            } catch (error) {
                console.error('Error fetching user status:', error);
            }
        };

        fetchUserStatus();

        const interval = setInterval(fetchUserStatus, 1000);

    }, [selectedUser]);

    // Render message item
    const renderMessage = ({ item }) => {
        const isCurrentUser = item.senderId === currentUser.id;
        return (
            <View
                style={[
                    styles.messageContainer,
                    isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
                ]}
            >
                {!isCurrentUser && (
                    <Image
                        source={{ uri: item.profileImage || 'default.jpg' }}
                        style={styles.profileImage}
                    />
                )}
                <TouchableOpacity
                    onLongPress={() => handleLongPress(item)}
                    style={[
                        styles.messageBubble,
                        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
                    ]}
                >
                    <View>
                        {item.imageUri && (
                            <Image
                                source={{ uri: item.imageUri }}
                                style={{ height: 200, width: 200 }}
                            />
                        )}

                        {item.message && <Text style={styles.messageText}>{item.message}</Text>}
                    </View>
                    <Text style={{ color: 'black', marginTop: 10, marginBottom: 1 }}>
                        {moment(item.timestamp).format('h:mm A')}
                    </Text>
                </TouchableOpacity>
            </View>
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
            {messages.length === 0 ? (
                <View style={styles.emptyMessageContainer}>
                    <Text style={styles.emptyMessageText}>No chats yet! Start the conversation</Text>
                </View>
            ) : (
                <FlatList
                    data={messages}
                    ref={flatListRef}
                    keyExtractor={(item) => item._id}
                    renderItem={renderMessage}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    style={{ flex: 1 }}
                />
            )}

            {image && (
                <View style={styles.imagePreviewContainer}>
                    <Image
                        source={{ uri: image }}
                        style={styles.imagePreview}
                    />
                    <TouchableOpacity onPress={() => setImage(null)} style={styles.closeButton}>
                        <MaterialCommunityIcons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.inputContainer}>
                {/* Input field */}
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={message}
                    onChangeText={setMessage}
                />


                <TouchableOpacity onPress={selectImage} style={styles.camera}>
                    <MaterialCommunityIcons name="camera" size={24} color="white" />
                </TouchableOpacity>
                {/* Emoji Button */}
                <TouchableOpacity onPress={() => setShowEmojiPicker(!showEmojiPicker)} style={styles.emojiButton}>
                    <MaterialIcons name="emoji-emotions" size={24} color="black" />
                </TouchableOpacity>

                {/* Send Button */}
                <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                    <MaterialCommunityIcons name="send" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Emoji Picker (Shown when toggled) */}
            {showEmojiPicker && (
                <View style={styles.emojiPicker}>
                    <EmojiSelector
                        onEmojiSelected={(emoji) => setMessage((prev) => prev + emoji)} // Append emoji to message
                        showSearchBar={false}
                        columns={8}
                    />
                </View>
            )}


            <Modal
                visible={showDeleteModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Are you sure you want to delete this message?</Text>
                        <View style={{ flexDirection: 'row' }}>
                            <Button
                                title="Delete"
                                color="red"
                                onPress={() => deleteMessage(selectedMessage._id)}
                            />
                            <Button title="Cancel" onPress={() => setShowDeleteModal(false)} />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
    },
    messageList: {
        padding: 10,

    },
    messageContainer: {
        margin: 4,
        flexDirection: 'row',
        marginBottom: 2,
        marginRight: 10,
        marginTop: 10
    },
    currentUserContainer: {
        justifyContent: 'flex-end',

    },
    otherUserContainer: {
        justifyContent: 'flex-start',
    },
    profileImage: {
        width: 35,
        height: 35,
        borderRadius: 20,
        marginRight: 10,
    },
    messageBubble: {
        maxWidth: '70%',
        padding: 10,
        borderRadius: 15,
        marginBottom: 5,


    },
    currentUserBubble: {
        backgroundColor: '#abc8f7',
        color: 'white',
        alignSelf: 'flex-end',
        maxWidth: '70%'

    },
    otherUserBubble: {
        backgroundColor: '#e1e1e1',
        color: 'black',
    },
    messageText: {
        fontSize: 16,
        marginTop: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 25,
        backgroundColor: '#fff',

    },
    input: {
        flex: 1,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        marginTop: -20
    },
    sendButton: {
        marginLeft: 10,
        backgroundColor: '#007bff',
        borderRadius: 20,
        padding: 10,
        marginTop: -20

    },
    camera: {
        marginLeft: 10,
        backgroundColor: '#007bff',
        borderRadius: 20,
        padding: 10,
        marginTop: -20
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    swipeAction: {
        backgroundColor: '#007bff',
        justifyContent: 'center',
        alignItems: 'center',
        width: 75,
    },
    replyPreview: {
        backgroundColor: '#f0f0f0',
        padding: 5,
        borderRadius: 5,
        marginBottom: 5,
    },
    replyPreviewText: {
        color: '#333',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 20,
        color: '#fff',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '60%',
    },
    modalActionText: {
        fontSize: 16,
        color: 'white',
    },
    imagePreviewContainer: {
        position: 'relative',
        marginBottom: 10,
        marginLeft: 10,
    },
    imagePreview: {
        height: 160,
        width: 200,
        borderRadius: 10,
        backgroundColor: '#b2b8c2',
        padding: 4,
    },
    closeButton: {
        position: 'absolute',
        top: 5,
        left: 160,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 5,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: 360,
        alignItems: 'center',
    },
    modalTitle: {
        flexDirection: 'row',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    emptyMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyMessageText: {
        fontSize: 28,
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center'
    },
    emojiButton: {
        marginLeft: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        padding: 10,
        marginTop: -20
    },

    emojiPicker: {
        height: 250,
        backgroundColor: '#fff',
    },

});

export default ChatUser;