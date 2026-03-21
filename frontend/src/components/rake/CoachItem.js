import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../config/theme';

const STATUS_COLORS = {
    defect: { bg: '#FEE2E2', roof: '#FCA5A5', border: '#F87171' },
    complete: { bg: '#D1FAE5', roof: '#6EE7B7', border: '#34D399' },
    inProgress: { bg: '#FEF3C7', roof: '#FCD34D', border: '#FBBF24' },
    idle: { bg: '#F3F4F6', roof: '#D1D5DB', border: '#9CA3AF' },
};

const CoachItem = memo(({ coach, index, isActive, completion = 0, defectCount = 0, onSelect, onDelete }) => {
    const status =
        defectCount > 0 ? STATUS_COLORS.defect :
            completion >= 100 ? STATUS_COLORS.complete :
                completion > 0 ? STATUS_COLORS.inProgress :
                    STATUS_COLORS.idle;

    return (
        <View style={styles.outerWrapper}>
            {/* Delete button */}
            {onDelete && (
                <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => onDelete(coach.id)}
                    hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                >
                    <MaterialCommunityIcons name="close-circle" size={16} color="#EF4444" />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={[
                    styles.coach,
                    { backgroundColor: status.bg, borderColor: isActive ? COLORS.primary : status.border },
                    isActive && styles.activeCoach,
                ]}
                onPress={() => onSelect(coach)}
                activeOpacity={0.75}
            >
                {/* Roof strip */}
                <View style={[styles.roof, { backgroundColor: isActive ? COLORS.primary : status.roof }]} />

                {/* Windows row */}
                <View style={styles.windowRow}>
                    {[0, 1, 2, 3].map(i => (
                        <View key={i} style={[styles.window, isActive && { borderColor: COLORS.primary }]} />
                    ))}
                </View>

                {/* Coach label — show name (B1, GEN1) falling back to number */}
                <Text style={[styles.coachNum, isActive && { color: COLORS.primary }]} numberOfLines={1}>
                    {coach.coach_name || coach.coach_number}
                </Text>

                {/* Defect badge */}
                {defectCount > 0 && (
                    <View style={styles.defectBadge}>
                        <Text style={styles.defectText}>{defectCount}</Text>
                    </View>
                )}

                {/* Underframe panel */}
                <View style={styles.underframe} />
            </TouchableOpacity>

            {/* Wheels */}
            <View style={styles.wheelRow}>
                <View style={[styles.wheel, isActive && { borderColor: COLORS.primary }]} />
                <View style={[styles.wheel, isActive && { borderColor: COLORS.primary }]} />
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    outerWrapper: {
        alignItems: 'center',
        marginHorizontal: 6,
        marginBottom: 10,
        position: 'relative',
    },
    coach: {
        width: 80,
        height: 88,
        borderRadius: 8,
        borderWidth: 2,
        overflow: 'visible',
        position: 'relative',
    },
    activeCoach: {
        borderWidth: 2.5,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 8,
        zIndex: 2,
    },
    roof: {
        height: 8,
        width: '100%',
    },
    windowRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
        marginTop: 6,
        paddingHorizontal: 6,
    },
    window: {
        width: 12,
        height: 14,
        backgroundColor: 'rgba(186,230,253,0.7)',
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#93C5FD',
    },
    coachNum: {
        fontSize: 11,
        fontWeight: '700',
        color: '#374151',
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: 4,
    },
    underframe: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 10,
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    defectBadge: {
        position: 'absolute',
        top: 10,
        right: 4,
        backgroundColor: '#EF4444',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    defectText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
    delBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 3,
        zIndex: 10,
    },
    wheelRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: 64,
        marginTop: 2,
    },
    wheel: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#374151',
        borderWidth: 2,
        borderColor: '#6B7280',
    },
});

export default CoachItem;
