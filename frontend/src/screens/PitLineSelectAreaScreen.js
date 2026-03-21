import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import api, { getInspectionProgress, submitPitlineSession } from '../api/api';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/StoreContext';
import { COLORS, RADIUS, SPACING } from '../config/theme';

const PitLineSelectAreaScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { train_id, train_number, coach_id, coach_number } = route.params;
    const trainId = train_id;
    const coachId = coach_id;
    const trainNumber = train_number;
    const coachNumber = coach_number;

    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [sessionStatus, setSessionStatus] = useState(null);
    const [progress, setProgress] = useState(null);
    const [wspCompleted, setWspCompleted] = useState(false);
    const { draft } = useStore();

    const areas = [
        { id: 119, name: "Exterior", icon: "train-car", type: 'AMENITY' },
        { id: 120, name: "Interior passenger area", icon: "seat-recline-normal", type: 'AMENITY' },
        { id: 175, name: "Door Area", icon: "door", type: 'AMENITY' },
        { id: 176, name: "Passage area", icon: "human-male-height-variant", type: 'AMENITY' },
        { id: 177, name: "Lavatory area", icon: "toilet", type: 'AMENITY' },
        { id: 178, name: "Seat and Berths", icon: "bed-outline", type: 'AMENITY' },
        { id: 179, name: "Undergear", icon: "cog-outline", type: 'UNDERGEAR' },
        { id: 186, name: "WSP Maintenance", icon: "wrench", type: 'WSP' }
    ];

    const loadProgress = async (sid) => {
        try {
            const prog = await getInspectionProgress({
                session_id: sid,
                module_type: 'PITLINE'
            });
            setProgress(prog);
        } catch (err) {
            console.error('[PITLINE PROGRESS LOAD ERROR]', err);
        }
    };

    const loadWspProgress = async (sid) => {
        if (!sid && !sessionId) return;
        try {
            const res = await api.get('/pitline/session/wsp-status', { 
                params: { session_id: sid || sessionId } 
            });
            setWspCompleted(res.data?.completed === true);
        } catch (err) {
            console.error('[PITLINE WSP PROGRESS ERROR]', err);
            setWspCompleted(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            const startSession = async () => {
                try {
                    setLoading(true);
                    const res = await api.post('/pitline/session/start', {
                        train_id: trainId,
                        coach_id: coachId
                    });
                    if (res.data.success) {
                        const sid = res.data.session_id;
                        setSessionId(sid);
                        setSessionStatus(res.data.status);
                        loadProgress(sid);
                        loadWspProgress(sid);
                    }
                } catch (err) {
                    console.error('[PITLINE SESSION START ERROR]', err);
                    Alert.alert('Error', 'Failed to initialize session');
                } finally {
                    setLoading(false);
                }
            };

            if (!sessionId) {
                startSession();
            } else {
                loadProgress(sessionId);
                loadWspProgress();
            }
        }, [sessionId])
    );

    const handleAreaSelect = (area) => {
        if (!sessionId) {
            Alert.alert('Please Wait', 'Session is still initializing...');
            return;
        }

        const params = {
            ...route.params,
            module_type: 'PITLINE',
            mapped_framework: (area.type === 'UNDERGEAR' || area.name === 'Undergear') ? 'COMMISSIONARY' : (area.type === 'WSP' ? 'WSP' : 'AMENITY'),
            session_id: sessionId,
            area_name: area.name,
            subcategory_id: area.id,
            category_name: (area.type === 'UNDERGEAR' || area.name === 'Undergear') ? 'Coach Commissioning' : (area.type === 'WSP' ? 'WSP Examination' : 'Amenity'),
            status: sessionStatus
        };

        if (area.type === 'WSP') {
            navigation.navigate('WspScheduleScreen', { ...params, mode: 'INDEPENDENT', module_type: 'pitline_wsp' });
        } else {
            navigation.navigate('ActivitySelection', params);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Area</Text>
                <Text style={styles.subTitle}>{trainNumber} / {coachNumber}</Text>
            </View>

            {loading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#1E3A8A" />
                    <Text style={styles.loadingText}>Starting Session...</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.grid}>
                    {areas.map((area) => (
                        <TouchableOpacity
                            key={area.id}
                            style={styles.card}
                            onPress={() => handleAreaSelect(area)}
                            disabled={loading}
                        >
                            <View style={styles.badgeContainer}>
                                {(() => {
                                    // WSP tracks completion separately from subcategory progress
                                    if (area.type === 'WSP') {
                                        if (wspCompleted) {
                                            return (
                                                <View style={[styles.badge, { backgroundColor: COLORS.success }]}>
                                                    <Ionicons name="checkmark-circle" size={12} color="#fff" />
                                                    <Text style={styles.badgeText}>WSP Completed</Text>
                                                </View>
                                            );
                                        }
                                        return null;
                                    }

                                    const status = progress?.perSubcategoryStatus?.find(s => s.id === area.id);
                                    let answered = status?.answered || 0;
                                    const total = status?.total || 0;

                                    // Local Reconciliation
                                    if (draft?.subcategory_id === area.id) {
                                        answered = Math.max(answered, Object.keys(draft.answers || {}).length);
                                    }

                                    const isComplete = total > 0 && answered >= total;
                                    const isPartial = answered > 0 && answered < total;

                                    if (isComplete) {
                                        return (
                                            <View style={[styles.badge, { backgroundColor: COLORS.success }]}>
                                                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                                                <Text style={styles.badgeText}>Completed ({answered}/{total})</Text>
                                            </View>
                                        );
                                    } else if (isPartial) {
                                        return (
                                            <View style={[styles.badge, { backgroundColor: COLORS.warning }]}>
                                                <Ionicons name="time" size={12} color="#fff" />
                                                <Text style={styles.badgeText}>Partial ({answered}/{total})</Text>
                                            </View>
                                        );
                                    }
                                    return null;
                                })()}
                            </View>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name={area.icon} size={32} color="#1E3A8A" />
                            </View>
                            <Text style={styles.areaName}>{area.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                {/* Final submit button - check if all areas completed */}
                {(() => {
                    // Early return only if NO progress data AND wsp not completed
                    if (!wspCompleted && (!progress?.perSubcategoryStatus || progress.perSubcategoryStatus.length === 0)) return null;
                    
                    const amenityAreas = areas.filter(a => a.type !== 'WSP');
                    const allAmenityCompleted = amenityAreas.every(area => {
                        const status = progress?.perSubcategoryStatus?.find(s => s.id === area.id);
                        const answered = status?.answered || 0;
                        const total = status?.total || 0;
                        return total > 0 && answered >= total;
                    });

                    const allCompleted = allAmenityCompleted && wspCompleted;

                    if (allCompleted) {
                        return (
                            <TouchableOpacity 
                                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                                onPress={async () => {
                                    try {
                                        setLoading(true);
                                        await submitPitlineSession(sessionId);
                                        Alert.alert('Success', 'Coach Inspection Submitted Successfully!', [
                                            { text: 'OK', onPress: () => navigation.goBack() }
                                        ]);
                                    } catch (err) {
                                        Alert.alert('Error', err.response?.data?.error || 'Failed to submit inspection');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>FINAL SUBMIT COACH INSPECTION</Text>}
                            </TouchableOpacity>
                        );
                    }
                    return null;
                })()}

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    subTitle: { fontSize: 16, color: '#1E3A8A', marginTop: 4, fontWeight: '600' },
    scrollContent: { padding: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { width: '48%', backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, position: 'relative', overflow: 'hidden' },
    badgeContainer: { position: 'absolute', top: 0, right: 0 },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderBottomLeftRadius: 8, gap: 4 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    iconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12, marginTop: 10 },
    areaName: { fontSize: 14, fontWeight: 'bold', color: '#374151', textAlign: 'center' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#1E3A8A', fontWeight: 'bold' },
    submitBtn: {
        backgroundColor: COLORS.success,
        paddingVertical: 16,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        marginBottom: SPACING.xxl,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
});

export default PitLineSelectAreaScreen;
