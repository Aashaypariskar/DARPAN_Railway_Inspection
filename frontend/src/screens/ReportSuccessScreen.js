import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ReportSuccessScreen = ({ route, navigation }) => {
    const params = route.params || {};

    const handleInspectAnother = () => {
        navigation.replace('CompartmentSelection', {
            coachId: params.coach_id,
            coachNumber: params.coach_number,
            categoryName: params.category_name,
            subcategoryId: params.subcategory_id,
            subcategoryName: params.subcategory_name,
            trainId: params.train_id,
            trainNumber: params.train_number
        });
    };

    const handleViewCombined = () => {
        navigation.navigate('CombinedReport', {
            coach_id: params.coach_id,
            subcategory_id: params.subcategory_id,
            activity_type: params.activity_type,
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleGoHome = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={100} color="#10b981" />
                </View>
                <Text style={styles.title}>Report Submitted!</Text>
                <Text style={styles.subtitle}>
                    Inspection for {params.subcategory_name} ({params.compartment}) has been saved successfully.
                </Text>

                <View style={styles.buttonContainer}>
                    {(() => {
                        const currentType = params.activity_type;
                        const activities = params.activities || [];
                        const currentIndex = activities.findIndex(a => a.type === currentType);
                        const nextActivity = currentIndex !== -1 && currentIndex + 1 < activities.length ? activities[currentIndex + 1] : null;

                        if (nextActivity) {
                            return (
                                <TouchableOpacity 
                                    style={[styles.button, { backgroundColor: '#3b82f6' }]} 
                                    onPress={() => {
                                        navigation.replace('QuestionsScreen', {
                                            ...params,
                                            activity_type: nextActivity.type,
                                            activity_id: nextActivity.id
                                        });
                                    }}
                                >
                                    <Ionicons name="arrow-forward-outline" size={20} color="#fff" />
                                    <Text style={styles.buttonText}>Carry out {nextActivity.type} Checklist</Text>
                                </TouchableOpacity>
                            );
                        }
                        
                        // If no more activities, suggest going back to Area Selection if in Pit Line
                        if (params.module_type === 'PITLINE') {
                            return (
                                <TouchableOpacity 
                                    style={[styles.button, { backgroundColor: '#10b981' }]} 
                                    onPress={() => {
                                        navigation.navigate('PitLineSelectArea', {
                                            ...params
                                        });
                                    }}
                                >
                                    <Ionicons name="apps-outline" size={20} color="#fff" />
                                    <Text style={styles.buttonText}>Select Next Area</Text>
                                </TouchableOpacity>
                            );
                        }
                        return null;
                    })()}

                    <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleInspectAnother}>
                        <Ionicons name="repeat-outline" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Inspect Another Area / Compartment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleViewCombined}>
                        <Ionicons name="grid-outline" size={20} color="#1e293b" />
                        <Text style={[styles.buttonText, { color: '#1e293b' }]}>View Combined Summary</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={handleGoHome}>
                        <Ionicons name="home-outline" size={20} color="#64748b" />
                        <Text style={[styles.buttonText, { color: '#64748b' }]}>Go to Home</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 20 },
    content: { width: '100%', alignItems: 'center' },
    successIcon: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 },
    buttonContainer: { width: '100%', gap: 12 },
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10 },
    primaryButton: { backgroundColor: '#10b981' },
    secondaryButton: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe' },
    outlineButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e2e8f0' },
    buttonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});

export default ReportSuccessScreen;
