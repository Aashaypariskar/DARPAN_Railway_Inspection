import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Platform, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getCommissionaryQuestions,
    getCommissionaryAnswers,
    getCommissionaryProgress,
    saveCommissionaryAnswers,
    autosaveInspection,
    saveInspectionCheckpoint
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

const CommissionaryQuestionsScreen = ({ route, navigation }) => {
    const params = route?.params || {};

    // Navigation Contract Guarantee
    const sessionId = params.session_id || params.sessionId;
    const coachNumber = params.coach_number || params.coachNumber;
    const coachId = params.coach_id || params.coachId;
    const compartmentId = params.compartment_id || params.compartmentId;
    const subcategoryIdVal = params.subcategory_id || params.subcategoryId;
    const subcategoryName = params.subcategory_name || params.subcategoryName;
    const categoryName = params.category_name || params.categoryName;
    const moduleType = params.module_type;

    useEffect(() => {
        console.log('[SCREEN CONTEXT]', { moduleType, categoryName, subcategoryIdVal, coachId, sessionId, params });
    }, [moduleType, categoryName, subcategoryIdVal, coachId, sessionId, params]);

    const { status, subcategories, currentIndex } = params;

    const [majorQs, setMajorQs] = useState([]);
    const [minorQs, setMinorQs] = useState([]);
    const [activeTab, setActiveTab] = useState(params.activity_type || 'Major'); // Correct initialization
    const isFetching = useRef(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [guidedBtns, setGuidedBtns] = useState(null); // 'TO_MAJOR', 'TO_MINOR', 'TO_NEXT'
    const [isMajorDone, setIsMajorDone] = useState(false);
    const [isMinorDone, setIsMinorDone] = useState(false);
    const fetchRef = useRef(null);
    const [supportsActivityType, setSupportsActivityType] = useState(true);

    const isLocked = status === 'SUBMITTED' || status === 'COMPLETED' || status === 'CLOSED';
    const [answersMap, setAnswersMap] = useState({});
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
    const [pendingDefectsCount, setPendingDefectsCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const autoSaveTimers = useRef(new Map());
    const saveQueue = useRef([]);
    const processing = useRef(false);

    const isMounted = useRef(false);

    const [error, setError] = useState(null);

    const answerContext = useMemo(() => buildAnswerContext({ 
        module_type: moduleType,
        activity_type: activeTab 
    }, {
        ...params,
        coach_id: coachId,
        session_id: sessionId,
        subcategory_id: subcategoryIdVal,
        compartment_id: compartmentId,
        category_name: categoryName,
        module_type: moduleType
    }), [
        moduleType,
        sessionId,
        coachId,
        compartmentId,
        subcategoryIdVal,
        activeTab
    ]);

    const loadData = useCallback(async (isRefresh = false) => {
        if (!moduleType || !categoryName) {
            const fatalError = `NAVIGATION ERROR: Missing module_type or category_name in params.`;
            console.error(fatalError);
            setError(new Error(fatalError));
            setLoading(false);
            isFetching.current = false;
            return;
        }

        if (!sessionId) {
            const fatalError = `NAVIGATION ERROR: Missing session_id in params. Cannot load questions.`;
            console.error(fatalError, params);
            setError(new Error(fatalError));
            setLoading(false);
            isFetching.current = false;
            return;
        }

        if (isFetching.current) return;
        isFetching.current = true;
        try {
            setLoading(true);
            setError(null);
            setMajorQs([]);
            setMinorQs([]);

            console.log(`[FETCHING QUESTIONS] ${moduleType} - Subcategory: ${subcategoryIdVal}, Tab: ${activeTab}`);

            let apiCategoryName = categoryName;
            if (subcategoryName?.toLowerCase() === 'undergear' || categoryName?.toLowerCase() === 'undergear') {
                apiCategoryName = 'Undergear';
            }

            const [response, savedAnswers] = await Promise.all([
                getCommissionaryQuestions(subcategoryIdVal, activeTab, apiCategoryName, moduleType),
                getCommissionaryAnswers((sessionId || 'NA').toString(), (subcategoryIdVal || 'NA').toString(), activeTab, compartmentId, moduleType)
            ]);

            if (!isMounted.current) return;

            const mappedAnswers = {};
            // FIX: getCommissionaryAnswers returns { success: true, data: [...] }
            const answersArray = Array.isArray(savedAnswers) ? savedAnswers : (savedAnswers?.data || []);

            if (Array.isArray(answersArray)) {
                answersArray.forEach(ans => {
                    // Use actual saved values from DB for key accuracy
                    const ctx = buildAnswerContext(ans, {
                        ...params,
                        session_id: ans.session_id || params.session_id || sessionId,
                        coach_id: ans.coach_id || params.coach_id || coachId,
                        compartment_id: ans.compartment_id || params.compartment_id || compartmentId || 'NA',
                        subcategory_id: ans.subcategory_id || params.subcategory_id || subcategoryIdVal,
                        activity_type: ans.activity_type || activeTab,
                        module_type: ans.module_type || moduleType,
                        schedule_id: ans.schedule_id || params.schedule_id || null
                    });
                    const key = generateAnswerKey(ans, ctx);
                    if (!key) return;

                    console.log('[HYDRATION]', { question_id: ans.question_id, key, activity_type: ans.activity_type });

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
                        question_id: getQuestionId(ans),
                        activity_type: ans.activity_type || key.split('_')[5] // Robust fallback to key encoding
                    };
                });
            }
            setAnswersMap(mappedAnswers);
            setIsDirty(false);

            const pendingCount = Object.values(mappedAnswers).filter(a =>
                a.status === 'DEFICIENCY' && Number(a.resolved) === 0
            ).length;
            setPendingDefectsCount(pendingCount);

            const normalized = normalizeQuestionResponse(response);
            setSupportsActivityType(normalized.supportsActivityType);

            const flatRes = extractAllQuestions(normalized.groups);
            if (activeTab === 'Major') {
                setMajorQs(flatRes);
            } else if (activeTab === 'Minor') {
                setMinorQs(flatRes);
            } else {
                setMajorQs(flatRes);
            }

            await refreshProgress();
        } catch (err) {
            console.error("[QUESTION FETCH ERROR]", err);
            if (isMounted.current) Alert.alert('Error', 'Failed to load questions');
        } finally {
            if (isMounted.current) setLoading(false);
            isFetching.current = false;
        }
    }, [coachNumber, subcategoryIdVal, activeTab, sessionId, compartmentId, answerContext, moduleType, categoryName, subcategoryName]);

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
        if (!coachNumber || coachNumber === 'undefined') {
            console.log('[CommissionaryQuestions] Skipping progress fetch: coachNumber is missing or undefined');
            return null;
        }
        try {
            const prog = await getCommissionaryProgress(coachNumber, moduleType);
            const data = prog?.data || prog; // Handle { success: true, data: {...} } wrapping

            // Backend returns perAreaStatus as the canonical array, with 'progress' as a compat alias
            const areaArray = data?.perAreaStatus || data?.progress || [];
            const area = areaArray.find(a => Number(a.subcategory_id) === Number(subcategoryIdVal) || Number(a.id) === Number(subcategoryIdVal));

            if (area) {
                // APPROACH 1: Use subcategory-level Major/Minor totals
                // N/A rule: if there are 0 questions of a type, that type is considered "done" (not applicable)
                let isMjr = area.majorTotal === 0 || (area.majorTotal > 0 && area.majorAnswered >= area.majorTotal);
                let isMnr = area.minorTotal === 0 || (area.minorTotal > 0 && area.minorAnswered >= area.minorTotal);

                // APPROACH 2: If questions have no typed split at all, fall back to overall answered/total
                if (area.majorTotal === 0 && area.minorTotal === 0 && area.total > 0) {
                    const allDone = area.answered >= area.total;
                    isMjr = allDone;
                    isMnr = allDone;
                }

                setIsMajorDone(isMjr);
                setIsMinorDone(isMnr);
                return { major: isMjr, minor: isMnr };
            }
        } catch (err) {
            console.log('Progress Fetch Error:', err);
        }
        return null;
    };
    const refreshProgress = fetchProgress; // ALIAS FOR CONSISTENCY

    const processQueue = async () => {
        if (processing.current || saveQueue.current.length === 0) return;
        processing.current = true;

        while (saveQueue.current.length > 0) {
            const { qId, data } = saveQueue.current[0];
            const safeQId = parseInt(qId, 10);
            if (isNaN(safeQId)) {
                console.error("Invalid question_id in processQueue:", qId);
                saveQueue.current.shift();
                continue;
            }

            try {
                setSaveStatus('saving');
                const res = await autosaveInspection({
                    ...answerContext,
                    question_id: safeQId,
                    status: data.status || 'OK',
                    observed_value: data.observed_value,
                    remarks: data.remarks,
                    reason_ids: data.reasons,
                    photo_url: data.photo_url || data.image_path,
                });

                if (res && res.success === true) {
                    setSaveStatus('saved');
                    if (typeof res.defect_locked !== 'undefined') {
                        const key = generateAnswerKey({ question_id: qId }, answerContext);
                        setAnswersMap(prev => ({
                            ...prev,
                            [key]: { ...(prev[key] || {}), defect_locked: res.defect_locked ? 1 : 0 }
                        }));
                    }
                    saveQueue.current.shift();
                    // refreshProgress(); // REMOVED FROM LOOP TO PREVENT REDUNDANT CALLS
                } else {
                    setSaveStatus('error');
                    break;
                }
            } catch (err) {
                console.error('Commissionary Queue Process Error:', err);
                setSaveStatus('error');
                break;
            }
        }
        processing.current = false;
        refreshProgress(); // CALL ONCE AFTER THE QUEUE IS EMPTY
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

    const currentQs = (subcategoryName === 'Undergear' || categoryName === 'Undergear') ? majorQs : (activeTab === 'Major' ? majorQs : minorQs);
    const allAnswered = currentQs.length > 0 && currentQs.every(q => {
        const key = generateAnswerKey(q, answerContext);
        const ans = answersMap[key];
        return ans && ans.status;
    });

    const handleMarkAllOk = async () => {
        await bulkMarkQuestionsOk({
            questions: currentQs,
            currentAnswers: answersMap,
            getAnswerKey: (item) => generateAnswerKey(item, answerContext),
            setDraft: setAnswersMap,
            moduleType: answerContext.module_type,
            sessionId: answerContext.session_id,
            extraParams: answerContext,
            setIsProcessing
        });
        await refreshProgress();
    };

    const handleAnswerUpdate = (item, data) => {
        const qId = getQuestionId(item);
        const key = generateAnswerKey(item, answerContext);
        if (!key) return;

        const capturedActivityType = item.activity_type || item.AmenityItem?.activity_type || answerContext.activity_type || key.split('_')[5];

        const augmentedData = {
            ...data,
            question_id: qId, // Ensure ID is preserved for saves
            activity_type: capturedActivityType
        };

        setAnswersMap(prev => ({ 
            ...prev, 
            [key]: augmentedData
        }));
        setIsDirty(true);
        triggerAutoSave(qId, augmentedData);
    };

    const validate = () => {
        const currentQs = activeTab === 'Minor' ? minorQs : majorQs;
        for (const q of currentQs) {
            const ans = answersMap[generateAnswerKey(q, answerContext)];
            if (!ans || !ans.status) return { valid: false, msg: `Status is required for "${q.text}".` };
            if (ans.status === 'DEFICIENCY') {
                const hasReasons = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                const hasRemarks = ans.remarks && ans.remarks.trim().length > 0;
                const hasPhoto = !!ans.image_path;
                if (!hasReasons || !hasRemarks || !hasPhoto) {
                    let missing = [];
                    if (!hasReasons) missing.push('Reasons');
                    if (!hasRemarks) missing.push('Remarks');
                    if (!hasPhoto) missing.push('Photo');
                    return { valid: false, msg: `"${q.text}" requires: ${missing.join(', ')} for DEFICIENCY.` };
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
            const currentQs = activeTab === 'Minor' ? minorQs : majorQs;
            const answeredQs = currentQs.filter(q => {
                const key = generateAnswerKey(q, answerContext);
                const ans = answersMap[key];
                return ans && ans.status;
            });

            // UNIFIED BULK SAVING
            // Using saveInspectionCheckpoint reliably handles both Major and Minor with correct activity_types
            const payloadAnswers = await Promise.all(answeredQs.map(async (q) => {
                const key = generateAnswerKey(q, answerContext);
                const ans = answersMap[key];
                
                let finalPhotoUrl = ans.photo_url || ans.image_path || null;
                if (finalPhotoUrl && (finalPhotoUrl.startsWith('file://') || finalPhotoUrl.startsWith('content://'))) {
                    try {
                        const { uploadPhoto } = require('../api/api'); // Imports fallback
                        const uploaded = await uploadPhoto(finalPhotoUrl);
                        if (uploaded) {
                            finalPhotoUrl = uploaded;
                            // Update map so we don't re-upload if they stay on screen
                            setAnswersMap(prev => ({ ...prev, [key]: { ...prev[key], photo_url: uploaded } }));
                        }
                    } catch (e) {
                         console.warn('[handleSave] Photo upload failed, continuing with original path:', e);
                    }
                }

                return {
                    ...answerContext,
                    question_id: getQuestionId(q),
                    activity_type: ans.activity_type || answerContext.activity_type, // Explicit preservation
                    status: ans.status,
                    reasons: ans.reasons || [],
                    remarks: ans.remarks || '',
                    photo_url: finalPhotoUrl
                };
            }));

            if (payloadAnswers.length > 0) {
                await saveInspectionCheckpoint({
                    ...answerContext,
                    answers: payloadAnswers
                });
            }

            const freshStatus = await refreshProgress();
            if (freshStatus) {
                if (freshStatus.major && freshStatus.minor) {
                    setGuidedBtns('TO_NEXT');
                } else if (!freshStatus.major) {
                    setGuidedBtns('TO_MAJOR');
                } else if (!freshStatus.minor) {
                    setGuidedBtns('TO_MINOR');
                }
            }
            setIsDirty(false);
            Alert.alert('Success', 'Answers saved successfully.');
        } catch (err) {
            console.error('Save Error:', err);
            Alert.alert('Error', 'Failed to save answers.');
        } finally {
            setSaving(false);
        }
    };

    const navigateToNext = () => {
        // STRICT NAVIGATION FIX: Always return to Area Selection after finish
        navigation.pop(2);
    };

    // RE-ORDERED ABOVE

    let btnText = 'Save & Sync';
    let btnAction = handleSave;

    if (isLocked) {
        btnText = 'Inspection Completed (Read-Only)';
    } else if (allAnswered && !isDirty) {
        // User wants: Minor -> Major -> Next Area
        btnText = activeTab === 'Minor' ? 'Go To Major' : 'Go To Next Area';
        btnAction = () => {
            if (activeTab === 'Minor') setActiveTab('Major');
            else navigateToNext();
        };
    } else if (isDirty) {
        btnText = activeTab === 'Minor' ? 'Save & Sync & Go To Major' : 'Save & Sync & Go To Next Area';
        btnAction = async () => {
            await handleSave();
            if (activeTab === 'Minor') setActiveTab('Major');
            else navigateToNext();
        };
    }

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

    const answeredCount = currentQs.filter(q => {
        return isQuestionAnswered(q, answersMap[generateAnswerKey(q, answerContext)]);
    }).length;
    const totalQs = currentQs.length;

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

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

    const headerTitle = subcategoryName || 'Inspection';

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitleText} numberOfLines={1}>{headerTitle}</Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] })} 
                        style={styles.headerIconBtn}
                    >
                        <Ionicons name="home-outline" size={22} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.breadcrumbsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbsScroll}>
                        <Text style={styles.breadcrumb}>{params.train_number || 'N/A'}</Text>
                        <Text style={styles.separator}>›</Text>
                        <Text style={styles.breadcrumb}>{coachNumber}</Text>
                        <Text style={styles.separator}>›</Text>
                        <Text style={styles.breadcrumb}>{categoryName}</Text>
                        <Text style={styles.separator}>›</Text>
                        <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                            {subcategoryName}
                        </Text>
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

                {pendingDefectsCount > 0 && (
                    <TouchableOpacity
                        style={styles.defectsHeaderBtn}
                        onPress={() => navigation.navigate('Defects', {
                            session_id: sessionId,
                            module_type: moduleType,
                            coach_number: coachNumber,
                            category_name: categoryName,
                            subcategory_id: subcategoryIdVal,
                            compartment_id: compartmentId
                        })}
                    >
                        <Ionicons name="warning-outline" size={18} color="#ef4444" />
                        <Text style={styles.defectsBtnText}>View Defects ({pendingDefectsCount})</Text>
                    </TouchableOpacity>
                )}

                {supportsActivityType && subcategoryName !== 'Undergear' && categoryName !== 'Undergear' && (
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'Major' && styles.activeTab]}
                            onPress={() => setActiveTab('Major')}
                        >
                            <Text style={[styles.tabText, activeTab === 'Major' && styles.activeTabText]}>
                                MAJOR {isMajorDone && '✓'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'Minor' && styles.activeTab]}
                            onPress={() => setActiveTab('Minor')}
                        >
                            <Text style={[styles.tabText, activeTab === 'Minor' && styles.activeTabText]}>
                                MINOR {isMinorDone && '✓'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!isLocked && currentQs.length > 0 && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
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
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                    />
                }
            >
                {Array.isArray(currentQs) && currentQs.length > 0 ? (
                    currentQs.map(renderQuestion)
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="information-circle-outline" size={48} color="#94a3b8" />
                        <Text style={styles.emptyText}>No questions available for this selection.</Text>
                    </View>
                )}

                {guidedBtns && (
                    <View style={styles.guidedBox}>
                        {guidedBtns === 'TO_MAJOR' && (
                            <TouchableOpacity style={styles.guideBtn} onPress={() => { setActiveTab('Major'); setGuidedBtns(null); }}>
                                <Text style={styles.guideBtnText}>Continue to Major</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                        {guidedBtns === 'TO_MINOR' && (
                            <TouchableOpacity style={styles.guideBtn} onPress={() => { setActiveTab('Minor'); setGuidedBtns(null); }}>
                                <Text style={styles.guideBtnText}>Continue to Minor</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                        {guidedBtns === 'TO_NEXT' && (
                            <TouchableOpacity style={[styles.guideBtn, { backgroundColor: '#10b981' }]} onPress={() => {
                                const nextIndex = currentIndex + 1;
                                if (subcategories && nextIndex < subcategories.length) {
                                    const nextArea = subcategories[nextIndex];
                                    navigation.replace('CommissionaryQuestions', {
                                        ...params,
                                        subcategory_id: nextArea.id,
                                        subcategoryId: nextArea.id,
                                        subcategoryName: nextArea.name,
                                        currentIndex: nextIndex
                                    });
                                } else {
                                    navigation.navigate('CommissionaryDashboard', { ...route.params });
                                }
                            }}>
                                <Text style={styles.guideBtnText}>Go to Next Area</Text>
                                <Ionicons name="apps-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>

            <View style={styles.stickyFooter}>
                <View style={styles.bottomButtons}>
                    <TouchableOpacity
                        style={[styles.checkpointBtn, isLocked && styles.disabledBtn]}
                        onPress={async () => {
                            try {
                                setSaving(true);
                                await saveInspectionCheckpoint({
                                    ...answerContext,
                                    answers: (await Promise.all(Object.entries(answersMap).map(async ([key, data]) => {
                                        const segments = key.split('_');
                                        const rawId = data.question_id || segments[2];
                                        const parsedId = parseInt(rawId, 10);
                                        
                                        let finalPhotoUrl = data.photo_url || data.image_path || null;
                                        if (finalPhotoUrl && (finalPhotoUrl.startsWith('file://') || finalPhotoUrl.startsWith('content://'))) {
                                            try {
                                                const { uploadPhoto } = require('../api/api');
                                                const uploaded = await uploadPhoto(finalPhotoUrl);
                                                if (uploaded) {
                                                    finalPhotoUrl = uploaded;
                                                    setAnswersMap(prev => ({ ...prev, [key]: { ...prev[key], photo_url: uploaded } }));
                                                }
                                            } catch (e) {
                                                console.warn('[Floating Save] Photo upload failed:', e);
                                            }
                                        }

                                        return {
                                            ...answerContext,
                                            ...data,
                                            photo_url: finalPhotoUrl,
                                            activity_type: data.activity_type || answerContext.activity_type, 
                                            question_id: isNaN(parsedId) ? null : parsedId
                                        };
                                    }))).filter(ans => ans.question_id !== null)
                                });
                                await refreshProgress();
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
                        style={[styles.saveBtn, isLocked && { backgroundColor: '#f1f5f9' }, saving && { opacity: 0.7 }]}
                        onPress={btnAction}
                        disabled={saving || isLocked}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={[styles.saveBtnText, isLocked && { color: '#94a3b8' }]}>
                                {btnText}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {pendingDefectsCount > 0 && (
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: '#ef4444', marginTop: 10 }]}
                            onPress={() => navigation.navigate('Defects', {
                                session_id: sessionId,
                                module_type: moduleType,
                                coach_number: coachNumber,
                                category_name: categoryName
                            })}
                        >
                            <Text style={styles.saveBtnText}>RESOLVE PENDING DEFECTS ({pendingDefectsCount})</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    stickyHeader: {
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        elevation: 4,
        zIndex: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 5,
        justifyContent: 'space-between',
    },
    headerIconBtn: {
        padding: 8,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    stickyFooter: {
        backgroundColor: COLORS.surface,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        elevation: 10,
    },
    breadcrumbsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    breadcrumbsScroll: {
        alignItems: 'center',
        paddingRight: 20,
    },
    breadcrumb: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    activeBreadcrumb: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    separator: {
        fontSize: 12,
        color: '#cbd5e1',
        marginHorizontal: 6,
    },
    headerFeedback: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerSub: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
    scroll: { padding: 16, paddingBottom: 200 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
    emptyText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
    bottomButtonsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        borderColor: COLORS.border,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5
    },
    bottomButtons: { gap: 10, marginTop: 20 },
    saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, elevation: 4 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    checkpointBtn: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
    checkpointBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    disabledBtn: { backgroundColor: COLORS.border, opacity: 0.6 },
    saveIndicator: { marginLeft: 10, flexDirection: 'row', alignItems: 'center' },
    savingText: { color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 11 },
    savedText: { color: COLORS.success, fontWeight: 'bold', fontSize: 11 },
    errorText: { color: COLORS.error, fontWeight: 'bold', fontSize: 11 },
    tabBar: { 
        flexDirection: 'row', 
        backgroundColor: '#f1f5f9', 
        marginHorizontal: 16, 
        marginVertical: 8,
        borderRadius: 12, 
        padding: 4, 
        borderWidth: 1, 
        borderColor: COLORS.border 
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: COLORS.primary, elevation: 2 },
    tabText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
    activeTabText: { color: '#fff' },
    scroll: { padding: 16, paddingBottom: 30 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, flex: 1 },
    emptyText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
    saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    bottomButtons: { gap: 12 },
    checkpointBtn: { backgroundColor: '#F59E0B', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
    checkpointBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    disabledBtn: { backgroundColor: COLORS.border, opacity: 0.6 },
    guidedBox: { marginTop: 10, marginBottom: 20, padding: 16, backgroundColor: COLORS.surface, borderRadius: 16, borderLeftWidth: 5, borderLeftColor: COLORS.primary, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
    guideBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 10 },
    guideBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    defectsHeaderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220, 38, 38, 0.08)', marginHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.danger, marginBottom: 10, gap: 8 },
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
    submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: 'bold' }
});

export default React.memo(CommissionaryQuestionsScreen);
