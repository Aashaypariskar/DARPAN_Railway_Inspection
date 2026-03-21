import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getAmenitySubcategories, getCommissionaryProgress, completeCommissionarySession } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';
const AmenitySubcategoryScreen = ({ route, navigation }) => {
    const params = route.params || {};
    
    // Phase 2: Navigation Parameter Normalization
    const coach_id = params.coach_id || params.coachId;
    const coach_number = params.coach_number || params.coachNumber;
    const session_id = params.session_id || params.sessionId;
    const category_name = params.category_name || params.categoryName;

    const normalizedParams = {
        ...params,
        coach_id,
        coach_number,
        session_id,
        category_name
    };

    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { setDraft } = useStore();

    useFocusEffect(
        useCallback(() => {
            loadSubcategories();
        }, [])
    );

    const loadSubcategories = async () => {
        try {
            // Get moduleType from navigation contract
            const moduleType = params.module_type;
            
            // Map category name for API requirements if needed
            const catForApi = moduleType === 'COMMISSIONARY' ? 'Amenity' : category_name;
            const data = await getAmenitySubcategories(catForApi, coach_id);
            console.log('[AmenitySubcategory] Fetched data length:', data?.length);
            setSubcategories(data);

            if (coach_number && coach_number !== 'undefined') {
                const prog = await getCommissionaryProgress(coach_number, moduleType);
                setProgress(prog?.data || prog);
            } else {
                console.log('[AmenitySubcategory] Skipping progress load: coach_number is missing or undefined');
            }
        } catch (err) {
            Alert.alert('Error', 'Could not fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSubmit = async () => {
        const isComplete = progress?.fully_complete || progress?.completed;
        if (!isComplete) {
            Alert.alert('Incomplete', 'Please complete all areas and compartments (Major & Minor) before submitting.');
            return;
        }

        Alert.alert('Final Submission', 'Are you sure you want to complete this coach inspection? This will lock all records.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Submit',
                onPress: async () => {
                    try {
                        setSubmitting(true);
                        const moduleType = params.module_type;
                        await completeCommissionarySession(coach_number, moduleType);
                        Alert.alert('Success', 'Coach Commissioning Inspection COMPLETED!', [
                            { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
                        ]);
                    } catch (err) {
                        Alert.alert('Error', 'Submission failed');
                    } finally {
                        setSubmitting(false);
                    }
                }
            }
        ]);
    };

    const handleSelect = (sub) => {
        setDraft(prev => ({
            ...prev,
            subcategory_id: sub.id,
            subcategory_name: sub.name
        }));

        const moduleType = params.module_type;
        const navParams = {
            ...params,
            category_name: params.category_name || params.categoryName,
            subcategory_id: sub.id,
            subcategory_name: sub.name,
            status: params.status,
            module_type: moduleType
        };

        if (!navParams.module_type || !navParams.category_name) {
            console.error('[NAVIGATION ERROR] Missing module_type or category_name', navParams);
            Alert.alert('Navigation Error', 'Invalid module context. Please restart the session.');
            return;
        }

        // User explicitly wants Amenity L1-L4 and D1-D4 removed to match Commissioning
        // Bypass CompartmentSelectionScreen entirely for all subcategories
        navigation.navigate('ActivitySelection', navParams);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="Select Area"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.content}>
                <View style={styles.pills}>
                    <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coach_number || params.coachNumber}</Text></View>
                    <View style={[styles.pill, styles.activePill]}>
                        <Text style={[styles.pillText, { color: '#fff' }]}>
                            {(() => {
                                const cat_name = params.category_name || params.categoryName;
                                return cat_name === 'Coach Commissionary' ? 'Coach Commissioning' : cat_name;
                            })()}
                        </Text>
                    </View>
                </View>

                <Text style={styles.title}>Select Area</Text>
                <Text style={styles.subtitle}>Choose an amenity area to inspect</Text>

                <FlatList
                    data={subcategories}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    renderItem={({ item }) => {
                        const status = progress?.perAreaStatus?.find(s => s.id === item.id);
                        
                        // N/A rule: 0 questions of a type = that type is done (not applicable)
                        const isMajorDone = status ? (status.majorTotal === 0 || status.majorAnswered >= status.majorTotal) : false;
                        const isMinorDone = status ? (status.minorTotal === 0 || status.minorAnswered >= status.minorTotal) : false;
                        const hasMajorQuestions = status ? status.majorTotal > 0 : false;
                        const hasMinorQuestions = status ? status.minorTotal > 0 : false;

                        let badgeText = "Pending";
                        let badgeColor = COLORS.placeholder;
                        
                        const totalAct = (status?.total || status?.totalCount || 0);
                        const doneAct = (status?.answered || status?.answeredCount || 0);

                        if (status?.completed) {
                            badgeText = "Completed";
                            badgeColor = COLORS.success;
                        } else if (doneAct > 0) {
                            badgeText = "Partial";
                            badgeColor = COLORS.warning;
                        }

                        const countText = totalAct > 0 ? `(${doneAct}/${totalAct})` : "";

                        return (
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => handleSelect(item)}
                            >
                                <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
                                    <Ionicons 
                                        name={isMajorDone && isMinorDone ? "checkmark-circle" : (badgeText === 'Partial' ? "time" : "ellipse")} 
                                        size={10} 
                                        color={COLORS.surface} 
                                    />
                                    <Text style={styles.statusText}>{badgeText} {countText}</Text>
                                </View>
                                <View style={styles.iconBg}>
                                    <Ionicons name="apps-outline" size={24} color={COLORS.primary} />
                                </View>
                                <Text style={styles.subName} numberOfLines={2}>{item.name}</Text>
                                
                                <View style={styles.indicators}>
                                    {hasMinorQuestions && (
                                        <View style={[styles.miniBadge, isMinorDone && styles.miniBadgeDone]}>
                                            <Ionicons name={isMinorDone ? "checkmark-circle" : "close-circle"} size={10} color={isMinorDone ? "#fff" : "#94a3b8"} />
                                            <Text style={[styles.miniBadgeText, isMinorDone && styles.miniBadgeTextDone]}>Minor</Text>
                                        </View>
                                    )}
                                    {hasMajorQuestions && (
                                        <View style={[styles.miniBadge, isMajorDone && styles.miniBadgeDone]}>
                                            <Ionicons name={isMajorDone ? "checkmark-circle" : "close-circle"} size={10} color={isMajorDone ? "#fff" : "#94a3b8"} />
                                            <Text style={[styles.miniBadgeText, isMajorDone && styles.miniBadgeTextDone]}>Major</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.gridRow}
                ListFooterComponent={() => (
                    progress ? (
                        <View style={styles.footer}>
                            <View style={styles.progressCard}>
                                <Text style={styles.progressTitle}>Global Progress</Text>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${(progress.answered / (progress.total || 1)) * 100}%` }]} />
                                </View>
                                <Text style={styles.progressText}>
                                    {progress.answered} / {progress.total} Answers Recorded
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    (!(progress.fully_complete || progress.completed) || submitting) && { backgroundColor: COLORS.disabled }
                                ]}
                                onPress={handleFinalSubmit}
                                disabled={!(progress.fully_complete || progress.completed) || submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={COLORS.surface} />
                                ) : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Ionicons name="checkmark-done-circle-outline" size={24} color={COLORS.surface} />
                                        <Text style={styles.submitText}>Final Session Submit</Text>
                                        <Text style={styles.submitSub}>This will lock all records</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : null
                )}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: SPACING.xl },
    pills: { flexDirection: 'row', marginBottom: SPACING.lg, gap: SPACING.sm },
    pill: { backgroundColor: COLORS.disabled, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.md },
    activePill: { backgroundColor: COLORS.secondary },
    pillText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textSecondary },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.md },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xxl },
    list: { paddingBottom: 100 },
    gridRow: { justifyContent: 'space-between', marginBottom: SPACING.md },
    card: {
        width: '48%',
        aspectRatio: 1.1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    iconBg: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm
    },
    subName: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
    statusBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: COLORS.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    statusText: { color: COLORS.surface, fontSize: 10, fontWeight: 'bold' },
    indicators: {
        flexDirection: 'row',
        gap: 6,
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        width: '100%',
        justifyContent: 'center'
    },
    miniBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        gap: 3
    },
    miniBadgeDone: { backgroundColor: COLORS.success },
    miniBadgeText: { fontSize: 9, color: '#64748b', fontWeight: 'bold' },
    miniBadgeTextDone: { color: '#fff' },
    footer: { marginTop: SPACING.xl, paddingBottom: SPACING.xxl },
    progressCard: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.md, elevation: 2 },
    progressTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.sm },
    progressBar: { height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden', marginBottom: SPACING.xs },
    progressFill: { height: '100%', backgroundColor: COLORS.success },
    progressText: { fontSize: 12, color: COLORS.textSecondary },
    submitBtn: {
        backgroundColor: COLORS.primary,
        margin: SPACING.xl,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        elevation: 4
    },
    submitText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
    submitSub: { color: COLORS.surface, fontSize: 10, opacity: 0.8, marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default AmenitySubcategoryScreen;
