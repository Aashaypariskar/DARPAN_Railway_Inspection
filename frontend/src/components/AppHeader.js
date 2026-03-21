import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../config/theme';

/**
 * Pure UI Standardized Header
 * @param {string} title - The title to display
 * @param {function} onBack - Optional back button handler
 * @param {function} onHome - Optional home button handler
 * @param {boolean} showHome - Whether to show the home icon
 * @param {React.ReactNode} rightComponent - Optional custom component for the right side
 */
const AppHeader = ({ title, onBack, onHome, showHome = true, rightComponent }) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.left}>
                    {onBack && (
                        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
                            <Ionicons name="arrow-back-outline" size={26} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.center}>
                    <Text style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>
                </View>

                <View style={styles.right}>
                    {rightComponent ? rightComponent : (
                        showHome && onHome && (
                            <TouchableOpacity onPress={onHome} style={styles.iconBtn}>
                                <Ionicons name="home-outline" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        )
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingTop: Platform.OS === 'android' ? 35 : 0, // Handle status bar height
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    left: {
        flex: 1,
        alignItems: 'flex-start',
    },
    center: {
        flex: 3,
        alignItems: 'center',
    },
    right: {
        flexShrink: 0,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    iconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default AppHeader;
