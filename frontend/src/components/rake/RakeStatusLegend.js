import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../config/theme';

const items = [
    { color: '#D1FAE5', border: '#6EE7B7', label: 'Complete' },
    { color: '#FEF3C7', border: '#FCD34D', label: 'In Progress' },
    { color: '#FEE2E2', border: '#FCA5A5', label: 'Defect' },
    { color: '#F3F4F6', border: '#D1D5DB', label: 'Not Started' },
];

const RakeStatusLegend = memo(() => (
    <View style={styles.row}>
        {items.map(item => (
            <View key={item.label} style={styles.item}>
                <View style={[styles.dot, { backgroundColor: item.color, borderColor: item.border }]} />
                <Text style={styles.label}>{item.label}</Text>
            </View>
        ))}
    </View>
));

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1.5,
    },
    label: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
});

export default RakeStatusLegend;
