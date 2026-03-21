import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCaiQuestions, addCaiQuestion, updateCaiQuestion } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const EditCaiQuestionsScreen = ({ navigation }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);

    // Form state
    const [caiCode, setCaiCode] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const data = await getCaiQuestions();
            setQuestions(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch CAI questions');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchQuestions();
        }, [])
    );

    const handleOpenModal = (q = null) => {
        if (q) {
            setEditingQuestion(q);
            setCaiCode(q.cai_code);
            setQuestionText(q.question_text);
            setIsActive(q.is_active);
        } else {
            setEditingQuestion(null);
            setCaiCode('');
            setQuestionText('');
            setIsActive(true);
        }
        setIsModalVisible(true);
    };

    const handleSubmit = async () => {
        if (!caiCode.trim() || !questionText.trim()) {
            return Alert.alert('Error', 'All fields are required');
        }

        try {
            setSubmitting(true);
            if (editingQuestion) {
                await updateCaiQuestion({
                    id: editingQuestion.id,
                    cai_code: caiCode.trim(),
                    question_text: questionText.trim(),
                    is_active: isActive
                });
            } else {
                await addCaiQuestion({
                    cai_code: caiCode.trim(),
                    question_text: questionText.trim()
                });
            }
            setIsModalVisible(false);
            fetchQuestions();
            Alert.alert('Success', `Question ${editingQuestion ? 'updated' : 'added'} successfully`);
        } catch (err) {
            Alert.alert('Error', 'Failed to save question');
        } finally {
            setSubmitting(false);
        }
    };

    const renderQuestion = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.caiCode}>{item.cai_code}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#ecfdf5' : '#fff1f2' }]}>
                    <Text style={[styles.statusText, { color: item.is_active ? '#10b981' : '#f43f5e' }]}>
                        {item.is_active ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>
            <Text style={styles.questionText}>{item.question_text}</Text>
            <TouchableOpacity
                style={styles.editBtn}
                onPress={() => handleOpenModal(item)}
            >
                <Ionicons name="create-outline" size={18} color="#8b5cf6" />
                <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="CAI Question Bank"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.headerInfo}>
                <View>
                    <Text style={styles.title}>Modification Checks</Text>
                    <Text style={styles.subtitle}>{questions.length} Active Records</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenModal()}>
                    <Text style={styles.addBtnText}>+ Add New</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={questions}
                keyExtractor={item => item.id.toString()}
                renderItem={renderQuestion}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>No CAI questions found.</Text>}
            />

            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingQuestion ? 'Edit Question' : 'Add New Question'}</Text>

                        <Text style={styles.label}>CAI Code</Text>
                        <TextInput
                            style={[styles.input, { color: COLORS.textPrimary }]}
                            placeholder="e.g. CAI-001"
                            value={caiCode}
                            onChangeText={setCaiCode}
                            placeholderTextColor={COLORS.placeholder}
                        />

                        <Text style={styles.label}>Question Text</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe the modification check..."
                            value={questionText}
                            onChangeText={setQuestionText}
                            multiline
                            placeholderTextColor={COLORS.placeholder}
                        />

                        <View style={styles.switchRow}>
                            <Text style={styles.label}>Is Active</Text>
                            <TouchableOpacity onPress={() => setIsActive(!isActive)}>
                                <Ionicons
                                    name={isActive ? "checkbox" : "square-outline"}
                                    size={24}
                                    color={isActive ? "#8b5cf6" : "#cbd5e1"}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            <Text style={styles.submitBtnText}>{editingQuestion ? 'Update' : 'Add'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },
    subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    addBtn: { backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, elevation: 2 },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    list: { padding: 16, paddingTop: 0 },
    card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
    caiCode: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    questionText: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 15, lineHeight: 20 },
    editBtn: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
    editBtnText: { color: COLORS.primary, fontWeight: 'bold', marginLeft: 6, fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, elevation: 10 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
    input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20, color: COLORS.textPrimary },
    textArea: { height: 110, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    submitBtn: { backgroundColor: COLORS.secondary, padding: 18, borderRadius: 12, alignItems: 'center', elevation: 2 },
    submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
    cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    empty: { textAlign: 'center', marginTop: 80, color: COLORS.textSecondary, fontSize: 16 }
});

export default EditCaiQuestionsScreen;
