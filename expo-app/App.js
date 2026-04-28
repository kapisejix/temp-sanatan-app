import React from 'react';
import { StatusBar, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { COLORS } from './src/config/api';

import HomeScreen from './src/screens/v2/HomeScreen';
import BhaktiScreen from './src/screens/v2/BhaktiScreen';
import KundliScreen from './src/screens/v2/KundliScreen';
import PanchangScreen from './src/screens/v2/PanchangScreen';
import ProfileScreen from './src/screens/v2/ProfileScreen';
import AIChatScreen from './src/screens/v2/AIChatScreen';
import FloatingAIButton from './src/components/FloatingAIButton';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Home: { active: '🏠', label_hi: 'होम' },
  Bhakti: { active: '🪔', label_hi: 'भक्ति' },
  Kundli: { active: '🔮', label_hi: 'कुंडली' },
  Panchang: { active: '📅', label_hi: 'पंचांग' },
  Profile: { active: '👤', label_hi: 'प्रोफ़ाइल' },
};

function TabScreenWithFAB(Screen) {
  return (props) => {
    const navigation = useNavigation();
    return (
      <View style={{ flex: 1 }}>
        <Screen {...props} />
        <FloatingAIButton onPress={() => navigation.navigate('AIChat')} />
      </View>
    );
  };
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingTop: 6,
          paddingBottom: 8,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: () => (
          <Text style={{ fontSize: 22 }}>{TAB_ICONS[route.name].active}</Text>
        ),
        tabBarLabel: TAB_ICONS[route.name].label_hi,
      })}
    >
      <Tab.Screen name="Home" component={TabScreenWithFAB(HomeScreen)} />
      <Tab.Screen name="Bhakti" component={TabScreenWithFAB(BhaktiScreen)} />
      <Tab.Screen name="Kundli" component={TabScreenWithFAB(KundliScreen)} />
      <Tab.Screen name="Panchang" component={TabScreenWithFAB(PanchangScreen)} />
      <Tab.Screen name="Profile" component={TabScreenWithFAB(ProfileScreen)} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={MainTabs} />
        <Stack.Screen name="AIChat" component={AIChatScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
