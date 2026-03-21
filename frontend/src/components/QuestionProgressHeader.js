import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const QuestionProgressHeader = ({ totalQuestions, answeredCount }) => {
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Text style={styles.text}>{answeredCount} of {totalQuestions} answered</Text>
                <Text style={styles.percent}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${progress}%` }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    percent: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    barBg: {
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: '#2563eb',
        borderRadius: 3,
    },
});

export default QuestionProgressHeader;
