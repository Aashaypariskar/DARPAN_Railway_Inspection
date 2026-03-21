import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage Utilities for Offline-First approach
 */

export const STORAGE_KEYS = {
    DRAFT: '@inspection_draft',
    CACHED_TRAINS: '@cached_trains'
};

export const saveItem = async (key, value) => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('AsyncStorage error:', e);
    }
};

export const getItem = async (key) => {
    try {
        const item = await AsyncStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error('AsyncStorage error:', e);
        return null;
    }
};

export const removeItem = async (key) => {
    try {
        await AsyncStorage.removeItem(key);
    } catch (e) {
        console.error('AsyncStorage error:', e);
    }
};
