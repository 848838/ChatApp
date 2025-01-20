import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import AntDesign from 'react-native-vector-icons/AntDesign';

import Login from '../Auth/Login';
import Signup from '../Auth/Signup';
import Main from '../Components/Main';
import Profile from '../Components/Profile';
import Chatuser from '../Components/Chatuser';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Bottom Tab Navigation with Profile and Main Screens
const BottomTabNavigator = ({ route }) => {
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('authtoken');
      const response = await axios.post('http://localhost:5000/userdata', { token });
      setProfileImage(response.data.data.profileImage);
    } catch (error) {
      console.error('Error fetching user data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Remove header for all tab screens
        tabBarStyle: styles.tabBar,
        tabBarLabel: ({ focused }) => (
          <View style={styles.tabLabelContainer}>
            <Text style={[styles.tabLabel, focused && styles.focusedLabel]}>
              {route.name}
            </Text>
            {focused && <View style={styles.focusedUnderline} />}
          </View>
        ),
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Main') {
            return <Icon name="home-outline" size={size} color={color} />;
          } else if (route.name === 'Profile') {
            return profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  borderWidth: 2,
                  borderColor: color,
                  marginTop:39
                }}
              />
            ) : (
              <Icon name="person-outline" size={size} color={color} />
            );
          }
        },
        tabBarIconStyle: { marginTop: -5 },
        tabBarLabelStyle: { marginTop: -10 },
      })}
    >
      <Tab.Screen options={{headerShown:true}} name="Home" component={Main} />
      <Tab.Screen  name="Profile" component={Profile} />
    </Tab.Navigator>
  );
};

// Stack Navigator with Login, Signup, and Main Screens (with BottomTabNavigator)
const Stacknavigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: true }} // Apply globally
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="Chatuser" component={Chatuser} />
        <Stack.Screen options={{ headerShown: false }} name="Main" component={BottomTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    backgroundColor: 'white',
    height: 90,
    borderTopWidth: 0.5,
    borderTopColor: '#dcdcdc',
    elevation: 5,
  },
  tabLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: 'gray',
  },
  focusedLabel: {
    color: 'black',
    fontWeight: 'bold',
  },
  focusedUnderline: {
    width: 30,
    height: 3,
    backgroundColor: 'red',
    borderRadius: 1.5,
    marginTop: 2,
  },
});

export default Stacknavigation;
