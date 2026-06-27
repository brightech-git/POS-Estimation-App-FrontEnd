import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AsyncStorageHelper }         from '../utils/AsyncStorageHelper';
import { setAuthHeaders }             from '../api/axiosInstance';
import LoginScreen                    from '../Screens/Auth/LoginScreen';
import HomeScreen                     from '../Screens/Home/HomeScreen';
import EstimationScreen               from '../Screens/Estimation/EstimationScreen';
import PrinterSettingsScreen          from '../Screens/PrinterSettings/PrinterSettingsScreen';
import { Colors, Spacing }            from '../components/common/theme';

// ── Route param list ──────────────────────────────────────────────
export type RootStackParamList = {
  Login:           undefined;
  Home:            undefined;
  Estimation:      undefined;
  PrinterSettings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Splash ────────────────────────────────────────────────────────
const SplashScreen = () => (
  <View style={splash.root}>
    <Text style={splash.logo}>POS</Text>
    <ActivityIndicator color={Colors.white} style={{ marginTop: Spacing.lg }} />
  </View>
);

const splash = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: Colors.white,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
  },
});

// ── AppNavigator ──────────────────────────────────────────────────
const AppNavigator: React.FC = () => {
  const [booting,      setBooting]      = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');
//  AsyncStorage.clear()
  useEffect(() => {
    (async () => {
      try {
        const operator = await AsyncStorageHelper.getOperator();
        const costName = await AsyncStorageHelper.getCostName();
        if (operator?.OPER_CODE) {
          setAuthHeaders(String(operator.OPER_CODE), costName ?? '');
          setInitialRoute('Home');
        }
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  if (booting) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Login"           component={LoginScreen}           />
        <Stack.Screen name="Home"            component={HomeScreen}            />
        <Stack.Screen name="Estimation"      component={EstimationScreen}      />
        <Stack.Screen name="PrinterSettings" component={PrinterSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
