import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredUser, logout as authLogout } from '../api/auth';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAppReady, setIsAppReady] = useState(false);
    const [draft, setDraft] = useState({
        train: null,
        coach: null,
        category: null,
        activity: null,
        answers: {}
    });

    useEffect(() => {
        const initialize = async () => {
            const storedUser = await getStoredUser();
            if (storedUser) setUser(storedUser);
            setIsAppReady(true);
        };
        initialize();
    }, []);

    const logout = async () => {
        await authLogout();
        setUser(null);
    };

    const clearDraft = async () => {
        setDraft({ train: null, coach: null, category: null, activity: null, answers: {} });
        await AsyncStorage.removeItem('@inspection_draft');
    };

    return (
        <StoreContext.Provider value={{
            user, setUser, logout, isAppReady,
            draft, setDraft, clearDraft
        }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => useContext(StoreContext);
