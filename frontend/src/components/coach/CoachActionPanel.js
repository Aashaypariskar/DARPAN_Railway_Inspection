import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../config/theme';

const ActionButton = memo(({ icon, label, onPress, variant = 'default' }) => {
    const isPrimary = variant === 'primary';
    const isDanger = variant === 'danger';

    return (
        <TouchableOpacity
            style={[styles.btn, isPrimary && styles.btnPrimary, isDanger && styles.btnDanger]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <MaterialCommunityIcons
                name={icon}
                size={20}
                color={isPrimary ? '#fff' : isDanger ? '#EF4444' : COLORS.textPrimary}
            />
            <Text style={[
                styles.btnLabel,
                isPrimary && styles.btnLabelPrimary,
                isDanger && styles.btnLabelDanger,
            ]}>
                {label}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={isPrimary ? 'rgba(255,255,255,0.6)' : COLORS.placeholder} />
        </TouchableOpacity>
    );
});

const CoachActionPanel = memo(({ coach, defectCount = 0, onStartInspection, onViewDefects }) => {
    if (!coach) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Actions</Text>
            <View style={styles.grid}>
                <ActionButton
                    icon="clipboard-check-outline"
                    label="Start Inspection"
                    variant="primary"
                    onPress={onStartInspection}
                />
                {/* Only show View Defects when defects exist */}
                {defectCount > 0 && (
                    <ActionButton
                        icon="alert-circle-outline"
                        label={`View Defects (${defectCount})`}
                        variant="danger"
                        onPress={onViewDefects}
                    />
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: SPACING.lg,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    grid: { gap: SPACING.sm },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        backgroundColor: '#F9FAFB',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    btnPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    btnDanger: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
    btnLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
    btnLabelPrimary: { color: '#fff' },
    btnLabelDanger: { color: '#DC2626' },
});

export default CoachActionPanel;
