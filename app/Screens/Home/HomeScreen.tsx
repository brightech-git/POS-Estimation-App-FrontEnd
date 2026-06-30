import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import Header             from '../../components/common/Header';
import { AsyncStorageHelper } from '../../utils/AsyncStorageHelper';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../components/common/theme';
import type { RootStackParamList } from '../../Navigations/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [operName, setOperName] = useState('');

  useEffect(() => {
    AsyncStorageHelper.getOperName().then(n => { if (n) setOperName(n); });
  }, []);

  const handleLogout = async () => {
    await AsyncStorageHelper.clearSession();
    navigation.replace('Login');
  };

  return (
    <View style={styles.root}>
      <Header
        title="POS Home"
        actions={[
          {
            icon: <Text style={styles.logoutIcon}>⏻</Text>,
            onPress: handleLogout,
            label: 'Logout',
          },
        ]}
      />

      <View style={styles.content}>
        {operName ? (
          <Text style={styles.welcome}>Welcome, {operName} 👋</Text>
        ) : null}

        <Text style={styles.sectionTitle}>Modules</Text>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Estimation')}
        >
          <Text style={styles.cardIcon}>📋</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardLabel}>Estimation</Text>
            <Text style={styles.cardSub}>Create & manage estimates</Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, { marginTop: Spacing.md }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('RemainingStock')}
        >
          <Text style={styles.cardIcon}>📦</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardLabel}>Remaining Stock</Text>
            <Text style={styles.cardSub}>View & filter stock balances</Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.xl },

  welcome: {
    fontSize:     Typography.fontSizeLG,
    fontWeight:   Typography.fontWeightSemiBold,
    color:        Colors.textPrimary,
    marginBottom: Spacing.xl,
  },

  sectionTitle: {
    fontSize:      Typography.fontSizeSM,
    fontWeight:    Typography.fontWeightBold,
    color:         Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  Spacing.md,
  },

  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.white,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    ...Shadow.md,
  },
  cardIcon:  { fontSize: 32, marginRight: Spacing.md },
  cardText:  { flex: 1 },
  cardLabel: {
    fontSize:   Typography.fontSizeMD,
    fontWeight: Typography.fontWeightBold,
    color:      Colors.textPrimary,
  },
  cardSub: {
    fontSize:  Typography.fontSizeXS,
    color:     Colors.textSecondary,
    marginTop: 2,
  },
  cardArrow: {
    fontSize: 28,
    color:    Colors.textSecondary,
  },

  logoutIcon: { color: Colors.white, fontSize: 18 },
});

export default HomeScreen;
