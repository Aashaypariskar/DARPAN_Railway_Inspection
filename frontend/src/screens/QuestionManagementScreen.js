import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/StoreContext';
import api, { getQuestionsByActivity, createQuestion, updateQuestion, deleteQuestion, getReasonsByQuestion, createReason, deleteReason } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const QuestionManagementScreen = ({ route, navigation }) => {
    const { user } = useStore();
    const canManageAssets = user?.role === 'Admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'SuperAdmin';
    const {
        activityId,
        activityType,
        categoryName: _categoryName,
        category_name,
        subcategoryId,
        subcategory_id,
        scheduleId: _scheduleId,
        schedule_id,
        coachId
    } = route.params;

    // Normalise both snake_case and camelCase param variants
    const categoryName = _categoryName || category_name;
    const subcategoryIdResolved = subcategoryId || subcategory_id;
    const scheduleId = _scheduleId || schedule_id;

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null); // null = adding new
    const [questionText, setQuestionText] = useState('');
    const [answerType, setAnswerType] = useState('BOOLEAN');
    const [unit, setUnit] = useState('');
    const [specifiedValue, setSpecifiedValue] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reason Management State (inside modal)
    const [questionReasons, setQuestionReasons] = useState([]);
    const [loadingReasons, setLoadingReasons] = useState(false);
    const [newReasonText, setNewReasonText] = useState('');
    const [addingReason, setAddingReason] = useState(false);

    const fetchQuestions = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);
            let data = [];

            if (categoryName === 'Coach Commissionary' || categoryName === 'Undergear') {
                const res = await api.get('/commissionary/questions', {
                    params: {
                        subcategory_id: subcategoryIdResolved,
                        activity_type: activityType,
                        categoryName: categoryName
                    }
                });
                data = res.data.groups ? res.data.groups.flatMap(g => g.questions || []) : (Array.isArray(res.data) ? res.data : (res.data.questions || []));
            } else if (categoryName === 'Sick Line Examination' || route.params.module_type === 'SICKLINE') {
                const res = await getQuestionsByActivity(activityId || null, 'SICKLINE', subcategoryIdResolved, null, categoryName);
                data = res?.questions || [];
            } else if (categoryName === 'WSP Examination' || route.params.module_type === 'WSP') {
                const res = await getQuestionsByActivity(activityId || null, 'WSP', null, scheduleId, categoryName);
                data = res?.questions || [];
            } else {
                const res = await getQuestionsByActivity(activityId, null, null, null, categoryName);
                data = res?.questions || res || [];
            }

            setQuestions(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch questions');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchQuestions();
        }, [activityId, subcategoryIdResolved, scheduleId, categoryName])
    );

    const onRefresh = () => {
        fetchQuestions(true);
    };

    const fetchReasons = async (questionId) => {
        try {
            setLoadingReasons(true);
            const data = await getReasonsByQuestion(questionId);
            // Handle both array response and { reasons: [] } object response
            const reasons = data?.reasons || data || [];
            setQuestionReasons(Array.isArray(reasons) ? reasons : []);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to fetch reasons');
        } finally {
            setLoadingReasons(false);
        }
    };

    const openAddModal = () => {
        setEditingQuestion(null);
        setQuestionText('');
        setAnswerType('BOOLEAN');
        setUnit('');
        setSpecifiedValue('');
        setQuestionReasons([]);
        setModalVisible(true);
    };

    const openEditModal = (question) => {
        setEditingQuestion(question);
        setQuestionText(question.text);
        setAnswerType(question.answer_type || 'BOOLEAN');
        setUnit(question.unit || '');
        setSpecifiedValue(question.specified_value || '');
        setQuestionReasons([]); // Clear prev
        setModalVisible(true);
        fetchReasons(question.id);
    };

    const handleSaveQuestion = async () => {
        if (!questionText.trim()) {
            Alert.alert('Validation Error', 'Question text cannot be empty');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                text: questionText.trim(),
                answer_type: answerType,
                unit: answerType === 'VALUE' ? unit.trim() : null,
                specified_value: specifiedValue.trim() || null
            };

            if (editingQuestion) {
                // Update
                const response = await updateQuestion(editingQuestion.id, payload);
                const updated = response.question;
                // Update local list
                setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
                Alert.alert('Success', 'Question updated successfully');
            } else {
                // Create
                const params = {
                    ...payload,
                    activity_id: activityId !== 'NA' ? activityId : null,
                };
                if (categoryName === 'Sick Line Examination') {
                    params.section_code = 'SS1-C';
                    params.item_name = 'General'; // Default
                }

                const response = await createQuestion(params);
                const created = response.question;
                setQuestions(prev => [...prev, created]);
                Alert.alert('Success', 'Question created. You can now edit it to add reasons.');
                setModalVisible(false); // Close on create
            }
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to save question');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddReason = async () => {
        if (!newReasonText.trim()) return;
        if (!editingQuestion) return; // Should not happen if UI is correct

        setAddingReason(true);
        try {
            const added = await createReason({
                question_id: editingQuestion.id,
                text: newReasonText.trim()
            });
            setQuestionReasons(prev => [...prev, added]);
            setNewReasonText('');
        } catch (err) {
            Alert.alert('Error', 'Failed to add reason');
        } finally {
            setAddingReason(false);
        }
    };

    const handleDeleteReason = async (reasonId) => {
        Alert.alert('Confirm Delete', 'Delete this reason?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteReason(reasonId);
                        setQuestionReasons(prev => prev.filter(r => r.id !== reasonId));
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete reason');
                    }
                }
            }
        ]);
    };

    const handleDeleteQuestion = (id) => {
        Alert.alert('Confirm Delete', 'Delete this question and all its reasons?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteQuestion(id);
                        setQuestions(prev => prev.filter(q => q.id !== id));
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete question');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item, index }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardNumber}>Q{index + 1}</Text>
                {canManageAssets && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.editBtn]}
                            onPress={() => openEditModal(item)}
                        >
                            <Text style={styles.editBtnText}>Edit / Reasons</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.deleteBtn]}
                            onPress={() => handleDeleteQuestion(item.id)}
                        >
                            <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            <Text style={styles.cardText}>{item.text}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader
                title="Question Bank"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.headerInfo}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>{categoryName} - {activityType}</Text>
                    <Text style={styles.count}>{questions.length} Questions</Text>
                </View>
                {canManageAssets && (
                    <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                        <Text style={styles.addBtnText}>+ Add New</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={questions}
                    keyExtractor={(item, index) => (item?.id || index).toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#2563eb']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No questions found</Text>
                            <Text style={styles.emptySub}>Tap "Add Question" to create one</Text>
                        </View>
                    }
                />
            )}

            {/* Edit/Add Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingQuestion ? 'Edit Question' : 'Add New Question'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Text style={styles.closeText}>Close</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Question Text:</Text>
                            <TextInput
                                style={styles.questionInput}
                                value={questionText}
                                onChangeText={setQuestionText}
                                multiline
                                placeholder="Enter question text..."
                                placeholderTextColor={COLORS.placeholder}
                            />

                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSaveQuestion}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingQuestion ? 'Update' : 'Save Question'}</Text>}
                            </TouchableOpacity>

                            <Text style={styles.label}>Answer Type:</Text>
                            <View style={styles.tabRow}>
                                <TouchableOpacity
                                    style={[styles.tab, answerType === 'BOOLEAN' && styles.activeTab]}
                                    onPress={() => setAnswerType('BOOLEAN')}
                                >
                                    <Text style={[styles.tabText, answerType === 'BOOLEAN' && styles.activeTabText]}>Toggle (OK/DEF)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, answerType === 'VALUE' && styles.activeTab]}
                                    onPress={() => setAnswerType('VALUE')}
                                >
                                    <Text style={[styles.tabText, answerType === 'VALUE' && styles.activeTabText]}>Value Input</Text>
                                </TouchableOpacity>
                            </View>

                            {answerType === 'VALUE' && (
                                <View>
                                    <Text style={styles.label}>Measurement Unit:</Text>
                                    <TextInput
                                        style={[styles.input, { color: COLORS.textPrimary }]}
                                        value={unit}
                                        onChangeText={setUnit}
                                        placeholder="e.g. mm, Volts, Amps"
                                        placeholderTextColor={COLORS.placeholder}
                                    />
                                </View>
                            )}

                            <Text style={styles.label}>Specified Value (Optional Reference):</Text>
                            <TextInput
                                style={[styles.input, { color: COLORS.textPrimary }]}
                                value={specifiedValue}
                                onChangeText={setSpecifiedValue}
                                placeholder="e.g. 5.5mm or 230V"
                                placeholderTextColor={COLORS.placeholder}
                            />

                            {/* Reasons Section - Only visible when editing existing question */}
                            {editingQuestion && (
                                <View style={styles.reasonsSection}>
                                    <View style={styles.divider} />
                                    <Text style={styles.sectionTitle}>Reasons (for "No" answer)</Text>

                                    {loadingReasons ? (
                                        <ActivityIndicator color="#2563eb" style={{ marginVertical: 10 }} />
                                    ) : (
                                        <View>
                                            {questionReasons.map((reason, idx) => (
                                                <View key={reason.id} style={styles.reasonItem}>
                                                    <Text style={styles.reasonText}>{idx + 1}. {reason.text}</Text>
                                                    <TouchableOpacity onPress={() => handleDeleteReason(reason.id)}>
                                                        <Text style={styles.removeText}>Remove</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                            {questionReasons.length === 0 && <Text style={styles.noReasonsText}>No reasons added yet.</Text>}
                                        </View>
                                    )}

                                    <View style={styles.addReasonContainer}>
                                        <TextInput
                                            style={styles.reasonInput}
                                            value={newReasonText}
                                            onChangeText={setNewReasonText}
                                            placeholder="New reason..."
                                            placeholderTextColor={COLORS.placeholder}
                                        />
                                        <TouchableOpacity
                                            style={styles.addReasonBtn}
                                            onPress={handleAddReason}
                                            disabled={addingReason || !newReasonText.trim()}
                                        >
                                            {addingReason ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addReasonBtnText}>Add</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitleContainer: { flex: 1, marginRight: 10 },
    title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, flexWrap: 'wrap' },
    count: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    addBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    list: { padding: 16 },
    card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardNumber: { fontWeight: 'bold', color: COLORS.primary, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12 },
    cardActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
    editBtn: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' },
    editBtnText: { color: '#0284C7', fontSize: 12, fontWeight: '600' },
    deleteBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECDD3' },
    deleteBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
    cardText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, fontWeight: 'bold', color: COLORS.textSecondary },
    emptySub: { color: '#94A3B8', marginTop: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, maxHeight: '85%', elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
    closeText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
    label: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
    questionInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 16, minHeight: 90, textAlignVertical: 'top', marginBottom: 16, color: COLORS.textPrimary },
    saveBtn: { backgroundColor: COLORS.secondary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

    // Reasons Section
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
    reasonsSection: { flex: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
    reasonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    reasonText: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
    removeText: { color: COLORS.danger, fontSize: 12, fontWeight: '600', marginLeft: 10 },
    noReasonsText: { color: COLORS.textSecondary, fontStyle: 'italic', marginVertical: 8 },
    addReasonContainer: { flexDirection: 'row', marginTop: 20, gap: 10 },
    reasonInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
    addReasonBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
    addReasonBtnText: { color: '#fff', fontWeight: 'bold' },
    tabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: COLORS.primary },
    tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
    activeTabText: { color: '#fff' },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 20, color: COLORS.textPrimary }
});

export default QuestionManagementScreen;
