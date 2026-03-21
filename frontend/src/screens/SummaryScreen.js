import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { submitInspection, saveWspAnswers } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config/environment';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const normalizeUrl = (uri) => {
    if (!uri) return null;
    if (typeof uri !== 'string') return null;
    if (uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://')) {
        return uri;
    }
    // Robustly strip /api suffix from base URL
    const cleanBase = BASE_URL.replace(/\/api\/?$/, '');
    const cleanUri = uri.startsWith('/') ? uri : `/${uri}`;
    return `${cleanBase}${cleanUri}`;
};

import { calculateCompliance } from '../utils/compliance';

/**
 * Inspection Summary Screen - PRODUCTION VERSION
 * Highly defensive code to prevent "Cannot read property of null" errors
 */
const SummaryScreen = ({ route, navigation }) => {
    const { draft, clearDraft, user } = useStore();
    const [submitting, setSubmitting] = useState(false);

    // Defensive check for draft object
    const currentDraft = draft || {};
    const params = route?.params || {};
    
    // Phase 2: Navigation Parameter Normalization
    const coach_id = params.coach_id || params.coachId;
    const session_id = params.session_id || params.sessionId;
    const train_id = params.train_id || params.trainId;
    const subcategory_id = params.subcategory_id || params.subcategoryId;
    const compartment = params.compartment || 'NA';

    // Filter answers to ONLY show the current compartment's results
    const answersList = Object.entries(currentDraft.answers || {}).filter(([key]) => {
        const parts = key.split('_');
        const comp = parts.length > 1 ? parts[0] : null;
        return comp === (params.compartment || null);
    });

    const complianceScore = calculateCompliance(answersList);

    const counts = {
        total: answersList.length,
        ok: answersList.filter(([_, a]) => a?.status === 'OK').length,
        deficiency: answersList.filter(([_, a]) => a?.status === 'DEFICIENCY').length,
        na: answersList.filter(([_, a]) => a?.status === 'NA').length,
        value: answersList.filter(([_, a]) => a?.observed_value).length,
    };

    const finalSubmit = async () => {
        if ((params.categoryName !== 'WSP Examination' && !currentDraft.train) || !currentDraft.coach) {
            Alert.alert('Error', 'Incomplete inspection data. Please go back.');
            return;
        }

        setSubmitting(true);
        const payload = {
            train_id: currentDraft.train?.id,
            coach_id: currentDraft.coach?.id,
            activity_id: currentDraft.activity?.id,
            schedule_id: currentDraft.schedule_id,
            subcategory_id: currentDraft.subcategory_id,
            compartment: params.compartment, // Pass compartment to backend
            mode: params.mode || 'INDEPENDENT',
            submission_id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            submission_timestamp: new Date().toISOString(),
            answers: answersList.map(([key, data]) => {
                const parts = key.split('_');
                const qId = parts.length > 1 ? parts[1] : parts[0];
                return {
                    question_id: parseInt(qId),
                    status: data?.status,
                    observed_value: data?.observed_value,
                    reasons: data?.reasons || [],
                    remarks: data?.remarks || '',
                    image_path: data?.image_path || null
                };
            })
        };

        try {
            if (params.categoryName === 'WSP Examination') {
                const wspPayload = {
                    session_id: params.sessionId,
                    mode: params.mode || 'INDEPENDENT',
                    coach_id: currentDraft.coach?.id,
                    schedule_id: currentDraft.schedule_id,
                    answers: payload.answers
                };
                await saveWspAnswers(wspPayload);
            } else {
                await submitInspection(payload);
            }

            Alert.alert('Success!', 'Inspection submitted successfully', [
                {
                    text: 'Done', onPress: () => {
                        const submittedTrain = currentDraft.train?.train_number || 'Audit';
                        const submittedCoach = currentDraft.coach?.coach_number;
                        const now = new Date().toISOString().split('T')[0];
                        const userId = user?.id;

                        clearDraft();
                        navigation.replace('ReportSuccess', {
                            submission_id: payload.submission_id,
                            train_id: currentDraft.train?.id,
                            train_number: submittedTrain,
                            coach_id: currentDraft.coach?.id,
                            coach_number: submittedCoach,
                            category_name: currentDraft.category,
                            subcategory_id: currentDraft.subcategory_id,
                            subcategory_name: currentDraft.subcategory_name,
                            activity_type: currentDraft.activity?.type || 'Standard',
                            compartment: params.compartment,
                            activities: params.activities // Final propagation to Success screen
                        });
                    }
                }
            ]);
        } catch (e) {
            console.error('Submission Error:', e.response?.data || e.message);
            Alert.alert('Error', 'Failed to synchronize with backend. Check connection.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <AppHeader
                title="Inspection Review"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.headerCard}>
                    <Text style={styles.title}>Final Review</Text>
                    <Text style={styles.sub}>
                        {currentDraft.train?.name || 'Unknown Train'} - Coach {currentDraft.coach?.coach_number || 'N/A'}
                    </Text>
                    <Text style={styles.frameworkSub}>
                        {currentDraft.category === 'Coach Commissionary' ? 'Coach Commissioning' : currentDraft.category} › {params.compartment ? `${currentDraft.subcategory_name} (${params.compartment})` : (currentDraft.schedule_name || currentDraft.subcategory_name || currentDraft.activity?.type)}
                    </Text>

                    <View style={styles.stats}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#10b981' }]}>{counts.ok}</Text>
                            <Text style={styles.statLabel}>OK</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#ef4444' }]}>{counts.deficiency}</Text>
                            <Text style={styles.statLabel}>DEFICIENCY</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#64748b' }]}>{counts.na}</Text>
                            <Text style={styles.statLabel}>NA</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#3b82f6' }]}>{counts.value}</Text>
                            <Text style={styles.statLabel}>MEASURED</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: complianceScore < 80 ? '#ef4444' : '#10b981' }]}>{complianceScore}%</Text>
                            <Text style={styles.statLabel}>SCORE</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNum}>{counts.total}</Text>
                            <Text style={styles.statLabel}>TOTAL</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Deficiencies Found</Text>
                {counts.deficiency === 0 ? (
                    <Text style={styles.emptyText}>All checks passed successfully! ✨</Text>
                ) : (
                    answersList.map(([id, ans]) => ans?.status === 'DEFICIENCY' && (
                        <View key={id} style={styles.findingCard}>
                            <Text style={styles.remarks}>{ans.remarks || 'No remarks provided'}</Text>
                            <View style={styles.chips}>
                                {ans.reasons?.map(r => (
                                    <View key={r} style={styles.chip}>
                                        <Text style={styles.chipText}>{r}</Text>
                                    </View>
                                ))}
                            </View>
                            {(ans.photo_url || ans.image_path) && <Image source={{ uri: normalizeUrl(ans.photo_url || ans.image_path) }} style={styles.thumb} />}
                            {(ans.resolved || ans.after_photo_url) && (
                                <View style={styles.resolvedTag}>
                                    <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                                    <Text style={styles.resolvedTagText}>RESOLVED</Text>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={finalSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitText}>Submit Inspection</Text>
                    )
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scroll: { padding: 16 },
    headerCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: COLORS.border },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
    sub: { color: COLORS.textSecondary, marginTop: 4, fontSize: 13 },
    frameworkSub: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12, marginTop: 4 },
    stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 20 },
    statBox: { alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
    statLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, fontWeight: 'bold' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 24, marginBottom: 16 },
    emptyText: { textAlign: 'center', color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 20, fontSize: 15 },
    findingCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: COLORS.danger, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
    remarks: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', lineHeight: 20 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
    chip: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#FEE2E2' },
    chipText: { fontSize: 11, color: COLORS.danger, fontWeight: 'bold' },
    thumb: { width: 70, height: 70, borderRadius: 10, marginTop: 12 },
    footer: { padding: 20, backgroundColor: COLORS.surface, flexDirection: 'row', elevation: 20, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 15 },
    editBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F8FAFC' },
    editText: { color: COLORS.textSecondary, fontWeight: 'bold', fontSize: 16 },
    submitBtn: { flex: 2, backgroundColor: COLORS.success, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    resolvedTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginTop: 12 },
    resolvedTagText: { fontSize: 11, fontWeight: 'bold', color: '#10B981', marginLeft: 6 }
});

export default SummaryScreen;
