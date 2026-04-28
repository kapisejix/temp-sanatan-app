import React from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/store/authStore';
import { COLORS } from './src/config/api';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import VedicMantrasScreen from './src/screens/VedicMantrasScreen';
import DivyaGranthScreen from './src/screens/DivyaGranthScreen';
import VedasScreen from './src/screens/VedasScreen';
import VedaChatScreen from './src/screens/VedaChatScreen';
import CategoryListScreen from './src/screens/CategoryListScreen';
import ContentDetailScreen from './src/screens/ContentDetailScreen';
import BirthChartScreen from './src/screens/BirthChartScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#FFFFFF' },
  headerTintColor: COLORS.text,
  headerShadowVisible: false,
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CategoryList" component={CategoryListScreen} options={({ route }) => ({ title: route.params?.title || 'Content' })} />
      <Stack.Screen name="ContentDetail" component={ContentDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BirthChart" component={BirthChartScreen} options={{ title: 'Birth Chart' }} />
    </Stack.Navigator>
  );
}

function VedicStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="VedicMain" component={VedicMantrasScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CategoryList" component={CategoryListScreen} options={({ route }) => ({ title: route.params?.title || 'Content' })} />
      <Stack.Screen name="ContentDetail" component={ContentDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: COLORS.border,
          height: 85,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Mantras" component={VedicStack} options={{ tabBarLabel: 'Mantras' }} />
      <Tab.Screen name="Granth" component={DivyaGranthScreen} options={{ tabBarLabel: 'Granth' }} />
      <Tab.Screen name="Vedas" component={VedasScreen} options={{ tabBarLabel: 'Vedas' }} />
      <Tab.Screen name="Chat" component={VedaChatScreen} options={{ tabBarLabel: 'VedaChat', headerShown: true, title: 'VedaChat AI' }} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      {user ? <MainTabs /> : <AuthScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
