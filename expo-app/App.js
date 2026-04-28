import React from 'react';
import { StatusBar, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from './src/config/api';

// Tab root screens
import HomeScreen from './src/screens/v2/HomeScreen';
import BhaktiScreen from './src/screens/v2/BhaktiScreen';
import KundliScreen from './src/screens/v2/KundliScreen';
import PanchangScreen from './src/screens/v2/PanchangScreen';
import ProfileScreen from './src/screens/v2/ProfileScreen';

// Bhakti flow inner screens
import DeityDetailScreen from './src/screens/v2/DeityDetailScreen';
import ContentDetailScreen from './src/screens/v2/ContentDetailScreen';
import KathasScreen from './src/screens/v2/KathasScreen';
import KathaDetailScreen from './src/screens/v2/KathaDetailScreen';
import GranthListScreen from './src/screens/v2/GranthListScreen';
import GranthChaptersScreen from './src/screens/v2/GranthChaptersScreen';
import GranthVersesScreen from './src/screens/v2/GranthVersesScreen';
import VedasPuranasScreen from './src/screens/v2/VedasPuranasScreen';
import VedaSuktasScreen from './src/screens/v2/VedaSuktasScreen';
import PuranaDetailScreen from './src/screens/v2/PuranaDetailScreen';

// Modal
import AIChatScreen from './src/screens/v2/AIChatScreen';
import FloatingAIButton from './src/components/FloatingAIButton';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const BhaktiStack = createNativeStackNavigator();
const KundliStack = createNativeStackNavigator();
const PanchangStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const TAB_ICONS = {
  HomeTab: { icon: '🏠', label: 'होम' },
  BhaktiTab: { icon: '🪔', label: 'भक्ति' },
  KundliTab: { icon: '🔮', label: 'कुंडली' },
  PanchangTab: { icon: '📅', label: 'पंचांग' },
  ProfileTab: { icon: '👤', label: 'प्रोफ़ाइल' },
};

// Wrap each tab content with floating AI button
function withFAB(Component) {
  return function Wrapped(props) {
    const navigation = useNavigation();
    return (
      <View style={{ flex: 1 }}>
        <Component {...props} />
        <FloatingAIButton onPress={() => navigation.getParent()?.navigate('AIChat')} />
      </View>
    );
  };
}

// Per-tab Stack navigators (so back/navigation works inside each tab)
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeRoot" component={withFAB(HomeScreen)} />
    </HomeStack.Navigator>
  );
}

function BhaktiStackNav() {
  return (
    <BhaktiStack.Navigator screenOptions={{ headerShown: false }}>
      <BhaktiStack.Screen name="BhaktiRoot" component={withFAB(BhaktiScreen)} />
      <BhaktiStack.Screen name="DeityDetail" component={DeityDetailScreen} />
      <BhaktiStack.Screen name="ContentDetail" component={ContentDetailScreen} />
      <BhaktiStack.Screen name="Kathas" component={KathasScreen} />
      <BhaktiStack.Screen name="KathaDetail" component={KathaDetailScreen} />
      <BhaktiStack.Screen name="GranthList" component={GranthListScreen} />
      <BhaktiStack.Screen name="GranthChapters" component={GranthChaptersScreen} />
      <BhaktiStack.Screen name="GranthVerses" component={GranthVersesScreen} />
      <BhaktiStack.Screen name="VedasPuranas" component={VedasPuranasScreen} />
      <BhaktiStack.Screen name="VedaSuktas" component={VedaSuktasScreen} />
      <BhaktiStack.Screen name="PuranaDetail" component={PuranaDetailScreen} />
    </BhaktiStack.Navigator>
  );
}

function KundliStackNav() {
  return (
    <KundliStack.Navigator screenOptions={{ headerShown: false }}>
      <KundliStack.Screen name="KundliRoot" component={withFAB(KundliScreen)} />
    </KundliStack.Navigator>
  );
}

function PanchangStackNav() {
  return (
    <PanchangStack.Navigator screenOptions={{ headerShown: false }}>
      <PanchangStack.Screen name="PanchangRoot" component={withFAB(PanchangScreen)} />
    </PanchangStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileRoot" component={withFAB(ProfileScreen)} />
    </ProfileStack.Navigator>
  );
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
          <Text style={{ fontSize: 22 }}>{TAB_ICONS[route.name].icon}</Text>
        ),
        tabBarLabel: TAB_ICONS[route.name].label,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNav} />
      <Tab.Screen name="BhaktiTab" component={BhaktiStackNav} />
      <Tab.Screen name="KundliTab" component={KundliStackNav} />
      <Tab.Screen name="PanchangTab" component={PanchangStackNav} />
      <Tab.Screen name="ProfileTab" component={ProfileStackNav} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Tabs" component={MainTabs} />
          <RootStack.Screen name="AIChat" component={AIChatScreen} options={{ presentation: 'modal' }} />
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
