import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getDefects, resolveDefect, getCaiAnswers } from '../api/api';
import QuestionCard from '../components/QuestionCard';
import ImagePickerField from '../components/ImagePickerField';
import { BASE_URL } from '../config/environment';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const normalizeUrl = (uri) => {
    if (!uri) return null;
    if (typeof uri !== 'string') return null;
    if (uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://')) {
        return uri;
    }
    // Robustly strip /api from end of base URL
    const cleanBase = BASE_URL.replace(/\/api\/?$/, '');
    const cleanUri = uri.startsWith('/') ? uri : `/${uri}`;
    return `${cleanBase}${cleanUri}`;
};
const DefectsScreen = ({ route, navigation }) => {
    const params = route?.params || {};
    const [defects, setDefects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState(null);

    // State for the active resolution being worked on
    const [resolutionData, setResolutionData] = useState({
        remark: '',
        photo: null
    });

    useFocusEffect(
        React.useCallback(() => {
            fetchDefects();
        }, [params.session_id])
    );

    const fetchDefects = async () => {
        try {
            setLoading(true);
            const normalizedType = (params.module_type || params.type || '').toUpperCase().trim();
            const category = (params.categoryName || params.category_name || '').trim();

            // Standardize module type for backend
            let type = 'GENERIC';
            if (normalizedType === 'CAI') type = 'CAI';
            else if (normalizedType === 'COMMISSIONARY' || category === 'Coach Commissionary') type = 'COMMISSIONARY';
            else if (normalizedType === 'SICKLINE' || category === 'Sick Line Examination') type = 'SICKLINE';
            else if (normalizedType === 'PITLINE' || category === 'Pit Line Examination') type = 'PITLINE';
            else if (params.mode === 'WSP' || category === 'WSP Examination') type = 'WSP';
            else if (normalizedType === 'AMENITY') type = 'AMENITY';

            const response = await getDefects({
                session_id: params.session_id,
                subcategory_id: params.subcategory_id,
                schedule_id: params.schedule_id,
                compartment_id: params.compartment_id,
                mode: params.mode,
                type: type
            });

            if (response.success) {
                // Number() handles 0, "0", null consistently for equivalence to 0
                const foundDefects = (response.defects || []).filter(a =>
                    a.status === 'DEFICIENCY' && Number(a.resolved) === 0
                );
                setDefects(foundDefects);
            }
        } catch (error) {
            console.error('Fetch Defects Error:', error);
            Alert.alert('Error', 'Failed to fetch pending defects');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (defectId) => {

        if (!resolutionData.photo) {
            Alert.alert('Missing Info', 'Please attach an After Photo.');
            return;
        }

        if (resolvingId !== null) return;

        try {

            setResolvingId(defectId);

            const defect = defects.find(d => d.id === defectId);
            if (!defect) return;

            const response = await resolveDefect(
                defect.id,
                (defect.module_type || params.module_type || 'GENERIC').toUpperCase(),
                resolutionData.remark,
                resolutionData.photo,
                defect.session_id,
                defect.question_id
            );

            if (response.success) {

                setResolutionData({ remark: '', photo: null });

                const remaining = defects.filter(d => d.id !== defectId);
                setDefects(remaining);

                if (remaining.length === 0) {

                    Alert.alert('Success', 'All defects resolved!', [
                        {
                            text: 'OK',
                            onPress: () => setTimeout(() => navigation.goBack(), 200)
                        }
                    ]);

                } else {

                    setTimeout(() => navigation.goBack(), 200);

                }

            }

        } catch (error) {

            console.error('Resolve Error:', error);
            Alert.alert('Error', 'Failed to resolve defect');

        } finally {

            setResolvingId(null);

        }

    };
    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="Defect Resolution"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />
            <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>Pending Defects ({defects.length})</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {defects.length > 0 ? (
                    defects.map((defect) => (
                        <View key={defect.id} style={styles.defectCard}>
                            <View style={styles.questionSection}>
                                <Text style={styles.qText}>{defect.question_text_snapshot || 'Question'}</Text>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Reason: </Text>
                                    <Text style={styles.infoValue}>
                                        {Array.isArray(defect.reasons) ? defect.reasons.join(', ') : (defect.reasons || '')}
                                    </Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Remark: </Text>
                                    <Text style={styles.infoValue}>{defect.remarks || 'None'}</Text>
                                </View>

                                <Text style={styles.label}>Before Photo:</Text>
                                <ImagePickerField
                                    image={normalizeUrl(defect.photo_url || defect.image_path)}
                                    disabled={true}
                                />
                            </View>

                            <View style={styles.resolutionForm}>
                                <Text style={styles.resHeader}>Resolution Information</Text>

                                <TextInput
                                    style={[styles.input, { color: COLORS.textPrimary }]}
                                    placeholder="Enter resolution remark..."
                                    placeholderTextColor={COLORS.placeholder}
                                    value={defect.id === resolvingId ? resolutionData.remark : (resolvingId ? '' : resolutionData.remark)}
                                    onChangeText={(t) => setResolutionData(prev => ({ ...prev, remark: t }))}
                                    multiline
                                />

                                <Text style={styles.label}>After Photo (Mandatory):</Text>
                                <ImagePickerField
                                    image={defect.id === resolvingId ? resolutionData.photo : (resolvingId ? null : resolutionData.photo)}
                                    onImagePicked={(uri) => setResolutionData(prev => ({ ...prev, photo: uri }))}
                                    onRemove={() => setResolutionData(prev => ({ ...prev, photo: null }))}
                                />

                                <TouchableOpacity
                                    style={[styles.resolveBtn, resolvingId === defect.id && styles.disabledBtn]}
                                    onPress={() => handleResolve(defect.id)}
                                    disabled={resolvingId !== null && resolvingId !== defect.id}
                                >
                                    {resolvingId === defect.id ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.resolveBtnText}>RESOLVE DEFECT</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-circle-outline" size={60} color="#10b981" />
                        <Text style={styles.emptyText}>No pending defects found.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerInfo: { padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    list: { padding: 16, paddingBottom: 50 },
    defectCard: { backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 20, overflow: 'hidden', elevation: 4, borderWidth: 1, borderColor: COLORS.border },
    questionSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    qText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 },
    infoRow: { flexDirection: 'row', marginBottom: 6 },
    infoLabel: { fontWeight: 'bold', color: COLORS.textSecondary, fontSize: 12 },
    infoValue: { color: COLORS.textPrimary, fontSize: 12 },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: 12, marginBottom: 10 },
    resolutionForm: { padding: 16, backgroundColor: '#F8FAFC' },
    resHeader: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 15, textTransform: 'uppercase' },
    input: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary, marginBottom: 15 },
    resolveBtn: { backgroundColor: COLORS.success, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
    disabledBtn: { opacity: 0.6 },
    resolveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyText: { marginTop: 15, color: COLORS.textSecondary, fontSize: 16, fontWeight: '500' }
});

export default DefectsScreen;
