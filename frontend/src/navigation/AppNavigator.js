import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/StoreContext';

import LoginScreen from '../screens/LoginScreen';
import CategoryDashboard from '../screens/CategoryDashboard';
import CoachSelectionScreen from '../screens/CoachSelectionScreen';
import ActivitySelectionScreen from '../screens/ActivitySelectionScreen';
import QuestionsScreen from '../screens/QuestionsScreen';
import SummaryScreen from '../screens/SummaryScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import CreateUserScreen from '../screens/CreateUserScreen';
import QuestionManagementScreen from '../screens/QuestionManagementScreen';
import ReportListScreen from '../screens/ReportListScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import WspScheduleScreen from '../screens/WspScheduleScreen';
import AmenitySubcategoryScreen from '../screens/AmenitySubcategoryScreen';
import CompartmentSelectionScreen from '../screens/CompartmentSelectionScreen';
import CombinedSummaryScreen from '../screens/CombinedSummaryScreen';
import CombinedReportScreen from '../screens/CombinedReportScreen';
import ReportSuccessScreen from '../screens/ReportSuccessScreen';
import CommissionaryCoachScreen from '../screens/CommissionaryCoachScreen';
import CommissionaryCompartmentScreen from '../screens/CommissionaryCompartmentScreen';
import CommissionaryDashboardScreen from '../screens/CommissionaryDashboardScreen';
import CommissionaryQuestionsScreen from '../screens/CommissionaryQuestionsScreen';
import CommissionaryCombinedReport from '../screens/CommissionaryCombinedReport';

import SickLineCoachScreen from '../screens/SickLineCoachScreen';
import SickLineDashboardScreen from '../screens/SickLineDashboardScreen';
import SickLineActivitySelectionScreen from '../screens/SickLineActivitySelectionScreen';
import SickLineQuestionsScreen from '../screens/SickLineQuestionsScreen';
import DefectsScreen from '../screens/DefectsScreen';
import PitLineTrainListScreen from '../screens/PitLineTrainListScreen';
import PitLineTrainDetailScreen from '../screens/PitLineTrainDetailScreen';
import PitLineSelectAreaScreen from '../screens/PitLineSelectAreaScreen';

import CaiCoachScreen from '../screens/CaiCoachScreen';
import CaiQuestionsScreen from '../screens/CaiQuestionsScreen';
import EditCaiQuestionsScreen from '../screens/EditCaiQuestionsScreen';
import WspCoachScreen from '../screens/WspCoachScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const { user, isAppReady } = useStore();

    if (!isAppReady) return null;

    return (
        <Stack.Navigator
            screenOptions={({ navigation, route }) => ({
                headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
                headerTintColor: '#1e293b',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
                headerTitleAlign: 'center',
                headerBackTitleVisible: false,
                headerRight: () => (
                    route.name !== 'Dashboard' && route.name !== 'Login' ? (
                        <TouchableOpacity
                            onPress={() => navigation.reset({
                                index: 0,
                                routes: [{ name: 'Dashboard' }],
                            })}
                            style={{ marginRight: 15 }}
                        >
                            <Ionicons name="home-outline" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    ) : null
                )
            })}
        >
            {!user ? (
                // Auth Stack
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
            ) : (
                // App Stack
                // Using Fragment to group multiple screens if needed, though Stack.Navigator handles children array fine
                // But mixing conditional rendering requires Fragment usually if logic is complex
                <>
                    <Stack.Screen
                        name="Dashboard"
                        component={CategoryDashboard}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="ReportSuccess"
                        component={ReportSuccessScreen}
                        options={{ title: 'Success', headerLeft: () => null, headerRight: () => null }}
                    />
                    <Stack.Screen
                        name="CoachSelection"
                        component={CoachSelectionScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="ActivitySelection"
                        component={ActivitySelectionScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="QuestionsScreen"
                        component={QuestionsScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="SummaryScreen"
                        component={SummaryScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="ReportList"
                        component={ReportListScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="ReportDetail"
                        component={ReportDetailScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="WspScheduleScreen"
                        component={WspScheduleScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="AmenitySubcategory"
                        component={AmenitySubcategoryScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="CompartmentSelection"
                        component={CompartmentSelectionScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="CombinedSummary"
                        component={CombinedSummaryScreen}
                        options={{ title: 'Combined Summary' }}
                    />
                    <Stack.Screen
                        name="CombinedReport"
                        component={CombinedReportScreen}
                        options={{ title: 'Combined Compartment Report' }}
                    />
                    <Stack.Screen
                        name="Defects"
                        component={DefectsScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="PitLineTrainList"
                        component={PitLineTrainListScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="PitLineTrainDetail"
                        component={PitLineTrainDetailScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="PitLineSelectArea"
                        component={PitLineSelectAreaScreen}
                        options={{ title: 'Select Area' }}
                    />

                    <Stack.Screen
                        name="CommissionaryCoach"
                        component={CommissionaryCoachScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="CommissionaryCompartment"
                        component={CommissionaryCompartmentScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="CommissionaryDashboard"
                        component={CommissionaryDashboardScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="CommissionaryQuestions"
                        component={CommissionaryQuestionsScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="CommissionaryCombinedReport"
                        component={CommissionaryCombinedReport}
                        options={{ title: 'Executive Matrix Report' }}
                    />

                    {/* Sick Line Framework */}
                    <Stack.Screen
                        name="SickLineCoach"
                        component={SickLineCoachScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="SickLineDashboard"
                        component={SickLineDashboardScreen}
                        options={{ title: 'Area Selection' }}
                    />
                    <Stack.Screen
                        name="SickLineActivitySelection"
                        component={SickLineActivitySelectionScreen}
                        options={{ title: 'Select Activity' }}
                    />
                    <Stack.Screen
                        name="SickLineQuestions"
                        component={SickLineQuestionsScreen}
                        options={{ headerShown: false }}
                    />

                    <Stack.Screen
                        name="WspCoach"
                        component={WspCoachScreen}
                        options={{ headerShown: false }}
                    />

                    {/* CAI / Modifications */}
                    <Stack.Screen
                        name="CaiCoachScreen"
                        component={CaiCoachScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="CaiQuestionsScreen"
                        component={CaiQuestionsScreen}
                        options={{ headerShown: false }}
                    />

                    {(user.role === 'Admin' || user.role === 'SUPER_ADMIN' || user.role === 'SuperAdmin') && (
                        <>
                            <Stack.Screen
                                name="UserManagement"
                                component={UserManagementScreen}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="CreateUser"
                                component={CreateUserScreen}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="QuestionManagement"
                                component={QuestionManagementScreen}
                                options={{ headerShown: false }}
                            />
                            <Stack.Screen
                                name="EditCaiQuestionsScreen"
                                component={EditCaiQuestionsScreen}
                                options={{ headerShown: false }}
                            />
                        </>
                    )}
                </>
            )}
        </Stack.Navigator>
    );
};

export default AppNavigator;
