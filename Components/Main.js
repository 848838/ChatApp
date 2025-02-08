import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, Modal, TouchableWithoutFeedback, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Entypo from 'react-native-vector-icons/Entypo';
import AntDesign from 'react-native-vector-icons/AntDesign';
import io from 'socket.io-client';
import { Modalize } from 'react-native-modalize';
import { launchImageLibrary } from 'react-native-image-picker';
import { ScrollView } from 'react-native-gesture-handler';

const Main = () => {
    const [users, setUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [stories, setStories] = useState([]);
    const [selectedStory, setSelectedStory] = useState(null);
    const [storyModalVisible, setStoryModalVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [image, setImage] = useState(null);
    const modalizeRef = useRef(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const navigation = useNavigation();
    const socketRef = useRef(null);
    const [message, setMessage] = useState('');
    const [fullScreenImage, setFullScreenImage] = useState(null); // State for full-screen image

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');

        socketRef.current.on('newStory', (newStory) => {
            setStories((prevStories) => [newStory, ...prevStories]);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

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

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');

        socketRef.current.on('newMessage', (newMessage) => {
            setMessages((prevMessages) => [newMessage, ...prevMessages]);
        });

        socketRef.current.on('userStatus', (userStatus) => {
            console.log(userStatus);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    const onOpen = (user) => {
        setSelectedUser(user);
        modalizeRef.current?.open();
    };

    useEffect(() => {
        if (currentUser && selectedUser) {
            socketRef.current = io('http://localhost:5000');

            // Emit the current user's online status
            socketRef.current.emit('userOnline', currentUser.id);

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
                    setIsLoading(false);
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

    const fetchUsers = async () => {
        try {
            setRefreshing(true);
            const token = await AsyncStorage.getItem('authtoken');
            const response = await fetch('http://localhost:5000/users', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('An error occurred while fetching users.');
        } finally {
            setRefreshing(false);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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
                        setCurrentUser({
                            id: data.data._id,
                            name: data.data.name,
                            profileImage: data.data.profileImage,
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching user:', error)
            }
        };

        fetchCurrentUser();
    }, []);

    useEffect(() => {
        const fetchStories = async () => {
            try {
                const token = await AsyncStorage.getItem('authtoken');
                const response = await fetch('http://localhost:5000/stories', {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await response.json();
                if (data.status === 'ok' && Array.isArray(data.stories)) {
                    setStories(data.stories);
                }
            } catch (error) {
                console.error('Error fetching stories:', error);
            }
        };

        fetchStories();
    }, []);

    const openStory = (storyUrl, user) => {
        setFullScreenImage(storyUrl); // Set the selected image for full-screen view
        setSelectedStory(user); // Set the user data for the profile image
        setStoryModalVisible(true); // Open the modal to show the full-screen image
    };


    const getLastMessage = (userId) => {
        if (!Array.isArray(messages) || messages.length === 0) {
            return { message: 'Chat with them', timestamp: 0 };
        }

        const userMessages = messages.filter(
            (msg) =>
                (msg.senderId === userId && msg.receiverId === currentUser?.id) ||
                (msg.receiverId === userId && msg.senderId === currentUser?.id)
        );

        if (userMessages.length === 0) {
            return { message: 'Chat with them', timestamp: 0 };
        }

        const sortedMessages = userMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            message: sortedMessages[0].message || 'No message content',
            timestamp: sortedMessages[0].timestamp || new Date(),
        };
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        AsyncStorage.setItem('recentUserId', user._id);
        navigation.navigate('Chatuser', { selectedUser: user });
    };

    const openImageModal = (profileImage) => {
        setSelectedImage(profileImage);
        setImageModalVisible(true);
    };

    const pickImage = () => {
        launchImageLibrary({ mediaType: 'photo' }, async (response) => {
            if (response.didCancel) return;

            const file = response.assets[0];
            uploadStory(file);
        });
    };

    const uploadStory = async (file) => {
        const formData = new FormData();
        formData.append('userId', currentUser.id);
        formData.append('stories', { uri: file.uri, type: file.type, name: file.fileName || 'story.jpg' });
        try {
            const token = await AsyncStorage.getItem('authtoken');
            const response = await fetch('http://localhost:5000/Stories', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await response.json();
            if (data.status === 'ok') {
                const newStory = { userId: currentUser.id, stories: data.stories };
                socketRef.current.emit('newStory', newStory);
                setStories((prev) => [newStory, ...prev]);
            }
        } catch (error) {
            console.error('Error uploading story:', error);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#00f" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Full-screen image modal */}
            <Modal visible={storyModalVisible} transparent={true} animationType="fade" onRequestClose={() => setStoryModalVisible(false)}>
    <TouchableWithoutFeedback onPress={() => setStoryModalVisible(false)}>
        <View style={styles.modalBackground}>
            {fullScreenImage && selectedStory && (
                <View style={styles.modalContent}>
                    <View style={styles.userInfoContainer}>
                        <Image
                            source={{
                                uri: selectedStory.profileImage || 'https://default-profile-image-url.com',
                            }}
                            style={styles.userProfileImage}
                        />
                        <Text style={styles.userName}>{selectedStory.name || 'No name'}</Text>
                    </View>
                    <Image
                        source={{ uri: fullScreenImage }}
                        style={styles.fullScreenImage}
                    />
                </View>
            )}
        <AntDesign name="close" size={24} color="white" style={{ position: 'absolute', top: 80, right: 20 }} />
        </View>
    </TouchableWithoutFeedback>

</Modal>

            <View style={styles.header}>
                {currentUser?.profileImage ? (
                    <Image source={{ uri: currentUser.profileImage }} style={{width:80, height:80, borderRadius:100, marginLeft:30}} />
                ) : (
                    <Image source={{ uri: 'https://default-profile-image-url.com' }} style={styles.profileImage} />
                )}
                <TouchableOpacity onPress={pickImage}>
                    <AntDesign name="plus" size={18} color="white" style={{ marginRight: 'auto', marginTop: 35, marginLeft: -20, backgroundColor: 'rgba(0, 0, 0, 0.417)', borderRadius: 100, fontWeight: 'bold' ,borderWidth:1,borderColor:'white'}} />
                </TouchableOpacity>

                {/* /stories */}
                <FlatList
                    data={stories}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={{ flexDirection: 'row', marginRight: 10, gap: 10 }}>
                            {item.stories && item.stories.map((storyUrl, index) => (
                                <TouchableOpacity onPress={() => openStory(storyUrl, item)} key={index}>
                                    <Image
                                        source={{ uri: item.profileImage }}
                                        style={styles.storyImage}
                                    />
                                    <Image
                                        source={{ uri: storyUrl }}
                                        style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 100,
                                            position: 'absolute',
                                            bottom: 0,
                                            right: -10,
                                            borderWidth: 2,
                                            borderColor: 'white',
                                            top: 10,
                                        }}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                />

            </View>

            <FlatList
                data={users}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => 
                        handleSelectUser({ id: item._id, name: item.name, profileImage: item.profileImage , profession: item.profession, hobby: item.hobby })

                    }
                    
                    >
                        <View style={styles.userContainer}>
                            <Image source={{ uri: item.profileImage }} style={styles.userImage} />
                            <View style={styles.userInfo}>
                                <Text style={{color:'black',fontWeight:'bold',fontSize:17}}>{item.name}</Text>
                                <Text style={styles.userLastMessage}>{getLastMessage(item._id).message}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchUsers} />}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        marginTop: 30,
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        marginRight: 'auto',
        marginLeft: -20,

    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginLeft: 30,
    },
    storyImage: {
        width: 80,
        height: 80,
        borderRadius: 100,
        borderWidth: 3, // Border width
        borderColor: '#81f542', // White border color (you can change it to any color you prefer)
        overflow: 'hidden', // Ensure the border stays within the circular bounds
    

    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
        backgroundColor: 'white'
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    userImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    userInfo: {
        marginLeft: 10,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userLastMessage: {
        fontSize: 12,
        color: '#777',
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Dark background for better visibility of content
    },
    modalContent: {
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        borderRadius: 15,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    userInfoContainer: {
        position: 'absolute',
        top: 20,
        left: 5,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1,
        marginTop:50
    },
    userProfileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    userName: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain', // Makes sure the image fits within the screen
    },
});

export default Main;

