import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function Login() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Track loading state

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('authtoken');
        if (token) {
          navigation.navigate('Main');
        } else {
          setIsLoading(false); // No token found, stop loading
        }
      } catch (error) {
        console.log(error);
        setIsLoading(false); // Error occurred, stop loading
      }
    };
    checkLoginStatus();

    // BackHandler logic (optional)
    const backAction = () => {
      BackHandler.exitApp(); // Close the app when the back button is pressed
      return true; // Prevent the default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    // Cleanup the backHandler when the component is unmounted
    return () => backHandler.remove();
  }, []);

  const loginHandle = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    const user = { email, password };

    try {
      const response = await axios.post('http://localhost:5000/login', user);
      console.log('Login response:', response.data);

      if (!response.data.user) {
        console.error('Response does not contain user data:', response.data);
        throw new Error('User not found in response');
      }

      // Store the token and userId in AsyncStorage
      await AsyncStorage.setItem('authtoken', response.data.token);
      await AsyncStorage.setItem('userId', response.data.user.id);
      console.log('Stored userId:', response.data.user.id);

      navigation.navigate('Main');
    } catch (error) {
      Alert.alert('Login failed', 'An error occurred while logging in.');
      console.log('Login failed', error);
    }
  };

  if (isLoading) {
    // Optionally, you can render a loading spinner or screen here
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'whitesmoke', alignItems: 'center' }}>
        <KeyboardAvoidingView behavior="padding" style={{ width: '100%' }}>
          <View style={{ marginTop: 40 }}>
            <Text style={{ fontSize: 40, fontWeight: 'bold', color: 'black', textAlign: 'center' }}>
              Welcome There
            </Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'grey', textAlign: 'center', marginTop: 20 }}>
              Login to Your account
            </Text>
          </View>

          <View style={{ marginVertical: 10 }}>
            <View style={{ backgroundColor: '#E0E0E0', alignItems: 'center', borderRadius: 7, marginTop: 30, width: '70%', alignSelf: 'center' }}>
              <TextInput
                value={email}
                onChangeText={(text) => setEmail(text)}
                style={{ width: 300, textAlign: 'center', paddingVertical: 10 }}
                placeholder="Enter your Email"
                keyboardType="email-address"
              />
            </View>
            <View style={{ backgroundColor: '#E0E0E0', alignItems: 'center', borderRadius: 7, marginTop: 30, width: '70%', alignSelf: 'center' }}>
              <TextInput
                value={password}
                onChangeText={(text) => setPassword(text)}
                secureTextEntry
                style={{ width: 300, textAlign: 'center', paddingVertical: 10 }}
                placeholder="Enter your Password"
              />
            </View>
            <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
              <Text>Keep me logged in</Text>
              <Pressable>
                <Text style={{ color: 'black' }}>Forgot Password?</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 40 }}>
            <Pressable onPress={loginHandle} disabled={!email || !password}>
              <Text
                style={{
                  width: 200,
                  backgroundColor: 'rgb(99, 247, 134)',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  padding: 10,
                  textAlign: 'center',
                  color: 'white',
                  borderRadius: 5,
                }}
              >
                Login
              </Text>
            </Pressable>

            <View style={{ marginTop: 14, alignItems: 'center' }}>
              <Text onPress={() => navigation.navigate('Register')} style={{ fontSize: 17 }}>
                Don't have an account? Sign up
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScrollView>
  );
}