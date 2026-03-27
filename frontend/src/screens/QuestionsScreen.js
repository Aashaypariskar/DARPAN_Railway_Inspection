import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import api, {
    getQuestions,
    getWspQuestions,
    autosaveInspection,
    saveInspectionCheckpoint,
    getInspectionAnswers,
    getInspectionProgress
} from '../api/api';
import { useStore } from '../store/StoreContext';
import QuestionCard from '../components/QuestionCard';
import { Ionicons } from '@expo/vector-icons';
import { bulkMarkQuestionsOk } from '../utils/bulkMarkQuestionsOk';
import { normalizeQuestionResponse } from '../utils/normalization';
import QuestionProgressHeader from '../components/QuestionProgressHeader';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';
import { extractAllQuestions } from '../utils/questionUtils';
import { getQuestionId, isQuestionAnswered } from '../utils/answerHelpers';
import { generateAnswerKey, buildAnswerContext } from '../utils/answerKeyUtils';
/**
 * Questions Checklist Screen - PRODUCTION VERSION
 * Highly defensive code to prevent "Cannot read property of null" errors
 */
const QuestionsScreen = ({ route, navigation }) => {
    const params = route?.params || {};

    // Navigation Contract Guarantee
    const coach_id = params.coach_id || params.coachId;
    const session_id = params.session_id || params.sessionId;
    const train_id = params.train_id || params.trainId;
    const subcategory_id = params.subcategory_id || params.subcategoryId;
    const activity_type = params.activity_type || params.activityType;
    const module_type = params.module_type;
    const category_name = params.category_name || params.categoryName;
    const schedule_id = params.schedule_id || params.scheduleId;

    useEffect(() => {
        console.log('[SCREEN CONTEXT]', { module_type, category_name, subcategory_id, coach_id });
    }, [module_type, category_name, subcategory_id, coach_id]);

    const normalizedParams = {
        ...params,
        coach_id,
        session_id,
        train_id,
        subcategory_id,
        activity_type,
        schedule_id,
        module_type,
        category_name
    };

    const isMounted = useRef(false);
    const isFetching = useRef(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState(null);
    const [answersMap, setAnswersMap] = useState({});
    const [pendingDefectsCount, setPendingDefectsCount] = useState(0);
    const [isSavingPending, setIsSavingPending] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [savingCheckpoint, setSavingCheckpoint] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'

    const autoSaveTimers = useRef(new Map());
    const saveQueue = useRef([]);
    const processing = useRef(false);
    const activeAutosaves = useRef(0);

    const { draft, setDraft, user } = useStore();
    const canManageAssets = user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';


    const answerContext = useMemo(() => buildAnswerContext({}, normalizedParams), [
        normalizedParams.module_type,
        normalizedParams.coach_id,
        normalizedParams.session_id,
        normalizedParams.compartment_id,
        normalizedParams.subcategory_id,
        normalizedParams.activity_type,
        normalizedParams.schedule_id
    ]);

    const loadData = useCallback(async () => {
        if (!params.session_id && !params.sessionId) return;
        if (isFetching.current) return; // Prevent multiple simultaneous fetches
        isFetching.current = true;
        setLoading(true);
        setRefreshing(true);
        setError(null);

        const subId = normalizedParams.subcategory_id;
        const categoryName = normalizedParams.category_name;
        const moduleType = normalizedParams.module_type;

        if (!moduleType || !categoryName) {
            const fatalError = `NAVIGATION ERROR: Missing module_type or category_name in params.`;
            console.error(fatalError);
            setError(new Error(fatalError));
            setLoading(false);
            setRefreshing(false);
            isFetching.current = false;
            return;
        }

        try {
            setQuestions([]);

            let rawResponse;
            let apiCategoryName = categoryName;
            
            // Normalize Undergear specifically for generic API needs if required
            if (params.subcategoryName?.toLowerCase() === 'undergear' || params.area_name?.toLowerCase() === 'undergear' || categoryName?.toLowerCase() === 'undergear') {
                apiCategoryName = 'Undergear';
            }

            if (categoryName === 'WSP Examination' && !subId) {
                rawResponse = await getWspQuestions(normalizedParams.schedule_id);
            } else {
                rawResponse = await getQuestions(
                    params.activity_id || params.activityId,
                    normalizedParams.schedule_id,
                    subId,
                    moduleType,
                    normalizedParams.activity_type,
                    apiCategoryName
                );
            }



            if (!isMounted.current) return;

            let apiQuestions = [];
            if (rawResponse?.questions && Array.isArray(rawResponse.questions)) {
                apiQuestions = rawResponse.questions;
            } else if (rawResponse?.data?.questions && Array.isArray(rawResponse.data.questions)) {
                apiQuestions = rawResponse.data.questions;
            } else {
                const normalized = normalizeQuestionResponse(rawResponse);
                apiQuestions = normalized.groups;
            }


            setQuestions(apiQuestions);

            // Fetch actual pending defects from server
            const defectsRes = await api.get('/inspection/defects', {
                params: {
                    session_id: normalizedParams.session_id,
                    train_id: normalizedParams.train_id,
                    coach_id: normalizedParams.coach_id,
                    subcategory_id: subId,
                    schedule_id: normalizedParams.schedule_id,
                    compartment_id: params.compartment_id || params.compartment,
                    mode: params.mode,
                    type: moduleType
                }
            });

            if (defectsRes.data?.success && isMounted.current) {
                const count = (defectsRes.data.defects || []).filter(a =>
                    a.status === 'DEFICIENCY' && Number(a.resolved) === 0
                ).length;
                console.log('[DEFECTS COUNT UPDATED]', count);
                setPendingDefectsCount(count);
            }

            // --- ANSWER HYDRATION PHASE ---

            const answersRes = await getInspectionAnswers({
                session_id: normalizedParams.session_id,
                module_type: moduleType,
                subcategory_id: subId,
                compartment_id: params.compartment_id || params.compartment,
                activity_type: normalizedParams.activity_type,
                schedule_id: normalizedParams.schedule_id
            });

            if (answersRes?.success && Array.isArray(answersRes.answers)) {

                const mappedAnswers = {};
                answersRes.answers.forEach(ans => {
                    const ctx = buildAnswerContext(ans, params);
                    const key = generateAnswerKey(ans, ctx);
                    if (!key) return;

                    mappedAnswers[key] = {
                        status: ans.status,
                        observed_value: ans.observed_value,
                        reasons: ans.reasons || [],
                        remarks: ans.remarks || '',
                        photo_url: ans.photo_url || ans.image_path,
                        defect_locked: ans.defect_locked,
                        resolved: ans.resolved,
                        after_photo_url: ans.after_photo_url,
                        resolution_remark: ans.resolution_remark || ans.resolve_remark,
                        question_id: getQuestionId(ans)
                    };
                });

                // Single Source of Truth: Update local map
                setAnswersMap(prev => ({ ...prev, ...mappedAnswers }));

                // Sync with store draft for persistence and other screens
                setDraft(prev => ({
                    ...prev,
                    answers: {
                        ...(prev?.answers || {}),
                        ...mappedAnswers
                    }
                }));
            }

        } catch (error) {
            console.error("[QUESTION FETCH ERROR]", error);
            if (isMounted.current) {
                const errMsg = error.response?.data?.error || error.message || 'Check if backend is running';
                Alert.alert('Network Error', errMsg);
                setQuestions([]);
                setError(error);
            }
        } finally {
            if (isMounted.current) {
                setLoading(false);
                setRefreshing(false);
            }
            isFetching.current = false;
        }
    }, [normalizedParams.subcategory_id, normalizedParams.activity_id, normalizedParams.schedule_id, normalizedParams.category_name, answerContext, normalizedParams.module_type, normalizedParams.compartment_id, normalizedParams.session_id, setDraft]);

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

    const fetchProgress = async () => {
        const sessionId = answerContext.session_id || params.session_id || params.sessionId;
        const moduleType = answerContext.module_type || params.module_type || 'PITLINE';
        if (!sessionId) return;
        try {
            await getInspectionProgress({ session_id: sessionId, module_type: moduleType });
            // Progress is usually handled via global store or parent refresh, 
            // but calling this ensures the backend projection is triggered.
        } catch (err) {
            console.log("Fetch Progress Error:", err);
        }
    };
    const processQueue = async () => {
        if (processing.current || saveQueue.current.length === 0) return;
        processing.current = true;

        const session_id = params.session_id || params.sessionId;
        const train_id = params.train_id || params.trainId;
        const coach_id = params.coach_id || params.coachId;
        const compartment_id = params.compartment_id || params.compartment || 'NA';
        const subcategory_id = params.subcategory_id || params.subcategoryId || 0;
        const activity_type = params.activity_type || params.activityType || 'Major';

        while (saveQueue.current.length > 0) {
            const { qId, data, moduleType } = saveQueue.current[0];
            const safeQId = parseInt(qId, 10);
            if (isNaN(safeQId)) {
                console.error("Invalid question_id in processQueue:", qId);
                saveQueue.current.shift();
                continue;
            }

            try {
                activeAutosaves.current += 1;
                setIsSavingPending(true);
                setSaveStatus('saving');
                console.log(`[AUTOSAVE] Invoking: ${moduleType} for Session: ${session_id}`);
                const res = await autosaveInspection({
                    ...answerContext,
                    question_id: safeQId,
                    status: data.status || 'OK',
                    observed_value: data.observed_value, // PERSIST OBSERVED VALUE
                    remarks: data.remarks,
                    reason_ids: data.reasons,
                    photo_url: data.photo_url || data.image_path,
                });

                if (res && res.success === true) {
                    setSaveStatus('saved');
                    // Sync defect_locked back to answersMap so QuestionCard renders LOCKED badge
                    if (typeof res.defect_locked !== 'undefined') {
                        const key = generateAnswerKey({ question_id: qId }, answerContext);
                        const update = { defect_locked: res.defect_locked ? 1 : 0 };

                        setAnswersMap(prev => ({
                            ...prev,
                            [key]: { ...(prev[key] || {}), ...update }
                        }));

                        setDraft(prev => ({
                            ...prev,
                            answers: {
                                ...(prev?.answers || {}),
                                [key]: {
                                    ...(prev?.answers?.[key] || {}),
                                    ...update
                                }
                            }
                        }));
                    }

                    saveQueue.current.shift(); // Success, remove from queue
                } else {
                    setSaveStatus('error');
                    break; // Stop and retry
                }
            } finally {
                activeAutosaves.current = Math.max(0, activeAutosaves.current - 1);
                if (activeAutosaves.current === 0) {
                    setIsSavingPending(false);
                }
            }
        }
        processing.current = false;
        fetchProgress(); // Final sync after queue clear
    };

    const triggerAutoSave = (qId, data) => {
        // Enforce lock if session is submitted
        if (params.status === 'SUBMITTED' || params.status === 'COMPLETED' || params.status === 'CLOSED') return;

        // Determine module_type
        const moduleType = normalizedParams.module_type;

        // Independent debounce per question
        const existingTimer = autoSaveTimers.current.get(qId);
        if (existingTimer) clearTimeout(existingTimer);

        const newTimer = setTimeout(() => {
            saveQueue.current.push({ qId, data, moduleType });
            processQueue();
        }, 800);

        autoSaveTimers.current.set(qId, newTimer);
    };

    const updateAnswer = (item, data) => {
        const qId = getQuestionId(item);
        if (!qId) return;

        const key = generateAnswerKey(item, answerContext);
        if (!key) return;

        // Single Source of Truth Update
        setAnswersMap(prev => ({ ...prev, [key]: data }));

        setDraft(prev => ({
            ...prev,
            answers: { ...(prev?.answers || {}), [key]: data }
        }));

        triggerAutoSave(qId, data);
    };

    const waitForAutosaves = () => new Promise(resolve => {
        if (activeAutosaves.current === 0) { resolve(); return; }
        const interval = setInterval(() => {
            if (activeAutosaves.current === 0) { clearInterval(interval); resolve(); }
        }, 200);
    });

    const selectedCategory = params.category_name || params.categoryName || params.area_name;
    const selectedSeverity = params.activity_type || params.activityType;

    const isUndergear = selectedCategory?.toLowerCase() === 'undergear' || Number(params.subcategory_id || params.subcategoryId) === 179;
    const safeQuestions = Array.isArray(questions) ? questions : [];



    // Consolidated Question Source - Passing full context to ensure children inherit activity_type
    const allExtractedQuestions = extractAllQuestions(safeQuestions, {
        compartment_id: params.compartment || 'NA',
        activity_type: params.activity_type || params.activityType
    });

    const qList = allExtractedQuestions.filter(q => {
        if (!selectedSeverity) return true;
        return q?.activity_type === selectedSeverity;
    });

    const currentQIds = qList.map(q => getQuestionId(q)).filter(Boolean);

    // Unified Progress Calculation
    const totalQs = qList.length;
    const answeredCount = qList.filter(q => {
        const key = generateAnswerKey(q, answerContext);
        return isQuestionAnswered(q, answersMap[key]);
    }).length;

    const getCurrentRelevantAnswers = () => {
        return qList.filter(q => {
            const key = generateAnswerKey(q, answerContext);
            const ans = answersMap[key];
            return ans && (ans.status || ans.observed_value);
        });
    };

    const relevantAnswersCount = getCurrentRelevantAnswers().length;

    const handleMarkAllOk = () => {
        console.log("[QuestionsScreen] Mark All OK button pressed");
        console.log("Current questions count:", qList.length);
        console.log("Current answered count:", answeredCount);
        console.log("Module type being used:", answerContext.module_type || params.module_type || 'PITLINE');
        console.log("Session ID:", answerContext.session_id || params.session_id || params.sessionId);

        bulkMarkQuestionsOk({
            questions: qList,
            currentAnswers: answersMap,
            getAnswerKey: (item) => generateAnswerKey(item, answerContext),
            setDraft: (updater) => {
                setAnswersMap(prev => {
                    const newState = typeof updater === 'function' ? updater({ answers: prev }) : updater;
                    return newState.answers || newState;
                });

                setDraft(prevDraft => {
                    const newState = typeof updater === 'function' ? updater(prevDraft) : updater;
                    return newState;
                });
            },
            moduleType: answerContext.module_type || params.module_type || 'PITLINE',
            sessionId: answerContext.session_id || params.session_id || params.sessionId,
            extraParams: answerContext,
            setIsProcessing
        })
            .then(() => {
                console.log("[QuestionsScreen] bulkMarkQuestionsOk completed successfully → refreshing from server");
                loadData();  // Reload questions + answers
                fetchProgress(); // Sync progress badges
            })
            .catch(err => {
                console.error("[QuestionsScreen] bulkMarkQuestionsOk failed:", err);
                Alert.alert(
                    'Operation Failed',
                    'Bulk marking encountered an issue. Some answers may not have saved. Please try again or mark individually.'
                );
            });
    };
    const progress = totalQs > 0 ? (answeredCount / totalQs) * 100 : 0;

    const goSummary = async () => {
        const currentRelevantAnswers = qList.map(q => {
            const key = generateAnswerKey(q, answerContext);
            return [key, answersMap[key]];
        }).filter(([key, ans]) => ans && (ans.status || ans.observed_value));

        const invalidDeficiency = currentRelevantAnswers.find(([key, ans]) => {
            if (!ans) return false;
            const missingReason = !ans.reasons || ans.reasons.length === 0;
            const missingImage = !ans.photo_url && !ans.image_path;
            const missingRemark = !ans.remarks || !ans.remarks.trim();

            const hasProblem = ans.status === 'DEFICIENCY' && (missingReason || missingImage || missingRemark);
            return hasProblem;
        });


        if (invalidDeficiency) {
            const [key, ans] = invalidDeficiency;
            const parts = key.split('_');
            const qId = parts.length > 1 ? parts[1] : parts[0];
            const qObj = qList.find(q => q?.id?.toString() === qId);
            const qText = qObj?.question_text || qObj?.text || 'Question';

            let missing = [];
            if (!ans?.reasons || ans.reasons.length === 0) missing.push('Reasons');
            if (!ans?.remarks) missing.push('Remarks');
            if (!ans?.image_path) missing.push('a Photo');

            Alert.alert(
                'Missing Information',
                `Question: "${qText.substring(0, 40)}..."\n\nRequires: ${missing.join(', ')}.`
            );
            return;
        }

        await waitForAutosaves();

        navigation.navigate('SummaryScreen', {
            ...params,
            activities: params.activities // Propagate activities for guided flow
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    if (error) {
        return (
            <View style={styles.container}>
                <AppHeader title="Error" onBack={() => navigation.goBack()} />
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
                    <Text style={[styles.emptyText, { color: COLORS.danger, textAlign: 'center' }]}>{error.message || 'Something went wrong.'}</Text>
                    <TouchableOpacity style={[styles.submitBtn, { marginTop: 20, paddingHorizontal: 30 }]} onPress={loadData}>
                        <Text style={styles.submitText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const isWsp = params.categoryName === 'WSP Examination' || params.mode === 'WSP';

    if (!Array.isArray(questions)) {
        console.error('Questions is not an array');
        return null;
    }



    const headerTitle = isUndergear
        ? 'Undergear'
        : params.subcategoryName || 'Checklist';

    return (
        <View style={styles.container}>
            <AppHeader
                title={headerTitle}
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.stickyHeader}>
                <View style={styles.breadcrumbsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbsScroll}>
                        {!isWsp ? (
                            <>
                                <Text style={styles.breadcrumb}>{params.trainName || params.train_number}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>{params.coachNumber || params.coach_number}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>{params.categoryName}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={[styles.breadcrumb, isUndergear && styles.activeBreadcrumb]}>
                                    {params.compartment ? `${params.subcategoryName} (${params.compartment})` : params.subcategoryName}
                                </Text>
                                {!isUndergear && (
                                    <>
                                        <Text style={styles.separator}>›</Text>
                                        <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                                            {params.activityType || params.activity_type}
                                        </Text>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <Text style={styles.breadcrumb}>{params.coachNumber || params.coach_number}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>WSP</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                                    {params.scheduleName || params.schedule_name}
                                </Text>
                            </>
                        )}
                    </ScrollView>
                </View>

                <View style={styles.headerFeedback}>
                    <QuestionProgressHeader
                        totalQuestions={totalQs}
                        answeredCount={answeredCount}
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
                            session_id: params.session_id || params.sessionId,
                            module_type: params.module_type || params.type,
                            coach_number: params.coach_number || params.coachNumber,
                            mode: params.mode,
                            category_name: params.category_name || params.categoryName,
                            subcategory_id: params.subcategory_id || params.subcategoryId,
                            schedule_id: params.schedule_id || params.scheduleId,
                            compartment_id: params.compartment_id || params.compartment
                        })}
                    >
                        <Ionicons name="warning-outline" size={18} color="#ef4444" />
                        <Text style={styles.defectsBtnText}>View Defects ({pendingDefectsCount})</Text>
                    </TouchableOpacity>
                )}

                {/* Mark All OK Button */}
                {((params.status !== 'SUBMITTED' &&
                    params.status !== 'COMPLETED' &&
                    params.status !== 'CLOSED') || canManageAssets) && (
                        <TouchableOpacity
                            style={[
                                styles.markAllOkBtn,
                                isProcessing && { opacity: 0.6 },
                                (totalQs > 0 && answeredCount === totalQs) && { opacity: 0.5 }
                            ]}
                            onPress={handleMarkAllOk}
                            disabled={isProcessing || loading || totalQs === 0 || answeredCount === totalQs}
                        >
                            <Ionicons
                                name="checkmark-done-circle-outline"
                                size={20}
                                color={(totalQs > 0 && answeredCount === totalQs) ? COLORS.textSecondary : COLORS.secondary}
                            />
                            <Text style={[
                                styles.markAllOkText,
                                (totalQs > 0 && answeredCount === totalQs) && { color: COLORS.textSecondary }
                            ]}>
                                {isProcessing
                                    ? 'Processing...'
                                    : (totalQs > 0 && answeredCount === totalQs ? 'All Marked' : 'Mark All OK')}
                            </Text>
                        </TouchableOpacity>
                    )}

                {/* Saving Indicator Overlay */}
                {isSavingPending && (
                    <View style={styles.savingOverlay}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={styles.savingOverlayText}>Saving answers... please wait.</Text>
                    </View>
                )}
            </View>

            {isUndergear ? (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={onRefresh}
                            colors={[COLORS.secondary]}
                        />
                    }
                >
                    {qList.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="information-circle-outline" size={48} color={COLORS.placeholder} />
                            <Text style={styles.emptyText}>No questions available.</Text>
                        </View>
                    ) : (
                        qList.map((q, index) => {
                            const answerKey = generateAnswerKey(q, answerContext);
                            return (
                                <QuestionCard
                                    key={answerKey || index}
                                    question={q}
                                    answerData={answersMap[answerKey]}
                                    onUpdate={(data) => updateAnswer(q, data)}
                                    readOnly={(params.status === 'SUBMITTED' || params.status === 'COMPLETED' || params.status === 'CLOSED') && !canManageAssets}
                                />
                            );
                        })
                    )}
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={onRefresh}
                            colors={[COLORS.secondary]}
                        />
                    }
                >
                    {questions.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="information-circle-outline" size={48} color={COLORS.placeholder} />
                            <Text style={styles.emptyText}>No questions available.</Text>
                        </View>
                    ) : (
                        questions.map((group, groupIndex) => (
                            <View key={groupIndex} style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                                    {group.item_name}
                                </Text>

                                {group.questions?.filter(q => {
                                    if (!selectedSeverity) return true;
                                    const qType = q.activity_type || params.activity_type || params.activityType;
                                    return qType === selectedSeverity;
                                }).map((q, index) => {
                                    const answerKey = generateAnswerKey(q, answerContext);
                                    return (
                                        <QuestionCard
                                            key={answerKey || index}
                                            question={q}
                                            session_id={normalizedParams.session_id}
                                            module_type={normalizedParams.module_type}
                                            train_id={normalizedParams.train_id}
                                            coach_id={normalizedParams.coach_id}
                                            answerData={answersMap[answerKey]}
                                            onUpdate={(data) => updateAnswer(q, data)}
                                            isDraft={true}
                                            readOnly={(params.status === 'SUBMITTED' || params.status === 'COMPLETED' || params.status === 'CLOSED') && !canManageAssets}
                                        />
                                    );
                                })}
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            <View style={styles.bottomButtons}>
                <TouchableOpacity
                    style={[styles.checkpointBtn, savingCheckpoint && { opacity: 0.7 }]}
                    onPress={async () => {
                        try {
                            setSavingCheckpoint(true);
                            const moduleType = normalizedParams.module_type;
                            await waitForAutosaves();

                            await saveInspectionCheckpoint({
                                module_type: moduleType,
                                session_id: normalizedParams.session_id,
                                answers: Object.entries(answersMap).map(([key, data]) => {
                                    // Key format: moduleType_sessionId_questionId_coachId_...
                                    const segments = key.split('_');
                                    const rawId = data.question_id || segments[2];
                                    const parsedId = parseInt(rawId, 10);
                                    if (isNaN(parsedId)) {
                                        console.error("Invalid question_id in saveCheckpoint, key:", key);
                                    }
                                    return {
                                        ...answerContext,
                                        ...data,
                                        question_id: isNaN(parsedId) ? null : parsedId
                                    };
                                }).filter(ans => ans.question_id !== null)
                            });

                            Alert.alert('Checkpoint', 'Session checkpoint saved successfully.');
                        } catch (e) {
                            console.error('Checkpoint Error:', e);
                            Alert.alert('Error', 'Failed to save checkpoint.');
                        } finally {
                            setSavingCheckpoint(false);
                        }
                    }}
                    disabled={savingCheckpoint}
                >
                    <Text style={styles.checkpointBtnText}>SAVE CHECKPOINT</Text>
                </TouchableOpacity>

                {answeredCount === totalQs && totalQs > 0 ? (
                    (() => {
                        const activities = params.activities || [];
                        const currentType = params.activity_type || params.activityType;
                        // Case-insensitive match for reliability
                        const currentIndex = activities.findIndex(a =>
                            a.type?.toLowerCase() === currentType?.toLowerCase()
                        );
                        const nextActivity = currentIndex !== -1 && currentIndex + 1 < activities.length ? activities[currentIndex + 1] : null;

                        if (nextActivity) {
                            return (
                                <TouchableOpacity
                                    style={[styles.submitBtn, { backgroundColor: COLORS.secondary }]}
                                    onPress={async () => {
                                        await waitForAutosaves();
                                        const isWsp = (params.module_type || '').toLowerCase().includes('wsp');
                                        navigation.replace('QuestionsScreen', {
                                            ...params,
                                            activity_type: nextActivity.type,
                                            activity_id: nextActivity.id,
                                            // Ensure WSP specific IDs are updated for the next checklist
                                            ...(isWsp && {
                                                schedule_id: nextActivity.id,
                                                scheduleId: nextActivity.id,
                                                schedule_name: nextActivity.type,
                                                scheduleName: nextActivity.type
                                            })
                                        });
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.submitText}>GO TO {nextActivity.type.toUpperCase()} CHECKLIST</Text>
                                        <Ionicons name="arrow-forward-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                                    </View>
                                </TouchableOpacity>
                            );
                        } else if (params.module_type === 'PITLINE' || params.module_type === 'WSP' || params.module_type === 'pitline_wsp' || params.module_type === 'AMENITY') {
                            const isWsp = (params.module_type || '').toLowerCase().includes('wsp');
                            const isAmenity = params.module_type === 'AMENITY';
                            const targetScreen = isWsp ? 'WspScheduleScreen' : (isAmenity ? 'AmenitySubcategory' : 'PitLineSelectArea');
                            const btnLabel = isWsp ? 'SEE SCHEDULES / SUMMARY' : 'PROCEED TO NEXT AREA / SUBMIT';

                            return (
                                <TouchableOpacity
                                    style={[styles.submitBtn, { backgroundColor: COLORS.success }]}
                                    onPress={async () => {
                                        await waitForAutosaves();
                                        navigation.navigate(targetScreen, { ...params });
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.submitText}>{btnLabel}</Text>
                                        <Ionicons name="arrow-forward-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                                    </View>
                                </TouchableOpacity>
                            );
                        } else {
                            return (
                                <TouchableOpacity style={styles.submitBtn} onPress={goSummary}>
                                    <Text style={styles.submitText}>Review Inspection ({relevantAnswersCount})</Text>
                                </TouchableOpacity>
                            );
                        }
                    })()
                ) : (
                    <TouchableOpacity style={styles.submitBtn} onPress={goSummary}>
                        <Text style={styles.submitText}>Review Inspection ({relevantAnswersCount})</Text>
                    </TouchableOpacity>
                )}

            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    stickyHeader: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3
    },
    breadcrumbsContainer: {
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        marginBottom: SPACING.sm
    },
    breadcrumbsScroll: {
        alignItems: 'center',
        paddingRight: SPACING.xl
    },
    breadcrumb: { fontSize: 12, color: COLORS.textSecondary },
    separator: { fontSize: 12, color: COLORS.placeholder, marginHorizontal: SPACING.xs },
    activeBreadcrumb: { color: COLORS.secondary, fontWeight: 'bold' },
    headerFeedback: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.xs
    },
    saveIndicator: { marginLeft: SPACING.md, minWidth: 60 },
    savingText: { color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 11 },
    savedText: { color: COLORS.success, fontWeight: 'bold', fontSize: 11 },
    errorText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 11 },
    defectsHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.danger,
        marginTop: SPACING.md,
        gap: SPACING.sm,
        elevation: 1
    },
    defectsBtnText: {
        color: COLORS.danger,
        fontWeight: 'bold',
        fontSize: 14
    },
    markAllOkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.secondary,
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    markAllOkText: {
        color: COLORS.secondary,
        fontWeight: '700',
        fontSize: 14
    },
    list: { padding: SPACING.lg, paddingBottom: 180 },
    groupContainer: { marginBottom: SPACING.xl },
    itemHeader: {
        backgroundColor: '#f8fafc',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        marginBottom: SPACING.md,
        borderRadius: RADIUS.sm
    },
    itemHeaderText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        textTransform: 'uppercase'
    },
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
        elevation: 1
    },
    checkpointBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
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
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyText: { marginTop: SPACING.lg, color: COLORS.textSecondary, fontSize: 16, fontWeight: '500' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    savingOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fffbeb',
        paddingVertical: 4,
        marginTop: 4,
        borderRadius: 4,
        gap: 8,
        borderWidth: 1,
        borderColor: '#fef3c7'
    },
    savingOverlayText: {
        color: '#92400e',
        fontSize: 12,
        fontWeight: '500'
    }
});

export default QuestionsScreen;
