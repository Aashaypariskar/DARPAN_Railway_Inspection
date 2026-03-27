import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getSickLineQuestions,
    getSickLineAnswers,
    getSickLineProgress,
    autosaveInspection,
    saveInspectionCheckpoint,
    submitSickLineInspection,
    uploadPhoto
} from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { bulkMarkQuestionsOk } from '../utils/bulkMarkQuestionsOk';
import QuestionCard from '../components/QuestionCard';
import { useStore } from '../store/StoreContext';
import { normalizeQuestionResponse } from '../utils/normalization';
import QuestionProgressHeader from '../components/QuestionProgressHeader';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';
import { extractAllQuestions, getQuestionId, isQuestionAnswered } from '../utils/questionUtils';
import { generateAnswerKey, buildAnswerContext } from '../utils/answerKeyUtils';

const SickLineQuestionsScreen = ({ route, navigation }) => {
    const params = route?.params || {};
    const {
        session_id,
        coach_id,
        coach_number,
        category_name,
        status = 'IN_PROGRESS'
    } = params;

    const sessionId = session_id;
    const coachId = coach_id;
    const coachName = coach_number;

    const answerContext = useMemo(() => buildAnswerContext({ module_type: 'SICKLINE' }, params), [params]);
    const { user } = useStore();
    const canManageAssets = user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState({ answeredCount: 0, totalQuestions: 0 });
    const isMounted = useRef(false);
    const isFetching = useRef(false);

    const isLocked = (status === 'SUBMITTED' || status === 'COMPLETED') && !canManageAssets;
    const [answersMap, setAnswersMap] = useState({});
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
    const [pendingDefectsCount, setPendingDefectsCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const autoSaveTimers = useRef(new Map());
    const saveQueue = useRef([]);
    const processing = useRef(false);

    const qList = extractAllQuestions(groups);

    const refreshProgress = async (overrideAnswers = null) => {
        const currentData = overrideAnswers || answersMap;
        const answeredCount = qList.filter(q => {
            const key = generateAnswerKey(q, answerContext);
            return isQuestionAnswered(q, currentData[key]);
        }).length;

        setProgress({
            answeredCount,
            totalQuestions: qList.length
        });
    };

    const loadData = useCallback(async () => {
        if (isFetching.current || !sessionId) return;
        isFetching.current = true;
        try {
            setLoading(true);
            setGroups([]);

            console.log(`[SICKLINE] Loading questions for coach ${coachName}`);

            const [response, savedAnswers] = await Promise.all([
                getSickLineQuestions({ coach_id: coachId }),
                getSickLineAnswers((sessionId || 'NA').toString())
            ]);

            if (!isMounted.current) return;

            const mappedAnswers = {};
            if (savedAnswers && Array.isArray(savedAnswers)) {
                savedAnswers.forEach(ans => {
                    const ctx = buildAnswerContext(ans, params);
                    const key = generateAnswerKey(ans, ctx);
                    if (!key) return;

                    mappedAnswers[key] = {
                        status: ans.status,
                        reasons: ans.reasons || [],
                        remarks: ans.remarks || '',
                        photo_url: ans.photo_url || null,
                        defect_locked: ans.defect_locked,
                        resolved: ans.resolved,
                        after_photo_url: ans.after_photo_url,
                        resolution_remark: ans.resolution_remark,
                        observed_value: ans.observed_value,
                        question_id: getQuestionId(ans)
                    };
                });
            }
            setAnswersMap(mappedAnswers);
            setIsDirty(false);

            const pendingCount = Object.values(mappedAnswers).filter(a =>
                a.status === 'DEFICIENCY' && Number(a.resolved) === 0
            ).length;
            setPendingDefectsCount(pendingCount);

            const groupsData = Array.isArray(response) ? response : [];
            setGroups(groupsData);

            // Immediate progress calculation for local consistency
            const flatQs = extractAllQuestions(groupsData);
            const answeredCount = flatQs.filter(q => {
                const key = generateAnswerKey(q, answerContext);
                return isQuestionAnswered(q, mappedAnswers[key]);
            }).length;
            setProgress({ answeredCount, totalQuestions: flatQs.length });

        } catch (err) {
            console.error("[QUESTION FETCH ERROR]", err);
            if (isMounted.current) Alert.alert('Error', 'Failed to load questions');
        } finally {
            if (isMounted.current) setLoading(false);
            isFetching.current = false;
        }
    }, [sessionId, answerContext, coachId, coachName]);

    useEffect(() => {
        isMounted.current = true;
        loadData();
        return () => {
            isMounted.current = false;
        };
    }, [loadData]);

    const onRefresh = React.useCallback(() => {
        loadData();
    }, [loadData]);

    const processQueue = async () => {
        if (processing.current || saveQueue.current.length === 0) return;
        processing.current = true;

        while (saveQueue.current.length > 0) {
            const { qId, data } = saveQueue.current[0];
            try {
                setSaveStatus('saving');
                const res = await autosaveInspection({
                    ...answerContext,
                    question_id: qId,
                    status: data.status,
                    remarks: data.remarks,
                    reason_ids: data.reasons,
                    photo_url: data.photo_url,
                    observed_value: data.observed_value
                });

                if (res && res.success !== false) {
                    setSaveStatus('saved');
                    if (res && typeof res.defect_locked !== 'undefined') {
                        const key = generateAnswerKey({ question_id: qId }, answerContext);
                        setAnswersMap(prev => ({
                            ...prev,
                            [key]: { ...(prev[key] || {}), defect_locked: res.defect_locked ? 1 : 0 }
                        }));
                    }
                    saveQueue.current.shift();
                    refreshProgress();
                } else {
                    setSaveStatus('error');
                    break;
                }
            } catch (err) {
                console.error('SickLine Queue Process Error:', err);
                setSaveStatus('error');
                break;
            }
        }
        processing.current = false;
    };

    const triggerAutoSave = (qId, data) => {
        if (isLocked) return;
        const existingTimer = autoSaveTimers.current.get(qId);
        if (existingTimer) clearTimeout(existingTimer);

        const newTimer = setTimeout(() => {
            saveQueue.current.push({ qId, data });
            processQueue();
        }, 800);

        autoSaveTimers.current.set(qId, newTimer);
    };

    const handleMarkAllOk = async () => {
        try {
            // Calculate what would be updated
            const localUpdates = {};
            qList.forEach(q => {
                const key = generateAnswerKey(q, answerContext);
                if (!key) return;
                const ans = answersMap[key];
                const isAlreadyAnswered = isQuestionAnswered(q, ans);
                
                if (!isAlreadyAnswered && q.answer_type !== 'VALUE') {
                    localUpdates[key] = {
                        question_id: getQuestionId(q),
                        status: 'OK',
                        reasons: null,
                        remarks: null,
                        photo_url: null,
                        observed_value: null
                    };
                }
            });

            const updatedAnswers = { ...answersMap, ...localUpdates };

            await bulkMarkQuestionsOk({
                questions: qList,
                currentAnswers: answersMap,
                getAnswerKey: (item) => generateAnswerKey(item, answerContext),
                setDraft: setAnswersMap,
                moduleType: answerContext.module_type,
                sessionId: answerContext.session_id,
                extraParams: answerContext,
                setIsProcessing
            });

            // Refresh progress with the full updated set
            refreshProgress(updatedAnswers);
        } catch (err) {
            console.error("Bulk mark failed", err);
        }
    };

    const handleAnswerUpdate = (item, data) => {
        const qId = getQuestionId(item);
        const key = generateAnswerKey(item, answerContext);
        if (!key) return;

        setAnswersMap(prev => {
            const updated = { ...prev, [key]: data };
            // Update progress synchronously for UI snappiness
            const answeredCount = qList.filter(q => isQuestionAnswered(q, updated[generateAnswerKey(q, answerContext)])).length;
            setProgress({ answeredCount, totalQuestions: qList.length });
            return updated;
        });
        triggerAutoSave(qId, data);
    };

    const validate = () => {
        for (const q of qList) {
            const key = generateAnswerKey(q, answerContext);
            const ans = answersMap[key];
            if (!isQuestionAnswered(q, ans)) return { valid: false, msg: `Answer is required for "${q.text || q.question_text}".` };
            
            if (ans.status === 'DEFICIENCY') {
                const hasReasons = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                const hasRemarks = ans.remarks && ans.remarks.trim().length > 0;
                const hasPhoto = !!ans.image_path || !!ans.photo_url;
                if (!hasReasons || !hasRemarks || !hasPhoto) {
                    let missing = [];
                    if (!hasReasons) missing.push('Reasons');
                    if (!hasRemarks) missing.push('Remarks');
                    if (!hasPhoto) missing.push('Photo');
                    return { valid: false, msg: `"${q.text || q.question_text}" requires: ${missing.join(', ')} for DEFICIENCY.` };
                }
            }
        }
        return { valid: true };
    };

    const handleSave = async () => {
        const check = validate();
        if (!check.valid) {
            Alert.alert('Validation Error', check.msg);
            return;
        }

        setSaving(true);
        try {
            const answeredQs = qList.filter(q => {
                const key = generateAnswerKey(q, answerContext);
                return isQuestionAnswered(q, answersMap[key]);
            });

            for (const q of answeredQs) {
                const key = generateAnswerKey(q, answerContext);
                const qId = getQuestionId(q);
                const ans = answersMap[key];
                const payload = {
                    session_id: (sessionId || 'NA').toString(),
                    question_id: qId,
                    status: ans.status,
                    reasons: ans.reasons || [],
                    remarks: ans.remarks || '',
                    observed_value: ans.observed_value
                };

                if (ans.image_path && typeof ans.image_path === 'string') {
                    if (ans.image_path.startsWith('http')) {
                        payload.photo_url = ans.image_path;
                    } else {
                        // REFACTOR: Use the unified uploadPhoto utility for structured storage
                        try {
                            const uploaded = await uploadPhoto({
                                uri: ans.image_path,
                                module_type: 'SICKLINE',
                                session_id: sessionId,
                                question_id: qId,
                                image_stage: 'before'
                            });
                            if (uploaded) payload.photo_url = uploaded;
                        } catch (uploadErr) {
                            console.error('[SICKLINE UPLOAD ERROR]', uploadErr);
                        }
                    }
                }

                await saveInspectionCheckpoint({
                    ...answerContext,
                    answers: [payload]
                });
            }

            refreshProgress();
            setIsDirty(false);
            Alert.alert('Success', 'Answers saved successfully.');
        } catch (err) {
            console.error('Save Error:', err);
            Alert.alert('Error', 'Failed to save answers.');
        } finally {
            setSaving(false);
        }
    };

    const renderQuestion = (q) => {
        const answerKey = generateAnswerKey(q, answerContext);
        return (
            <QuestionCard
                key={answerKey}
                question={q}
                answerData={answersMap[answerKey]}
                onUpdate={(data) => handleAnswerUpdate(q, data)}
                readOnly={isLocked}
            />
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="Sick Line Examination"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
                rightComponent={canManageAssets && (
                    <TouchableOpacity
                        style={styles.editQuestionsBtn}
                        onPress={() => navigation.navigate('QuestionManagement', {
                            category_name: 'Sick Line Examination',
                            activity_type: 'NA',
                            subcategory_id: 'NA'
                        })}
                    >
                        <Ionicons name="settings-outline" size={18} color={COLORS.secondary} />
                    </TouchableOpacity>
                )}
            />

            <View style={styles.content}>
                <View style={styles.badgeRow}>
                    <View style={styles.badge}><Text style={styles.badgeText}>COACH: {coachName}</Text></View>
                    <View style={[styles.badge, styles.activeBadge]}>
                        <Text style={[styles.badgeText, { color: '#fff' }]}>Sick Line</Text>
                    </View>
                </View>

                <View style={styles.headerFeedback}>
                    <QuestionProgressHeader
                        totalQuestions={progress.totalQuestions}
                        answeredCount={progress.answeredCount}
                    />
                    <View style={styles.saveIndicator}>
                        {saveStatus === 'saving' && <Text style={styles.savingText}>Saving...</Text>}
                        {saveStatus === 'saved' && <Text style={styles.savedText}>Saved ✓</Text>}
                        {saveStatus === 'error' && <Text style={styles.errorText}>Save Error ❌</Text>}
                    </View>
                </View>


                {/* View Defects Button - Stricter Visibility */}
                {pendingDefectsCount > 0 && (
                    <TouchableOpacity
                        style={styles.defectsHeaderBtn}
                        onPress={() => navigation.navigate('Defects', {
                            session_id: session_id,
                            module_type: 'sickline',
                            coach_number: coach_number
                        })}
                    >
                        <Ionicons name="warning-outline" size={18} color="#ef4444" />
                        <Text style={styles.defectsBtnText}>View Defects ({pendingDefectsCount})</Text>
                    </TouchableOpacity>
                )}
                {!isLocked && (
                    <View style={{ marginBottom: 15 }}>
                        <TouchableOpacity
                            style={[styles.markAllOkBtn, isProcessing && { opacity: 0.6 }]}
                            onPress={handleMarkAllOk}
                            disabled={isProcessing}
                        >
                            <Ionicons name="checkmark-done-circle-outline" size={20} color={COLORS.secondary} />
                            <Text style={styles.markAllOkText}>{isProcessing ? 'Processing...' : 'Mark All OK'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                        />
                    }
                >
                    {groups.length > 0 ? (
                        groups.map((group, gIdx) => (
                            <View key={group.item_name || gIdx}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitleText}>{group.item_name || 'General'}</Text>
                                </View>
                                {group.questions.map(renderQuestion)}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="information-circle-outline" size={48} color="#94a3b8" />
                            <Text style={styles.emptyText}>No questions available for SS1-C.</Text>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.bottomButtons}>
                    <TouchableOpacity
                        style={[styles.checkpointBtn, isLocked && styles.disabledBtn]}
                        onPress={async () => {
                            try {
                                setSaving(true);
                                await saveInspectionCheckpoint({
                                    ...answerContext,
                                    answers: Object.entries(answersMap).map(([key, data]) => {
                                        const qIdMatch = key.match(/_(\d+)_/);
                                        const resolvedQId = data.question_id || (qIdMatch ? qIdMatch[1] : null);
                                        return {
                                            question_id: resolvedQId,
                                            ...data
                                        };
                                    }).filter(a => a.question_id)
                                });
                                Alert.alert('Checkpoint', 'Session checkpoint saved successfully.');
                            } catch (e) {
                                Alert.alert('Error', 'Failed to save checkpoint.');
                            } finally {
                                setSaving(false);
                            }
                        }}
                        disabled={saving || isLocked}
                    >
                        <Text style={styles.checkpointBtnText}>SAVE CHECKPOINT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.submitBtn, isLocked && styles.disabledBtn]}
                        onPress={() => {
                            Alert.alert(
                                'Final Submit',
                                'Are you sure? This will lock the inspection for further editing.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Submit',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                setSaving(true);
                                                await submitSickLineInspection(sessionId);
                                                Alert.alert('Success', 'Inspection submitted successfully.');
                                                navigation.goBack();
                                            } catch (e) {
                                                Alert.alert('Error', 'Submission failed.');
                                            } finally {
                                                setSaving(false);
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                        disabled={saving || isLocked}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>FINAL SUBMIT</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    badgeRow: { flexDirection: 'row', paddingVertical: SPACING.md, gap: SPACING.sm },
    badge: { backgroundColor: COLORS.disabled, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.md },
    activeBadge: { backgroundColor: COLORS.secondary },
    badgeText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textSecondary },
    headerFeedback: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginBottom: SPACING.md
    },
    saveIndicator: { marginLeft: 10, minWidth: 60 },
    savingText: { color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 11 },
    savedText: { color: COLORS.success, fontWeight: 'bold', fontSize: 11 },
    errorText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 11 },
    list: { paddingBottom: 120 },
    bottomButtons: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        gap: SPACING.sm
    },
    checkpointBtn: {
        backgroundColor: COLORS.warning,
        paddingVertical: 14,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        elevation: 2
    },
    checkpointBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    submitBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
    },
    submitText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
    editQuestionsBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center'
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    sectionHeader: { backgroundColor: COLORS.disabled, padding: 12, borderRadius: RADIUS.md, marginVertical: 15, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
    sectionTitleText: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
    emptyText: { marginTop: 10, color: COLORS.placeholder, fontSize: 14, textAlign: 'center' },
    disabledBtn: { backgroundColor: COLORS.disabled, opacity: 0.6 },
    defectsHeaderBtn: { marginTop: 10, marginHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220, 38, 38, 0.08)', borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.danger, gap: 8, elevation: 0 },
    defectsBtnText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 14 },
    markAllOkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        paddingVertical: 12,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.secondary,
        gap: SPACING.sm,
    },
    markAllOkText: {
        color: COLORS.secondary,
        fontWeight: '700',
        fontSize: 14
    },
});

export default React.memo(SickLineQuestionsScreen);
