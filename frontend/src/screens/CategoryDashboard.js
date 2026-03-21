import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api, { getUserCategories, getWspProgress } from '../api/api';
import { useStore } from '../store/StoreContext';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';
import { Ionicons } from '@expo/vector-icons';

const CategoryDashboard = ({ navigation }) => {
    const { user, logout, setDraft } = useStore();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [wspProgress, setWspProgress] = useState(null);

    const fetchCategories = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);

            const data = await getUserCategories();

            // Transform data or ensure CAI is present in specific position
            let finalCategories = [...data];

            // Remove CAI if it comes from server to manually position it
            finalCategories = finalCategories.filter(c => c.name !== 'CAI / Modifications');

            // Find Sick Line index
            const sickLineIdx = finalCategories.findIndex(c => c.name === 'Sick Line Examination');
            const caiCard = {
                id: 'cai_manual',
                title: 'CAI / Modifications',
                icon: 'gear', // As requested
                route: 'CaiCoachScreen'
            };

            if (sickLineIdx !== -1) {
                finalCategories.splice(sickLineIdx + 1, 0, caiCard);
            } else {
                finalCategories.push(caiCard);
            }

            setCategories(finalCategories);
            setError(null);
        } catch (err) {
            console.error('Dash Error:', err);
            setError('Could not connect to the server. Please check your connection or IP configuration.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchCategories();
        }, [])
    );

    const onRefresh = () => {
        fetchCategories(true);
    };

    const handleSelectCategory = (categoryName) => {
        // Clear previous draft and start fresh focus
        setDraft({
            train: null,
            coach: null,
            category: categoryName,
            activity: null,
            answers: {}
        });
        navigation.navigate('CoachSelection', { category_name: categoryName });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Initializing Dashboard...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>{user?.name} 👋</Text>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('ReportList')}
                        style={styles.historyBtn}
                    >
                        <Text style={styles.btnText}>📜 History</Text>
                    </TouchableOpacity>
                    {(user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin') && (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('UserManagement')}
                            style={styles.adminBtn}
                        >
                            <Text style={styles.btnText}>Admin</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <Text style={styles.btnText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.gridWrapper}>
                <FlatList
                    data={categories}
                    keyExtractor={(item) => (item.id || item.name || item.title).toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => {
                                const name = item.name || item.title;
                                if (name === 'Sick Line Examination') {
                                    navigation.navigate('SickLineCoach', { category_name: name });
                                } else if (name === 'Coach Commissionary') {
                                    navigation.navigate('CommissionaryCoach', { category_name: name });
                                } else if (name === 'WSP Examination') {
                                    navigation.navigate('WspCoach', { category_name: name });
                                } else if (name === 'Amenity') {
                                    navigation.navigate('CommissionaryCoach', { category_name: name });
                                } else if (name === 'CAI / Modifications') {
                                    navigation.navigate('CaiCoachScreen', { category_name: name });
                                } else if (name === 'Pit Line Examination') {
                                    navigation.navigate('PitLineTrainList', { category_name: name });
                                } else {
                                    handleSelectCategory(name);
                                }
                            }}
                        >
                            <View style={styles.iconBg}>
                                <Text style={styles.emojiIcon}>
                                    {nameEmojiMap[item.name || item.title] || '📋'}
                                </Text>
                            </View>
                            <Text style={styles.cardTitle} numberOfLines={2}>
                                {(item.name || item.title) === 'Coach Commissionary' ? 'Coach Commissioning' : (item.name || item.title)}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                        />
                    }
                    ListHeaderComponent={() => (
                        <View style={{ marginBottom: 16 }}>
                            <Text style={styles.sectionTitle}>Inspection Modules</Text>
                            {error && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>⚠️ {error}</Text>
                                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchCategories(); }}>
                                        <Text style={styles.retryText}>Retry Connection</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={!error && (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No categories assigned.</Text>
                            <Text style={styles.emptySub}>Please contact your administrator.</Text>
                        </View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
};

const nameEmojiMap = {
    'Coach Commissionary': '📋',
    'Sick Line Examination': '🏥',
    'WSP Examination': '⚙️',
    'CAI / Modifications': '🛠️',
    'Pit Line Examination': '🚆',
    'Amenity': '✨'
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: 20, paddingVertical: 24, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    welcomeText: { fontSize: 13, color: COLORS.textSecondary },
    userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
    actionRow: { flexDirection: 'row', gap: 8 },
    historyBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#BAE6FD' },
    adminBtn: { backgroundColor: '#F5F3FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#DDD6FE' },
    logoutBtn: { backgroundColor: COLORS.dangerLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#FECACA' },
    btnText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textPrimary },
    gridWrapper: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    gridRow: { justifyContent: 'space-between' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    list: { paddingBottom: 40 },
    card: {
        width: '48%',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
        aspectRatio: 1
    },
    iconBg: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.mutedLight,
    },
    emojiIcon: { fontSize: 32 },
    cardTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
    errorContainer: { padding: 16, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#FECDD3', marginTop: 12 },
    errorText: { color: COLORS.danger, fontSize: 13, textAlign: 'center', lineHeight: 18 },
    retryBtn: { marginTop: 8, backgroundColor: COLORS.danger, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'center' },
    retryText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    loadingText: { marginTop: 12, color: COLORS.textSecondary, fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
    emptySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }
});

export default CategoryDashboard;
