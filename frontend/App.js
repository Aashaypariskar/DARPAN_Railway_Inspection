import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { StoreProvider, useStore } from './src/store/StoreContext';

/**
 * Main App Entry
 * Wrapped with StoreProvider for Global State & Offline Support
 */
export default function App() {
    return (
        <StoreProvider>
            <SafeAreaProvider>
                <NavigationContainer>
                    <AppNavigator />
                    <StatusBar style="light" />
                </NavigationContainer>
            </SafeAreaProvider>
        </StoreProvider>
    );
}

