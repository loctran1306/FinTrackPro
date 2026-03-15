import AppButton from '@/components/button/AppButton';
import { Theme } from '@/theme';
import { Box, Text } from '@/theme/components';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@screens/Home/Home';
import { ProfileScreen } from '@screens/Profile/Profile';
import StatisticsScreen from '@screens/Statistics/Statistics';
import { WalletScreen } from '@screens/Wallet/Wallet';
import { useTheme } from '@shopify/restyle';
import AppIcon from '@/components/common/AppIcon';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { MainTabParamList, RootStackParamList } from './types';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { colors } = useTheme<Theme>();

  const AddPlaceholder = () => null;
  const triggerTabHaptic = () => {
    ReactNativeHapticFeedback.trigger('selection', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      detachInactiveScreens={false}
      screenOptions={({ route }) => ({
        animation: 'shift',
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        sceneContainerStyle: {
          backgroundColor: colors.main,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          height: 70,
          paddingBottom: 0,
          paddingTop: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarBackground: () => (
          <View
            style={{
              backgroundColor: colors.main,
              width: '100%',
              height: '100%',
              borderRadius: 24,
            }}
          />
        ),

        tabBarIcon: ({ focused }) => {
          const iconColor = focused ? colors.primary : colors.secondaryText;
          switch (route.name) {
            case 'Home':
              return <AppIcon name="house-user" size={20} color={iconColor} />;
            case 'Statistics':
              return <AppIcon name="chart-pie" size={20} color={iconColor} />;
            case 'Wallet':
              return <AppIcon name="wallet" size={20} color={iconColor} />;
            case 'Profile':
              return <AppIcon name="user" size={20} color={iconColor} />;
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text variant="label" color={focused ? 'primary' : 'secondaryText'}>
              {t('common.home')}
            </Text>
          ),
        }}
        listeners={{
          tabPress: triggerTabHaptic,
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text variant="label" color={focused ? 'primary' : 'secondaryText'}>
              {t('common.statistics')}
            </Text>
          ),
        }}
        listeners={{
          tabPress: triggerTabHaptic,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddPlaceholder}
        options={({ navigation: _navigation }) => ({
          tabBarLabel: '',
          tabBarButton: props => (
            <Box justifyContent="center" alignItems="center">
              <AppButton
                haptic="impactLight"
                accessibilityLabel={props.accessibilityLabel}
                accessibilityState={props.accessibilityState}
                testID={props.testID}
                onPress={() => navigation.navigate('TransactionForm')}
                style={[styles.addButton, { backgroundColor: colors.card }]}
              >
                <AppIcon name="plus" size={24} color={colors.primary} />
              </AppButton>
            </Box>
          ),
          tabBarIcon: ({ color }) => {
            return <AppIcon name="plus" size={24} color={color} />;
          },
        })}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text variant="label" color={focused ? 'primary' : 'secondaryText'}>
              {t('common.my_wallet')}
            </Text>
          ),
        }}
        listeners={{
          tabPress: triggerTabHaptic,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text variant="label" color={focused ? 'primary' : 'secondaryText'}>
              {t('common.profile')}
            </Text>
          ),
        }}
        listeners={{
          tabPress: triggerTabHaptic,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6A9CFD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  addButtonInner: {
    width: 22,
    height: 2,
    backgroundColor: '#fff',
  },
  addButtonInnerVertical: {
    position: 'absolute',
    width: 2,
    height: 22,
  },
});
