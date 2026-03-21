import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAdminMetadata, createAdminUser, updateAdminUser, updateAdminUserCategories } from '../api/api';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const CreateUserScreen = ({ route, navigation }) => {
    const editUser = route.params?.editUser;

    const [name, setName] = useState(editUser?.name || '');
    const [email, setEmail] = useState(editUser?.email || '');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState(editUser?.Role?.id || null);
    const [selectedCategories, setSelectedCategories] = useState(
        editUser?.CategoryMasters?.map(c => c.id) || []
    );

    const [roles, setRoles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const data = await getAdminMetadata();
                // Enforce single-admin policy: Filter out 'Admin' role on frontend
                const allowedRoles = data.roles.filter(r =>
                    r.role_name.toLowerCase() !== 'admin'
                );
                setRoles(allowedRoles);
                setCategories(data.categories);
            } catch (err) {
                Alert.alert('Error', 'Failed to load roles and categories');
            } finally {
                setLoading(false);
            }
        };
        fetchMeta();
    }, []);

    const toggleCategory = (id) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (!editUser && (!name || !email || !password || !selectedRole)) {
            Alert.alert('Validation Error', 'Please fill all required fields');
            return;
        }

        setSubmitting(true);
        try {
            if (editUser) {
                // Update Name & Role
                await updateAdminUser(editUser.id, {
                    name,
                    role_id: selectedRole
                });

                // Update Categories
                await updateAdminUserCategories(editUser.id, selectedCategories);

                Alert.alert('Success', 'User profile and permissions updated');
            } else {
                // Create New User
                await createAdminUser({
                    name,
                    email,
                    password,
                    role_id: selectedRole,
                    category_ids: selectedCategories
                });
                Alert.alert('Success', 'New user account created');
            }
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to process request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppHeader
                title={editUser ? 'Edit User' : 'Create User'}
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>{editUser ? 'Edit User Profile' : 'Register New User'}</Text>
                <Text style={styles.subtitle}>
                    {editUser ? `Modifying access for ${editUser.name}` : 'Provision a new account with role-based access'}
                </Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={[styles.input, { color: COLORS.textPrimary }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. John Doe"
                        placeholderTextColor={COLORS.placeholder}
                    />
                </View>

                {!editUser && (
                    <>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={[styles.input, { color: COLORS.textPrimary }]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="user@inspection.com"
                                placeholderTextColor={COLORS.placeholder}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={[styles.input, { color: COLORS.textPrimary }]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                placeholderTextColor={COLORS.placeholder}
                                secureTextEntry
                            />
                        </View>
                    </>
                )}

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Select Role</Text>
                    <View style={styles.roleGrid}>
                        {roles.map(role => (
                            <TouchableOpacity
                                key={role.id}
                                style={[
                                    styles.roleCard,
                                    selectedRole === role.id && styles.roleCardActive
                                ]}
                                onPress={() => setSelectedRole(role.id)}
                            >
                                <Text style={[styles.roleName, selectedRole === role.id && styles.roleTextActive]}>
                                    {role.role_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Assign Focus Areas (Categories)</Text>
                    <View style={styles.catGrid}>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.catCard, selectedCategories.includes(cat.id) && styles.catCardActive]}
                                onPress={() => toggleCategory(cat.id)}
                            >
                                <Text style={[styles.catText, selectedCategories.includes(cat.id) && styles.catTextActive]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitText}>{editUser ? 'Update User' : 'Create Account'}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scroll: { padding: 24, paddingBottom: 60 },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
    subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: 30 },
    formGroup: { marginBottom: 24 },
    label: { fontSize: 11, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.textPrimary },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    roleCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    roleCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    roleName: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    roleTextActive: { color: '#fff' },
    catGrid: { gap: 10 },
    catCard: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
    catCardActive: { backgroundColor: '#F0F7FF', borderColor: COLORS.primary },
    catText: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
    catTextActive: { color: COLORS.primary, fontWeight: 'bold' },
    submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 24, elevation: 2 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }
});

export default CreateUserScreen;
