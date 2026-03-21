import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal, Alert, Image, ActivityIndicator } from 'react-native';
import { getReasonsByQuestion } from '../api/api';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS } from '../config/theme';

// This modal opens up when student/engineer selects "NO" as an answer
const NoReasonModal = ({ question, onDone, onCancel }) => {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReasons, setSelectedReasons] = useState([]);
    const [remarks, setRemarks] = useState('');
    const [image, setImage] = useState(null);
    const [error, setError] = useState('');

    React.useEffect(() => {
        fetchReasons();
    }, [question.id]);

    const fetchReasons = async () => {
        try {
            setLoading(true);
            const response = await getReasonsByQuestion(question.id);
            // Handle new structured response { success: true, reasons: [...] }
            const data = response.reasons || [];
            setReasons(data);
        } catch (err) {
            console.error('Fetch reasons error:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleReason = (reasonText) => {
        if (selectedReasons.includes(reasonText)) {
            setSelectedReasons(selectedReasons.filter(r => r !== reasonText));
        } else {
            setSelectedReasons([...selectedReasons, reasonText]);
            setError(''); // clear error if user picked something
        }
    };

    const pickImage = async () => {
        // Checking for camera permission first
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('No Access', 'We need camera permission to attach photo!');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,  // No crop screen
            quality: 0.65,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setError('');
        }
    };

    const handleDone = () => {
        // Simple validation
        if (selectedReasons.length === 0) {
            setError('Select at least one reason');
            return;
        }
        if (!image) {
            setError('Photo is mandatory for NO answers');
            return;
        }

        onDone({
            reasons: selectedReasons,
            remarks,
            image_path: image
        });
    };

    return (
        <Modal transparent visible animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.box}>
                    <Text style={styles.qText}>{question.text}</Text>

                    {error ? <Text style={styles.redText}>{error}</Text> : null}

                    <Text style={styles.label}>Select Reasons:</Text>
                    <View style={styles.row}>
                        {loading ? (
                            <ActivityIndicator size="small" color="#2563eb" />
                        ) : (
                            reasons.map(r => (
                                <TouchableOpacity
                                    key={r.id}
                                    style={[styles.tag, selectedReasons.includes(r.text) && styles.tagActive]}
                                    onPress={() => toggleReason(r.text)}
                                >
                                    <Text style={{ color: selectedReasons.includes(r.text) ? '#fff' : '#000' }}>{r.text}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                        {!loading && reasons.length === 0 && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.emptyText}>⚠️ No reasons configured.</Text>
                                <Text style={styles.contactAdmin}>Please contact Admin to add reasons.</Text>
                            </View>
                        )}
                    </View>

                    <TextInput
                        style={styles.textArea}
                        placeholder="Write remarks here..."
                        value={remarks}
                        onChangeText={setRemarks}
                        multiline
                    />

                    <View style={{ width: '100%', marginBottom: 12 }}>
                        <TouchableOpacity style={styles.camBtn} onPress={pickImage}>
                            <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>
                                {image ? '📷 Change Photo' : '📷 Take Photo'}
                            </Text>
                        </TouchableOpacity>
                        {image ? (
                            <View style={styles.imgContainer}>
                                <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
                            </View>
                        ) : (
                            <View style={styles.imgPlaceholder}>
                                <Text style={styles.imgPlaceholderText}>No photo uploaded</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.btns}>
                        <TouchableOpacity style={styles.btn1} onPress={onCancel}>
                            <Text>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn2, (reasons.length === 0 && !loading) && styles.btnDisabled]}
                            onPress={handleDone}
                            disabled={reasons.length === 0 && !loading}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
    box: { backgroundColor: '#fff', borderRadius: 10, padding: 20 },
    qText: { fontSize: 17, marginBottom: 20 },
    label: { fontWeight: 'bold', marginBottom: 10 },
    redText: { color: 'red', marginBottom: 10, fontSize: 13 },
    row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
    tag: { padding: 8, backgroundColor: '#eee', marginRight: 8, marginBottom: 8, borderRadius: 5 },
    tagActive: { backgroundColor: '#2563eb' },
    textArea: { height: 60, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 5, marginBottom: 15, textAlignVertical: 'top' },
    camBtn: { padding: 11, backgroundColor: COLORS.mutedLight, borderRadius: RADIUS.sm, width: '100%', alignItems: 'center', marginBottom: SPACING.sm },
    imgContainer: { width: '100%', borderRadius: RADIUS.sm, overflow: 'hidden', marginTop: 4 },
    img: { width: '100%', aspectRatio: 4 / 3 },
    imgPlaceholder: { height: 140, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
    imgPlaceholderText: { color: COLORS.textSecondary, fontSize: 12 },
    btns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    btn1: { padding: 12, marginRight: 10 },
    btn2: { backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 5 },
    btnDisabled: { backgroundColor: '#cbd5e1' },
    errorContainer: { padding: 10, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca', width: '100%', alignItems: 'center' },
    contactAdmin: { fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: '500' }
});

export default NoReasonModal;
