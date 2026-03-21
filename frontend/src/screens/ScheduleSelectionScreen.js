import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getLtrSchedules } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';

const ScheduleSelectionScreen = ({ route, navigation }) => {
    const params = route.params;
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setDraft } = useStore();

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        try {
            let data = [];
            if (params.categoryName === 'WSP Examination') {
                data = await getWspSchedules();
            } else {
                console.warn('Legacy flow hit for category:', params.categoryName);
            }
            setSchedules(data);
        } catch (err) {
            Alert.alert('Error', 'Could not fetch schedules');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (schedule) => {
        setDraft(prev => ({
            ...prev,
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            activity: null // No activity for Ltr
        }));

        navigation.navigate('QuestionsScreen', {
            ...params,
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            activityId: null,
            activityType: schedule.name // Map to activityType for header breadcrumbs
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.pills}>
                <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coachNumber}</Text></View>
                <View style={[styles.pill, styles.activePill]}><Text style={[styles.pillText, { color: '#fff' }]}>{params.categoryName}</Text></View>
            </View>

            <Text style={styles.title}>Select Schedule</Text>
            <Text style={styles.subtitle}>Choose the inspection schedule to proceed</Text>

            <FlatList
                data={schedules}
                keyExtractor={(item, index) => (item?.id || index).toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.scheduleCard}
                        onPress={() => handleSelect(item)}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.scheduleName}>{item.name}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                        </View>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    pills: { flexDirection: 'row', marginBottom: 20 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8 },
    activePill: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginBottom: 30 },
    list: { paddingBottom: 20 },
    scheduleCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    scheduleName: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default ScheduleSelectionScreen;
