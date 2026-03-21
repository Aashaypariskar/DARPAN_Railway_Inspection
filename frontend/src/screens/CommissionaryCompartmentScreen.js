import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, Animated } from 'react-native';
import { getCommissionaryProgress, completeCommissionarySession, getAmenitySubcategories } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const CommissionaryCompartmentScreen = ({ route, navigation }) => {
    const { sessionId, coachNumber, status } = route.params;
    const [progressStats, setProgressStats] = useState({ completed_count: 0, total_expected: 112, status: 'IN_PROGRESS' });
    const [breakdown, setBreakdown] = useState({});
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const progressAnim = useRef(new Animated.Value(0)).current;

    const compartments = ['L1', 'L2', 'L3', 'L4', 'D1', 'D2', 'D3', 'D4'];

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        const percentage = progressStats.total_expected > 0 ? progressStats.completed_count / progressStats.total_expected : 0;
        console.log(`[DEBUG] Compartment Progress Update: ${progressStats.completed_count}/${progressStats.total_expected} (${(percentage * 100).toFixed(2)}%)`);
        Animated.timing(progressAnim, { toValue: percentage, duration: 800, useNativeDriver: false }).start();
    }, [progressStats.completed_count, progressStats.total_expected]);

    const loadData = async () => {
        try {
            const [progData, subsData] = await Promise.all([
                getCommissionaryProgress(coachNumber),
                getAmenitySubcategories('Amenity', 1)
            ]);
            const data = progData.data || progData;
            console.log('[DEBUG] Compartment loadData success:', data.completed_count, '/', data.total_expected);
            setProgressStats({
                completed_count: data.completed_count || 0,
                total_expected: data.total_expected || 0, // removed hardcoded 112
                status: data.status || 'IN_PROGRESS',
                fully_complete: data.fully_complete || false // Use backend flag
            });
            setBreakdown(data.breakdown || {});
            setSubcategories(subsData);
        } catch (err) {
            console.error('[DEBUG] Compartment loadData error:', err);
            Alert.alert('Error', 'Failed to load progress');
        } finally {
            setLoading(false);
        }
    };

    const isCompartmentComplete = (comp) => {
        const compProg = breakdown[comp];
        if (!compProg) return false;
        return subcategories.length > 0 && subcategories.every(sub =>
            compProg[sub.id] && compProg[sub.id].Major && compProg[sub.id].Minor
        );
    };

    const handleSelect = (comp) => {
        navigation.navigate('CommissionaryDashboard', {
            sessionId: progressStats.session_id || sessionId,
            coachNumber,
            compartmentId: comp,
            status: progressStats.status
        });
    };

    const handleSubmit = async () => {
        Alert.alert(
            'Confirm Submission',
            'Finalize this coach inspection? This will lock all compartments.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await completeCommissionarySession(coachNumber);
                            loadData();
                            Alert.alert('Success', 'Coach Inspection Finalized!');
                        } catch (err) {
                            Alert.alert('Error', 'Failed to finalize session');
                        }
                    }
                }
            ]
        );
    };

    const isAllComplete = progressStats.fully_complete === true || 
                          (progressStats.total_expected > 0 && progressStats.completed_count >= progressStats.total_expected);
    const isLocked = progressStats.status === 'COMPLETED';
    const progressPercent = progressStats.total_expected > 0 ? Math.round((progressStats.completed_count / progressStats.total_expected) * 100) : 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.coachPill}>
                    <Text style={styles.coachText}>COACH: {coachNumber}</Text>
                </View>
                {isLocked && (
                    <View style={styles.lockedBadge}>
                        <Ionicons name="lock-closed" size={12} color="#fff" />
                        <Text style={styles.lockedText}>Locked</Text>
                    </View>
                )}
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Total Coach Progress</Text>
                    <Text style={styles.progressValue}>{progressPercent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
                </View>
                <Text style={styles.progressMeta}>{progressStats.completed_count} / {progressStats.total_expected} Activity Blocks Completed</Text>
            </View>

            <Text style={styles.title}>Select Compartment</Text>
            <FlatList
                data={compartments}
                keyExtractor={(item) => item}
                numColumns={2}
                renderItem={({ item }) => {
                    const complete = isCompartmentComplete(item);
                    return (
                        <TouchableOpacity
                            style={[styles.card, complete && styles.cardComplete]}
                            onPress={() => handleSelect(item)}
                        >
                            <View style={[styles.iconBox, complete && styles.iconBoxComplete]}>
                                <Ionicons
                                    name={item.startsWith('L') ? "water-outline" : "exit-outline"}
                                    size={24}
                                    color={complete ? "#fff" : "#2563eb"}
                                />
                            </View>
                            <Text style={styles.compName}>{item}</Text>
                            <View style={styles.statusRow}>
                                <Ionicons name={complete ? "checkmark-circle" : "time-outline"} size={12} color={complete ? "#10b981" : "#94a3b8"} />
                                <Text style={[styles.statusText, complete && { color: '#10b981' }]}>{complete ? 'Complete' : 'Pending'}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={styles.list}
            />

            {isAllComplete && !isLocked && (
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Text style={styles.submitBtnText}>Final Submit Inspection</Text>
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            )}

            {isLocked && (
                <View style={[styles.submitBtn, { backgroundColor: '#10b981' }]}>
                    <Ionicons name="checkmark-done-circle" size={24} color="#fff" />
                    <Text style={styles.submitBtnText}>Inspection Finalized</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, marginBottom: 10 },
    coachPill: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    coachText: { fontSize: 12, fontWeight: 'bold', color: '#2563eb' },

    lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    lockedText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    progressSection: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 20, elevation: 2 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    progressTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
    progressValue: { fontSize: 16, fontWeight: '900', color: '#2563eb' },
    progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#2563eb' },

    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 12, color: '#64748b', marginBottom: 15 },
    list: { paddingBottom: 100 },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 6,
        padding: 15,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardComplete: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7', borderWidth: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    iconBoxComplete: { backgroundColor: '#10b981' },
    compName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusText: { fontSize: 10, color: '#94a3b8', marginLeft: 4 },
    submitBtn: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#10b981',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CommissionaryCompartmentScreen;
