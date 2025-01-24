import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Entypo from 'react-native-vector-icons/Entypo'
import AntDesign from 'react-native-vector-icons/AntDesign'
import Ionicons from 'react-native-vector-icons/Ionicons'
const Profile = () => {
    const [userData, setUserData] = useState(null);
    const [editing, setEditing] = useState(false);
    const [updatedData, setUpdatedData] = useState({ name: '', profession: '', profileImage: null });

    // Fetch current user data
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = await AsyncStorage.getItem('authtoken');
                const response = await fetch('http://localhost:5000/userdata', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();
                if (data.status === 'ok') {
                    setUserData(data.data);
                    setUpdatedData({
                        name: data.data.name,
                        profession: data.data.profession,
                        profileImage: data.data.profileImage || null,
                    });
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchUserData();
    }, []);

    const selectImage = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
        });

        if (result.assets && result.assets[0]) {
            setUpdatedData({
                ...updatedData,
                profileImage: result.assets[0].uri,
            });
        }
    };

    const handleSave = async () => {
        try {
            const token = await AsyncStorage.getItem('authtoken');
            const formData = new FormData();

            formData.append('name', updatedData.name);
            formData.append('profession', updatedData.profession);
            if (updatedData.profileImage) {
                formData.append('profileImage', {
                    uri: updatedData.profileImage,
                    type: 'image/jpeg',
                    name: 'profile.jpg',
                });
            }

            const response = await fetch('http://localhost:5000/updateProfile', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const responseBody = await response.text(); // Use text() to see the raw response
            console.log('Response:', responseBody);

            const data = JSON.parse(responseBody); // Parse JSON if the response is valid

            if (data.status === 'ok') {
                setUserData(data.user);
                setEditing(false);

            } else {
                console.error('Failed to update profile:', data.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };


    if (!userData) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity
                style={{ marginLeft: 'auto' }}
                onPress={editing ? handleSave : () => setEditing(true)}
            >
                <Text style={styles.editButtonText}>{editing ? 'Save Changes' :
                    <Entypo name='edit' size={20} />

                }</Text>
            </TouchableOpacity>
            <View style={styles.header}>
                <TouchableOpacity onPress={editing ? selectImage : null}>
                    <Image
                        source={{
                            uri: updatedData.profileImage || 'https://default-profile-image-url.com',
                        }}
                        style={styles.profileImage}
                    />
                    <Entypo name='plus' color="white" size={39} style={{marginTop:1,marginLeft:1 ,position:'absolute' , backgroundColor:'rgba(0, 0, 0, 0.417)', padding:55,  borderRadius:100}}/>
                </TouchableOpacity>
            </View>

            <View style={styles.infoContainer}>
                {editing ? (
                    <>
                        <TextInput
                            style={styles.input}
                            value={updatedData.name}
                            onChangeText={(text) => setUpdatedData({ ...updatedData, name: text })}
                            placeholder="Name"
                        />
                        <TextInput
                            style={styles.input}
                            value={updatedData.profession}
                            onChangeText={(text) => setUpdatedData({ ...updatedData, profession: text })}
                            placeholder="Profession"
                        />


                    </>
                ) : (
                    <>
                        <Text style={{ color: 'black', marginLeft: 30 }}>Name</Text>
                        <View style={{ flexDirection: 'row' }}>
                            <Ionicons size={20} name='person' />
                            <Text style={{ fontWeight: '600', fontSize: 20, marginLeft: 10 }}>{userData.name}</Text>
                        </View>
                        <View style={{ marginTop: 20 }}>

                            <Text style={{ color: 'black', marginLeft: 30 }}>About</Text>
                            <View style={{ flexDirection: 'row' }}>
                                <AntDesign size={20} name='infocirlceo' />
                                <Text style={{ fontWeight: '600', fontSize: 20, marginLeft: 10 }}>{userData.profession || 'Not specified'}</Text>

                            </View>
                        </View>

                    </>
                )}
            </View>


        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f8f8f8' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', marginBottom: 20 },
    profileImage: { width: 150, height: 150, borderRadius: 100, backgroundColor:"red"},
    infoContainer: { marginBottom: 20 },
    infoValue: { fontSize: 16, color: 'black', marginBottom: 10 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, marginBottom: 10, borderRadius: 5 },
});

export default Profile;
