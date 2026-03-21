import React, { memo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Modal, TextInput, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../config/theme';

/** Exactly 6 numeric digits — e.g. 123456 */
const COACH_NUM_REGEX = /^[0-9]{6}$/;

const CoachHeaderCard = memo(({ coach, completion = 0, defectCount = 0, position, onUpdateCoach }) => {
    const [editVisible, setEditVisible] = useState(false);
    const [editNumber, setEditNumber] = useState('');
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

    if (!coach) {
        return (
            <View style={styles.placeholder}>
                <MaterialCommunityIcons name="train-car" size={40} color={COLORS.placeholder} />
                <Text style={styles.placeholderText}>Select a coach above to view details</Text>
            </View>
        );
    }

    const completionColor =
        defectCount > 0 ? COLORS.danger :
            completion >= 100 ? COLORS.success :
                completion > 0 ? COLORS.warning : COLORS.textSecondary;

    // ── Open edit modal ──────────────────────────────────────────────────
    const openEdit = () => {
        setEditNumber(coach.coach_number || '');
        setEditError('');
        setEditVisible(true);
    };

    // ── Validate + save ──────────────────────────────────────────────────
    const handleSave = async () => {
        const trimmed = editNumber.trim().toUpperCase();

        if (!trimmed || !COACH_NUM_REGEX.test(trimmed)) {
            setEditError('Coach number must be exactly 6 digits (e.g. 123456).');
            return;
        }

        setSaving(true);
        setEditError('');
        try {
            await onUpdateCoach(coach.id, { coach_number: trimmed });
            setEditVisible(false);
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to update coach.';
            setEditError(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.card}>
            {/* Header row */}
            <View style={styles.headerRow}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="train-car" size={28} color={COLORS.primary} />
                </View>

                <View style={styles.titleGroup}>
                    {/* Primary: coach name (B1, GEN1, EOG1 etc.) */}
                    <View style={styles.numRow}>
                        <Text style={styles.coachNum}>
                            {coach.coach_name || coach.coach_number}
                        </Text>
                        {onUpdateCoach && (
                            <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
                                <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.secondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {/* Secondary: the 6-digit unique coach number */}
                    <Text style={styles.coachNoLabel}>
                        Coach No: <Text style={styles.coachNoValue}>{coach.coach_number}</Text>
                    </Text>
                    {position != null && (
                        <Text style={styles.position}>Position: {position} in rake</Text>
                    )}
                </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: completionColor }]}>
                        {completion}%
                    </Text>
                    <Text style={styles.statLabel}>Completion</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: defectCount > 0 ? COLORS.danger : COLORS.success }]}>
                        {defectCount}
                    </Text>
                    <Text style={styles.statLabel}>Defects</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>
                        {completion >= 100 ? 'Done' : completion > 0 ? 'Active' : 'Pending'}
                    </Text>
                    <Text style={styles.statLabel}>Status</Text>
                </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                    width: `${Math.min(completion, 100)}%`,
                    backgroundColor: completionColor
                }]} />
            </View>

            {/* ── Edit Coach Number Modal ──────────────────────────────────────── */}
            <Modal
                visible={editVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEditVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <View style={styles.modalBox}>
                            {/* Title row */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit Coach Number</Text>
                                <TouchableOpacity onPress={() => setEditVisible(false)}>
                                    <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalSub}>
                                Editing 6-digit Coach Number for: <Text style={{ fontWeight: '700' }}>{coach.coach_name || coach.coach_number}</Text>
                            </Text>

                            {/* Input */}
                            <Text style={styles.inputLabel}>New Coach Number</Text>
                            <TextInput
                                style={[styles.input, editError ? styles.inputError : null]}
                                value={editNumber}
                                onChangeText={t => { setEditNumber(t.replace(/[^0-9]/g, '')); setEditError(''); }}
                                placeholder="6-digit number (e.g. 123456)"
                                placeholderTextColor={COLORS.placeholder}
                                keyboardType="numeric"
                                autoFocus
                                maxLength={6}
                            />
                            {editError ? (
                                <Text style={styles.errorText}>{editError}</Text>
                            ) : null}

                            <Text style={styles.hintText}>Enter exactly 6 digits — must be unique in this train.</Text>

                            {/* Actions */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.cancelBtn]}
                                    onPress={() => setEditVisible(false)}
                                    disabled={saving}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.saveBtn, saving && { opacity: 0.7 }]}
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    {saving
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={styles.saveBtnText}>Save</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: SPACING.lg,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        gap: SPACING.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.md,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleGroup: { flex: 1 },

    // Coach label row
    numRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    coachNum: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
    editBtn: {
        padding: 4,
        borderRadius: 6,
        backgroundColor: COLORS.primaryLight,
    },

    // Secondary labels
    coachNoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    coachNoValue: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    position: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
    },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
    divider: { width: 1, height: 32, backgroundColor: COLORS.border },

    // Progress bar
    progressBg: {
        height: 6,
        backgroundColor: COLORS.mutedLight,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },

    // Empty state
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl * 2,
        marginHorizontal: SPACING.md,
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        marginTop: SPACING.sm,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: COLORS.border,
    },
    placeholderText: {
        color: COLORS.placeholder,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: SPACING.xl,
    },

    // ── Edit Modal ───────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    modalBox: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        width: '100%',
        minWidth: 300,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    modalSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: 16,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        letterSpacing: 1,
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    errorText: {
        fontSize: 12,
        color: COLORS.danger,
        marginBottom: SPACING.xs,
    },
    hintText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: SPACING.sm,
    },
    modalBtn: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        minWidth: 80,
        alignItems: 'center',
    },
    cancelBtn: { backgroundColor: COLORS.disabled },
    cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
    saveBtn: { backgroundColor: COLORS.secondary },
    saveBtnText: { color: '#fff', fontWeight: '600' },
});

export default CoachHeaderCard;
