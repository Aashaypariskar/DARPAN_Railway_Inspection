import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getCaiQuestions,
    getCaiAnswers,
    autosaveInspection,
    uploadPhoto,
    saveInspectionCheckpoint,
    submitCaiSession,
    getDefects,
    addCaiQuestion
} from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { bulkMarkQuestionsOk } from '../utils/bulkMarkQuestionsOk';
import QuestionCard from '../components/QuestionCard';
import { useStore } from '../store/StoreContext';
import QuestionProgressHeader from '../components/QuestionProgressHeader';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';
import { extractAllQuestions, getQuestionId, isQuestionAnswered } from '../utils/questionUtils';
import { generateAnswerKey, buildAnswerContext } from '../utils/answerKeyUtils';

const CaiQuestionsScreen = ({ route, navigation }) => {
    const params = route?.params || {};
    const { session_id, session_status, coach_id, coach_number, category_name } = params;
    const sessionId = session_id; // Keeping local for mapping
    const answerContext = useMemo(() => buildAnswerContext({ module_type: 'CAI' }, params), [params]);
    const { user } = useStore();
    const canManageAssets = user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';

    const [questions, setQuestions] = useState([]);
    const [answersMap, setAnswersMap] = useState({});
    const isMounted = useRef(false);
    const isFetching = useRef(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(session_status || 'DRAFT');
    const [progress, setProgress] = useState({ answeredCount: 0, totalQuestions: 0 });
    const [pendingDefects, setPendingDefects] = useState(0);

    const autoSaveTimers = useRef(new Map());
    const saveQueue = useRef([]);
    const processing = useRef(false);
    const [saveStatus, setSaveStatus] = useState('saved');

    const isLocked = (status === 'SUBMITTED' || status === 'COMPLETED' || status === 'CLOSED') && !canManageAssets;

    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [newAdminQ, setNewAdminQ] = useState({ cai_code: '', question_text: '' });
    const [adding, setAdding] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const qList = questions; // CaiQuestionsScreen flattens during loadData

    const processQueue = async () => {
        if (processing.current || saveQueue.current.length === 0) return;
        processing.current = true;

        while (saveQueue.current.length > 0) {
            const { qId, data } = saveQueue.current[0];
            try {
                setSaveStatus('saving');
                let serverPhotoUrl = data.photo_url;
                if (data.photo_url && (data.photo_url.startsWith('file://') || data.photo_url.startsWith('content://'))) {
                    try {
                        serverPhotoUrl = await uploadPhoto(data.photo_url);
                    } catch (uploadErr) {
                        console.error('[CAI PHOTO UPLOAD ERROR]', uploadErr);
                    }
                }

                const res = await autosaveInspection({
                    ...answerContext,
                    question_id: qId,
                    status: data.status,
                    remarks: data.remarks,
                    reason_ids: data.reasons,
                    photo_url: serverPhotoUrl,
                    observed_value: data.observed_value
                });

                const key = generateAnswerKey({ question_id: qId }, answerContext);
                if (res && typeof res.defect_locked !== 'undefined') {
                    setAnswersMap(prev => ({
                        ...prev,
                        [key]: { ...(prev[key] || {}), defect_locked: res.defect_locked ? 1 : 0 }
                    }));
                }

                saveQueue.current.shift();
                setSaveStatus('saved');
                
                setAnswersMap(prev => {
                    const updated = { ...prev, [key]: data };
                    calculateProgress(questions, updated);
                    return updated;
                });
                loadDefectCount();
            } catch (err) {
                console.error('CAI Queue Process Error:', err);
                setSaveStatus('error');
                break;
            }
        }
        processing.current = false;
    };

    const loadData = useCallback(async () => {
        if (isFetching.current || !sessionId) return;
        isFetching.current = true;
        try {
            setLoading(true);
            const [qs, ansList] = await Promise.all([
                getCaiQuestions(),
                getCaiAnswers(sessionId)
            ]);

            if (!isMounted.current) return;

            const mappedAnswers = {};
            if (ansList && Array.isArray(ansList)) {
                ansList.forEach(ans => {
                    const ctx = buildAnswerContext(ans, params);
                    const key = generateAnswerKey(ans, ctx);
                    if (!key) return;

                    mappedAnswers[key] = {
                        status: ans.status,
                        remarks: ans.remarks || '',
                        reason_ids: ans.reason_ids || [],
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

            const formattedQs = qs.map(q => ({
                ...q,
                id: q.id,
                text: `${q.cai_code} ${q.question_text}`,
                original_text: q.question_text,
                cai_code: q.cai_code
            }));
            setQuestions(formattedQs);
            
            // Immediate progress calculation for local consistency
            const answeredCount = formattedQs.filter(q => {
                const key = generateAnswerKey(q, answerContext);
                return isQuestionAnswered(q, mappedAnswers[key]);
            }).length;
            setProgress({ answeredCount, totalQuestions: formattedQs.length });
            loadDefectCount();

        } catch (err) {
            console.error("CAI Load Error:", err);
            Alert.alert('Error', 'Failed to load CAI questions');
        } finally {
            if (isMounted.current) setLoading(false);
            isFetching.current = false;
        }
    }, [sessionId]);

    useEffect(() => {
        isMounted.current = true;
        loadData();
        loadDefectCount();
        return () => {
            isMounted.current = false;
        };
    }, [loadData]);

    const onRefresh = React.useCallback(() => {
        loadData();
        loadDefectCount();
    }, [loadData]);

    const calculateProgress = (qs, ans) => {
        const total = qs.length;
        const answered = qs.filter(q => isQuestionAnswered(q, ans[generateAnswerKey(q, answerContext)])).length;
        setProgress({ answeredCount: answered, totalQuestions: total });
    };

    const loadDefectCount = async () => {
        try {
            const res = await getCaiAnswers(sessionId);
            const defects = res.filter(a => a.status === 'DEFICIENCY' && Number(a.resolved) === 0);
            setPendingDefects(defects.length);
        } catch (err) {
            console.log('Defects Count Error:', err);
        }
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

    const handleMarkAllOk = () => {
        bulkMarkQuestionsOk({
            questions,
            currentAnswers: answersMap,
            getAnswerKey: (item) => generateAnswerKey(item, answerContext),
            setDraft: (updater) => {
                setAnswersMap(prev => {
                    const newState = typeof updater === 'function' ? updater({ answers: prev }) : updater;
                    const finalState = newState.answers || newState;
                    calculateProgress(questions, finalState);
                    return finalState;
                });
            },
            moduleType: answerContext.module_type,
            sessionId: answerContext.session_id,
            extraParams: answerContext,
            setIsProcessing
        });
    };

    const handleAnswerUpdate = (item, data) => {
        const qId = getQuestionId(item);
        const key = generateAnswerKey(item, answerContext);
        if (!key) return;

        setAnswersMap(prev => {
            const updated = { ...prev, [key]: data };
            calculateProgress(questions, updated);
            return updated;
        });
        triggerAutoSave(qId, data);
    };

    const handleFinalSubmit = async () => {
        // Validation: All questions answered
        if (progress.answeredCount < progress.totalQuestions) {
            return Alert.alert('Incomplete', 'Please answer all questions before final submission.');
        }

        Alert.alert(
            'Final Submit',
            'Are you sure? This will lock the CAI checklist and mark it as submitted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            await submitCaiSession(sessionId);
                            setStatus('SUBMITTED');
                            Alert.alert('Success', 'CAI checklist submitted successfully.');
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', 'Submission failed.');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleAddQuestionSubmit = async () => {
        if (!newAdminQ.cai_code || !newAdminQ.question_text) {
            Alert.alert('Error', 'Please fill both code and text.');
            return;
        }
        try {
            setAdding(true);
            await addCaiQuestion(newAdminQ);
            setNewAdminQ({ cai_code: '', question_text: '' });
            setAddModalVisible(false);
            Alert.alert('Success', 'Question added successfully.');
            // Reload list
            loadData();
        } catch (err) {
            console.error('Add Q Error:', err);
            Alert.alert('Error', 'Failed to add question');
        } finally {
            setAdding(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="CAI Checklist"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.headerInfo}>
                <View style={styles.breadcrumb}>
                    <Text style={styles.breadcrumbText}>Coach: {coach_number} → </Text>
                    <Text style={[styles.breadcrumbText, { fontWeight: 'bold' }]}>{category_name || 'CAI Modifications'}</Text>
                </View>
                <View style={styles.saveIndicator}>
                    {saveStatus === 'saving' && <Text style={styles.savingText}>Saving...</Text>}
                    {saveStatus === 'saved' && <Text style={styles.savedText}>Saved ✓</Text>}
                    {saveStatus === 'error' && <Text style={styles.errorText}>Error ❌</Text>}
                </View>
            </View>

            {/* DEBUG LOG FOR STATUS */}
            {__DEV__ && console.log(`[CAI DEBUG] Status: ${status}, isLocked: ${isLocked}`)}

            <QuestionProgressHeader
                totalQuestions={progress.totalQuestions}
                answeredCount={progress.answeredCount}
                color={COLORS.primary}
            />

            {canManageAssets && (
                <View style={{ paddingHorizontal: 15, paddingTop: 10, gap: 10 }}>
                    {/* Mark All OK Button - Always visible for admins to allow corrections */}
                    <TouchableOpacity
                        style={[styles.markAllOkBtn, isProcessing && { opacity: 0.6 }]}
                        onPress={handleMarkAllOk}
                        disabled={isProcessing}
                    >
                        <Ionicons name="checkmark-done-circle-outline" size={20} color={COLORS.secondary} />
                        <Text style={styles.markAllOkText}>{isProcessing ? 'Processing...' : 'Mark All OK'}</Text>
                    </TouchableOpacity>

                    {(status === 'DRAFT' || status === 'IN_PROGRESS' || !status) && (
                        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
                            <Ionicons name="add-circle-outline" size={20} color="#fff" />
                            <Text style={styles.addBtnText}>Add Question</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {pendingDefects > 0 && (
                <View style={styles.defectsContainer}>
                    <TouchableOpacity
                        style={styles.defectsBtn}
                        onPress={() => navigation.navigate('Defects', {
                            session_id: session_id,
                            module_type: 'cai',
                            coach_number: coach_number
                        })}
                    >
                        <Ionicons name="warning-outline" size={20} color="#fff" />
                        <Text style={styles.defectsBtnText}>View Defects ({pendingDefects})</Text>
                    </TouchableOpacity>
                </View>
            )}


            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                    />
                }
            >
                {questions.map(q => {
                    const answerKey = generateAnswerKey(q, answerContext);
                    return (
                        <QuestionCard
                            key={answerKey}
                            question={q}
                            answerData={answersMap[answerKey]}
                            onUpdate={(data) => handleAnswerUpdate(q, data)}
                            readOnly={isLocked}
                        />
                    )
                })}

                <TouchableOpacity
                    style={[styles.submitBtn, (isLocked || progress.answeredCount < progress.totalQuestions) && styles.disabledBtn]}
                    onPress={handleFinalSubmit}
                    disabled={saving || isLocked}
                >
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>FINAL SUBMIT</Text>}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={isAddModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New CAI Question</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="CAI Code (e.g. CAI-10)"
                            value={newAdminQ.cai_code}
                            onChangeText={(t) => setNewAdminQ(p => ({ ...p, cai_code: t }))}
                            placeholderTextColor={COLORS.placeholder}
                        />

                        <TextInput
                            style={[styles.input, { height: 80, color: COLORS.textPrimary }]}
                            placeholder="Question Text"
                            multiline
                            value={newAdminQ.question_text}
                            onChangeText={(t) => setNewAdminQ(p => ({ ...p, question_text: t }))}
                            placeholderTextColor={COLORS.placeholder}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)} style={{ padding: 10, marginRight: 15 }}>
                                <Text style={{ color: COLORS.textSecondary, fontWeight: 'bold' }}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddQuestionSubmit} disabled={adding} style={{ backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, paddingHorizontal: 20 }}>
                                {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>ADD</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    breadcrumb: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    breadcrumbText: { fontSize: 13, color: COLORS.textSecondary },
    scroll: { padding: 15, paddingBottom: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    defectsContainer: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: COLORS.surface },
    defectsBtn: { flexDirection: 'row', backgroundColor: COLORS.danger, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.danger },
    defectsBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: RADIUS.lg, alignItems: 'center', marginTop: 30, elevation: 4 },
    submitBtnText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
    disabledBtn: { backgroundColor: COLORS.border },
    saveIndicator: { marginLeft: 10 },
    savingText: { color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 12 },
    savedText: { color: COLORS.success, fontWeight: 'bold', fontSize: 12 },
    errorText: { color: COLORS.error, fontWeight: 'bold', fontSize: 12 },
    addBtn: { flexDirection: 'row', backgroundColor: COLORS.success, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: RADIUS.lg },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    input: { borderBottomWidth: 1, borderColor: COLORS.border, marginBottom: 15, padding: 8, fontSize: 16, color: COLORS.textPrimary },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    markAllOkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        paddingVertical: 10,
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

export default React.memo(CaiQuestionsScreen);
