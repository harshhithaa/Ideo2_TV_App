import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storeFcmToken(token) {
  try {
    await AsyncStorage.setItem('FCM_TOKEN', token);
  } catch (e) {
    // saving error
  }
}

export async function getFcmToken() {
  return new Promise(async (response, reject) => {
    let token = '';
    try {
      const value = await AsyncStorage.getItem('FCM_TOKEN');
      // token = JSON.parse(value);
      // console.log(value);
      response(value);
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
}
export async function clearAsyncData() {
  try {
    await AsyncStorage.removeItem('user');
  } catch (error) {
    // Error retrieving data
    console.log(error);
  }
}
