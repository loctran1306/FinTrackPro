import Screen from '@/components/common/Screen';
import { checkSessionAndToken } from '@/lib/supabase';
import { COLORS } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppIcon from '@/components/common/AppIcon';
import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../../navigation/types';
import { useAppDispatch } from '@/store/hooks';
import {
  getFinanceOverviewThunk,
  getWalletsThunk,
} from '@/store/wallet/wallet.thunk';
import { getTransactionsThunk } from '@/store/transaction/transaction.thunk';

const SplashScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const dispatch = useAppDispatch();

  useEffect(() => {
    const initApp = async () => {
      const { isAuthenticated, session } = await checkSessionAndToken();
      if (isAuthenticated) {
        if (session && session.user && session.user.id) {
          Promise.all([
            dispatch(getFinanceOverviewThunk()),
            dispatch(getWalletsThunk(session.user.id)),
            dispatch(
              getTransactionsThunk({
                userId: session.user.id,
                page: 1,
                limit: 10,
              }),
            ),
          ]).finally(() => {
            navigation.replace('MainTab', { screen: 'Home' });
          });
        } else {
          navigation.replace('AuthStack');
        }
      } else {
        navigation.replace('AuthStack');
      }
    };

    initApp();
  }, [navigation]);
  return (
    <Screen edges={[]} backgroundColor="highlight">
      <StatusBar barStyle="dark-content" />
      <View style={styles.background}>
        <View style={styles.blurTopLeft} />
        <View style={styles.blurBottomRight} />
      </View>

      <View style={styles.spacer} />

      <View style={styles.centerContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logoInnerShadow} />
          <View style={styles.logoHighlight} />

          <View style={styles.logoInnerCircle}>
            <View style={styles.logoWhiteCircle}>
              <View style={styles.logoCoin}>
                <Text style={styles.logoIcon}>$</Text>
              </View>
            </View>
            <View style={styles.trendingBadge}>
              <AppIcon name="arrow-trend-up" size={20} color="#fff" />
            </View>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>
            FinTrack <Text style={styles.titleAccent}>Pro</Text>
          </Text>
          <Text style={styles.subtitleText}>Master your money.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.poweredBy}>
          <Text style={styles.poweredByLabel}>Powered by</Text>
          <View style={styles.poweredByBrand}>
            <View style={styles.poweredDot} />
            <Text style={styles.poweredByText}>Trần Thanh Lộc</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
  blurTopLeft: {
    position: 'absolute',
    top: '-16%',
    left: '-20%',
    width: '70%',
    height: '50%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  blurBottomRight: {
    position: 'absolute',
    bottom: '-13%',
    right: '-20%',
    width: '70%',
    height: '50%',
    borderRadius: 999,
    backgroundColor: 'rgba(106,156,253,0.1)',
  },
  spacer: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: 40,
    backgroundColor: '#6A9CFD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.main,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    shadowOpacity: 0.7,
    elevation: 10,
  },
  logoInnerShadow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 40,
    shadowColor: '#5a85d7',
    shadowOffset: { width: 10, height: 10 },
    shadowRadius: 20,
    shadowOpacity: 0.6,
  },
  logoHighlight: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 48,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ rotate: '-12deg' }],
  },
  logoInnerCircle: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWhiteCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.12,
    elevation: 4,
  },
  logoCoin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(226,232,240,0.6)',
  },
  logoIcon: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6A9CFD',
  },
  trendingBadge: {
    position: 'absolute',
    right: -8,
    top: -8,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFBFB3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    shadowOpacity: 0.16,
    elevation: 6,
    transform: [{ rotate: '12deg' }],
  },
  titleBlock: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1f2937',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  titleAccent: {
    color: '#6A9CFD',
  },
  subtitleText: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    opacity: 0.8,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 32,
  },
  poweredBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.6,
  },
  poweredByLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  poweredByBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poweredDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  poweredByText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
});

export default SplashScreen;
