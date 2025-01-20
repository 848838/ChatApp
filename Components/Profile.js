import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const Profile = () => {
    const [userData, setUserData] = useState(null);
const navigation = useNavigation()
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
                    setUserData(data.data); // Store user data
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchUserData();
    }, []);

    if (!userData) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }
    const singout =()=>{
      const token = AsyncStorage.removeItem('authtoken')
      if(token){
          navigation.navigate('Login')
      }
  }
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={{ uri: userData.profileImage || 'https://default-profile-image-url.com' }}
                    style={styles.profileImage}
                />
                <View style={styles.headerText}>
                    <Text style={styles.userName}>{userData.name}</Text>
                    <Text style={styles.status}>{userData.status || 'Hey there! I am using this app.'}</Text>
                </View>
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{userData.email}</Text>

                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{userData.phone}</Text>

                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoValue}>{userData.location || 'Not set'}</Text>
            </View>

            <TouchableOpacity style={styles.editButton} onPress={singout}>
                <Text style={styles.editButtonText}>Signout Profile</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 20,
    },
    headerText: {
        flexDirection: 'column',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    status: {
        fontSize: 16,
        color: '#777',
    },
    infoContainer: {
        marginBottom: 20,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    infoValue: {
        fontSize: 16,
        color: '#555',
        marginBottom: 10,
    },
    editButton: {
        backgroundColor: '#007bff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    editButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Profile;
