import * as SecureStore from 'expo-secure-store';
import api from './api';

export const login = async (email, password) => {
    try {
        const response = await api.post('/login', { email, password });
        if (response.data.token) {
            await SecureStore.setItemAsync('user_token', response.data.token);
            await SecureStore.setItemAsync('user_data', JSON.stringify(response.data.user));
        }
        return response.data;
    } catch (error) {
        console.error('Login Service Error:', error.response?.data || error.message);
        throw error.response?.data || { error: 'Connection failed' };
    }
};

export const logout = async () => {
    await SecureStore.deleteItemAsync('user_token');
    await SecureStore.deleteItemAsync('user_data');
};

export const clearSession = async () => {
    await SecureStore.deleteItemAsync('user_token');
    await SecureStore.deleteItemAsync('user_data');
};

export const getStoredToken = async () => {
    return await SecureStore.getItemAsync('user_token');
};

export const getStoredUser = async () => {
    const data = await SecureStore.getItemAsync('user_data');
    return data ? JSON.parse(data) : null;
};
