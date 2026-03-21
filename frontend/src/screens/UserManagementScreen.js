import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/StoreContext';
import { getAdminUsers, deleteAdminUser } from '../api/api';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const UserManagementScreen = ({ navigation }) => {
    const { user: currentUser } = useStore();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUsers = async () => {
        try {
            const data = await getAdminUsers();
            setUsers(data);
        } catch (err) {
            console.error('Fetch Users Error:', err);
            Alert.alert('Error', 'Failed to fetch users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchUsers();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const handleDelete = (userId, userName) => {
        if (userId === currentUser.id) {
            Alert.alert('Invalid Action', 'You cannot delete your own admin account.');
            return;
        }

        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete ${userName}? This action is permanent.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAdminUser(userId);
                            fetchUsers();
                            Alert.alert('Success', 'User deleted successfully');
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    }
                }
            ]
        );
    };

    const renderUser = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: item.Role?.role_name === 'Admin' ? '#fee2e2' : '#f1f5f9' }]}>
                    <Text style={[styles.roleText, { color: item.Role?.role_name === 'Admin' ? '#ef4444' : '#64748b' }]}>
                        {item.Role?.role_name || 'No Role'}
                    </Text>
                </View>
            </View>

            <View style={styles.categoriesContainer}>
                <Text style={styles.label}>Assigned Focus Areas:</Text>
                <View style={styles.chips}>
                    {item.CategoryMasters?.length > 0 ? (
                        item.CategoryMasters.map(cat => (
                            <View key={cat.id} style={styles.chip}>
                                <Text style={styles.chipText}>{cat.name}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyChips}>No categories assigned</Text>
                    )}
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('CreateUser', { editUser: item })}
                >
                    <Text style={styles.editBtnText}>Edit Permissions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id, item.name)}
                >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Syncing User Directory...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppHeader
                title="System Users"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.headerInfo}>
                <View>
                    <Text style={styles.title}>Manage Accounts</Text>
                    <Text style={styles.count}>{users.length} Active Accounts</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('CreateUser')}
                >
                    <Text style={styles.addBtnText}>+ Create User</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={users}
                keyExtractor={(item, index) => (item?.id || index).toString()}
                renderItem={renderUser}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No users found in system.</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
    count: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, elevation: 2 },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    list: { padding: 16, paddingTop: 0 },
    card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, borderWidth: 1, borderColor: COLORS.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
    userInfo: { flex: 1 },
    userName: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary },
    userEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    roleText: { fontSize: 11, fontWeight: 'bold' },
    categoriesContainer: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginBottom: 15 },
    label: { fontSize: 11, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
    emptyChips: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
    actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, gap: 12 },
    editBtn: { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
    editBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
    deleteBtn: { flex: 0.4, alignItems: 'center', backgroundColor: '#FEF2F2', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' },
    deleteBtnText: { color: COLORS.danger, fontWeight: '600', fontSize: 13 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    loadingText: { marginTop: 12, color: COLORS.textSecondary, fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: COLORS.textSecondary, fontSize: 16 }
});

export default UserManagementScreen;
