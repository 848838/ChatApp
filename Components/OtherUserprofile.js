import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, FlatList, Image, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';

const OtherUserProfile = ({ route }) => {
  const { id, name, profileImage, profession, imageUri } = route.params;
  const { selectedUser } = route.params;

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [lastOnline, setLastOnline] = useState(null);


  // Header configuration for navigation
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

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await AsyncStorage.getItem('authtoken');
        const response = await fetch(`http://localhost:5000/messages?receiverId=${id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.messages) {
          const images = data.messages.filter((msg) => msg.imageUri); // Filter messages with imageUri
          setImages(images);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <Image style={styles.profileImage} source={{ uri: profileImage }} />
        <View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileProfession}>{profession ||''}</Text>
          <Text style={{ fontSize: 14, color: 'green', marginBottom: 10,marginLeft:-4, fontWeight: 'bold' }}>
            {lastOnline ? ` ${'Last online:', lastOnline}` : 'Online'}

          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shared Images</Text>
      {images.length === 0 ? (
                <View >
                    <Text>No media shared ye!</Text>
                </View>):
  (<FlatList
        data={images}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Image source={{ uri: item.imageUri}} style={styles.image} />
        )}
        numColumns={2} // Display images in 3 columns
      />)
      }
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf:'center',
    flex: 1,
  width:'100%',
    backgroundColor: '#f7f7f7',
    
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 100,
    marginRight: 10,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10
  },
  profileProfession: {
    fontSize: 14,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  image: {
    alignSelf:'center',
    width: 160,
    height: 160,
    margin: 5,
    borderRadius: 4,
  },
});

export default OtherUserProfile;
