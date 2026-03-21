import React, { memo, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CoachItem from './CoachItem';
import { COLORS, SPACING, RADIUS } from '../../config/theme';

const ENGINE_ITEM = { id: '__engine__', type: 'engine' };

const HorizontalRake = memo(({
    coaches,
    activeCoachId,
    completionMap = {},   // { coachId: completion% }
    defectMap = {},       // { coachId: defectCount }
    onCoachSelect,
    onCoachDelete,
}) => {
    const listRef = useRef(null);

    // Prepend engine to the data list
    const data = [ENGINE_ITEM, ...coaches];

    const renderEngine = () => (
        <View style={styles.engineOuter}>
            {/* Main locomotive body */}
            <View style={styles.engineBody}>
                {/* Roof strip */}
                <View style={styles.engineRoof} />

                {/* 5px dark front edge for direction clarity */}
                <View style={styles.engineFrontPanel} />

                {/* Windshields — top left */}
                <View style={styles.windshieldRow}>
                    <View style={styles.windshield} />
                    <View style={styles.windshield} />
                </View>

                {/* Mid-body stripe */}
                <View style={styles.bodyStripe} />

                {/* Headlight — front left */}
                <View style={styles.headlight} />
            </View>

            {/* Wheels — same baseline as coaches */}
            <View style={styles.engineWheelRow}>
                <View style={styles.engineWheel} />
                <View style={styles.engineWheel} />
                <View style={styles.engineWheel} />
            </View>
        </View>
    );

    const renderItem = useCallback(({ item, index }) => {
        if (item.type === 'engine') return renderEngine();
        const realIndex = index - 1; // subtract engine
        return (
            <CoachItem
                coach={item}
                index={realIndex}
                isActive={item.id === activeCoachId}
                completion={completionMap[item.id] || 0}
                defectCount={defectMap[item.id] || 0}
                onSelect={onCoachSelect}
                onDelete={onCoachDelete}
            />
        );
    }, [activeCoachId, completionMap, defectMap, onCoachSelect, onCoachDelete]);

    const keyExtractor = useCallback((item) => item.id?.toString() ?? '__engine__', []);

    return (
        <View style={styles.container}>
            {/* Track line */}
            <View style={styles.trackLine} />

            <FlatList
                ref={listRef}
                data={data}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={styles.content}
                removeClippedSubviews={false}
                initialNumToRender={8}
                maxToRenderPerBatch={4}
                getItemLayout={(_, index) => ({ length: 102, offset: 102 * index, index })}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginTop: 16,
        paddingTop: 8,
        paddingBottom: 12,
        overflow: 'visible',
    },
    trackLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 26,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
    },
    content: {
        paddingHorizontal: SPACING.md,
        paddingBottom: 12,
        paddingTop: 4,
        alignItems: 'flex-end',
    },
    /* ENGINE STYLES */
    engineOuter: {
        alignItems: 'center',
        marginHorizontal: 6,
        marginBottom: 10,
    },
    engineBody: {
        width: 92,             // 1.15 × coach width (80)
        height: 88,            // identical to coach height
        backgroundColor: '#1E3A5F',
        borderRadius: 8,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    engineRoof: {
        width: '100%',
        height: 9,
        backgroundColor: '#152D4A',
    },
    // 5px dark front panel for direction clarity
    engineFrontPanel: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
        backgroundColor: '#0F1F35',
    },
    windshieldRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 8,
        marginLeft: 8,    // closer to front
    },
    windshield: {
        width: 12,
        height: 8,
        backgroundColor: '#BAE6FD',
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#7DD3FC',
    },
    bodyStripe: {
        position: 'absolute',
        top: 42,          // slightly above center
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#2563EB',
    },
    headlight: {
        position: 'absolute',
        left: 6,
        top: '42%',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FCD34D',
    },
    engineWheelRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: 74,        // matches body width footprint
        marginTop: 2,
    },
    engineWheel: {
        width: 14,        // same as coach wheels
        height: 14,
        borderRadius: 7,
        backgroundColor: '#374151',
        borderWidth: 2,
        borderColor: '#6B7280',
    },
});

export default HorizontalRake;
