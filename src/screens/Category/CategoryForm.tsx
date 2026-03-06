import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import AppInput from '@/components/common/AppInput';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import LoadingChildren from '@/components/loading/LoadingChildren';
import IconPickerBottomSheet, {
  IconPickerBottomSheetRef,
} from '@/components/modals/IconPickerBottomSheet';
import { CATEGORY_COLORS } from '@/constants/category';
import { addOpacity } from '@/helpers/color.helper';
import {
  formatVND,
  formatVNDInput,
  parseVNDInput,
} from '@/helpers/currency.helper';
import { navigateToMain } from '@/navigation/navigationRef';
import { RootStackParamList } from '@/navigation/types';
import * as wmCategory from '@/services/watermelondb/wmCategory.service';
import { useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { RADIUS, SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import { useFormik } from 'formik';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import withObservables from '@nozbe/with-observables';
import { database } from '@/models';
import Category from '@/models/Category';
import { of } from 'rxjs';

type FormProps = {
  categoryId?: string;
  category: Category | null;
  navigation: NativeStackScreenProps<RootStackParamList, 'CategoryForm'>['navigation'];
};

const CategoryFormInner = ({ categoryId, category, navigation }: FormProps) => {
  const { t } = useTranslation();
  const isEdit = !!categoryId;
  const isLoading = isEdit && !category;

  const { colors } = useTheme<Theme>();
  const { top: topSafeArea, bottom: bottomSafeArea } = useSafeAreaInsets();

  const [budgetAlert, setBudgetAlert] = useState(false);

  const { session } = useAppSelector(state => state.auth);
  const iconPickerRef = useRef<IconPickerBottomSheetRef>(null);

  const formCategory = useFormik<{
    id: string;
    name: string;
    icon: string;
    color: string;
    budget_limit: number;
  }>({
    initialValues: {
      id: category?.id ?? '',
      name: category?.name ?? '',
      icon: category?.icon ?? 'utensils',
      color: category?.color ?? CATEGORY_COLORS[0],
      budget_limit: Number(category?.limit ?? 0),
    },
    enableReinitialize: true,
    validationSchema: Yup.object().shape({
      name: Yup.string().required(t('warning.enter_category_name')),
      icon: Yup.string().required(t('warning.enter_category_icon')),
      color: Yup.string().required(t('warning.enter_category_color')),
      budget_limit: Yup.number().required(
        t('warning.enter_category_budget_limit'),
      ),
    }),
    onSubmit: async values => {
      if (!session?.user?.id) {
        toast.error(t('common.error').toLocaleUpperCase());
        return;
      }
      try {
        if (isEdit && category) {
          await wmCategory.updateCategory(category, {
            name: values.name,
            icon: values.icon,
            color: values.color,
            limit: values.budget_limit,
          });
          toast.success(t('finance.update_category_success'));
        } else {
          await wmCategory.createCategory({
            name: values.name,
            icon: values.icon,
            color: values.color,
            userId: session!.user!.id,
            limit: values.budget_limit,
          });
          toast.success(t('finance.create_category_success'));
        }
        navigation.goBack();
      } catch {
        toast.error(
          isEdit
            ? t('finance.update_category_error')
            : t('finance.create_category_error'),
        );
      }
    },
  });


  const handleDelete = () => {
    if (!isEdit || !category) return;
    Alert.alert(
      t('finance.delete_category'),
      t('warning.delete_category_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await wmCategory.deleteCategory(category);
              toast.success(t('finance.delete_category_success'));
              navigateToMain('Statistics');
            } catch (error) {
              if ((error as any).code === '23503') {
                toast.error(t('common.error').toLocaleUpperCase(), t('warning.delete_category_error_dependency'));
              } else {
                toast.error(t('finance.delete_category_error'));
              }
            }
          },
        },
      ],
    );
  };

  const addBudget = (amount: number) => {
    const current = formCategory.values.budget_limit;
    formCategory.setFieldValue('budget_limit', Math.max(0, current + amount));
  };

  if (isLoading) {
    return (
      <Screen padding="none" edges={[]}>
        <LoadingChildren />
      </Screen>
    );
  }

  return (
    <Screen padding="none" edges={[]}>
      {/* Header */}
      <Box
        paddingHorizontal="m"
        paddingTop="m"
        paddingBottom="s"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        style={{ paddingTop: topSafeArea }}
        backgroundColor="main"
      >
        <AppButton
          onPress={() => navigation.goBack()}
          style={{ padding: SPACING.s }}
          shadow={false}
        >
          <AppIcon name="xmark" size={24} color={colors.text} />
        </AppButton>
        <Text variant="subheader">
          {isEdit ? t('finance.edit_category') : t('finance.add_category')}
        </Text>
        <Box width={40} />
      </Box>

      <AppScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.m,
          paddingBottom: bottomSafeArea + SPACING.m,
        }}
      >
        {/* Category Name */}
        <Box marginBottom="l">
          <Text variant="label" marginBottom="s" color="secondaryText">
            {t('finance.category_name')}
          </Text>
          <Box
            flexDirection="row"
            alignItems="center"
            padding="m"
            borderRadius={RADIUS.xl}
            backgroundColor="card"
            style={{ borderWidth: 1, borderColor: colors.card }}
          >
            <AppButton
              style={{ padding: 0 }}
              onPress={() => iconPickerRef.current?.expand()}
            >
              <Box
                width={50}
                height={50}
                borderRadius={RADIUS.m}
                alignItems="center"
                justifyContent="center"
                marginRight="m"
                style={{
                  backgroundColor: addOpacity(formCategory.values.color, 0.3),
                }}
              >
                <AppIcon
                  name={formCategory.values.icon}
                  size={24}
                  color={formCategory.values.color}
                />
              </Box>
            </AppButton>
            <Box flex={1} style={{ minWidth: 0 }}>
              <AppInput
                value={formCategory.values.name}
                onChangeText={t => formCategory.setFieldValue('name', t)}
                placeholder={t('finance.enter_category_name')}
                noMargin
                error={formCategory.errors.name}
                required
              />
            </Box>
          </Box>
        </Box>

        {/* Icon & Color */}
        <Box marginBottom="l">
          <Text variant="label" marginBottom="s" color="secondaryText">
            {t('common.icon')} & {t('common.color')}
          </Text>
          <Box
            padding="m"
            borderRadius={RADIUS.xxl}
            backgroundColor="card"
            style={{ borderWidth: 1, borderColor: colors.card }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 4 }}
            >
              {CATEGORY_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => formCategory.setFieldValue('color', c)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: c,
                  }}
                >
                  <AppIcon
                    name="check"
                    size={12}
                    color={
                      formCategory.values.color === c
                        ? colors.white
                        : 'transparent'
                    }
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Box>
        </Box>

        {/* Monthly Budget Limit */}
        <Box marginBottom="l">
          <Text variant="label" marginBottom="s" color="secondaryText">
            {t('finance.monthly_budget_limit')}
          </Text>
          <Box
            padding="l"
            borderRadius={RADIUS.xl}
            backgroundColor="card"
            style={{ borderWidth: 1, borderColor: colors.card }}
          >
            <Text variant="caption" color="secondaryText" marginBottom="xs">
              {t('finance.amount')}
            </Text>
            <Box>
              <AppInput
                value={formatVNDInput(formCategory.values.budget_limit)}
                onChangeText={t =>
                  formCategory.setFieldValue('budget_limit', parseVNDInput(t))
                }
                placeholder="0"
                keyboardType="number-pad"
                noMargin
                suffix=".000đ"
                error={formCategory.errors.budget_limit}
                required
              />
            </Box>
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-around"
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.card,
              }}
            >
              <AppButton
                onPress={() => addBudget(-500)}
                shadow={false}
                backgroundColor="card"
              >
                <Text color="primary" variant="label">{`- ${formatVND(500)}`}</Text>
              </AppButton>

              <AppButton
                onPress={() => addBudget(500)}
                shadow={false}
                backgroundColor="card"
              >
                <Text color="primary" variant="label">{`+ ${formatVND(500)}`}</Text>
              </AppButton>
            </Box>
          </Box>
        </Box>

        {/* Budget Alerts */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          padding="m"
          borderRadius={RADIUS.xl}
          backgroundColor="card"
          marginBottom="l"
          style={{ borderWidth: 1, borderColor: colors.card }}
        >
          <Box flexDirection="row" alignItems="center" gap="m">
            <Box
              width={40}
              height={40}
              borderRadius={RADIUS.m}
              alignItems="center"
              justifyContent="center"
              style={{ backgroundColor: colors.card }}
            >
              <AppIcon name="bell" size={20} color={colors.secondaryText} />
            </Box>
            <Box>
              <Text variant="label" fontFamily="semiBold">
                {t('finance.budget_alert')}
              </Text>
              <Text variant="caption" color="secondaryText">
                {t('finance.budget_alert_description')}
              </Text>
            </Box>
          </Box>
          <Switch
            value={budgetAlert}
            onValueChange={setBudgetAlert}
            trackColor={{ false: colors.card, true: colors.primary }}
            thumbColor={colors.white}
          />
        </Box>

        <Box gap="m">
          <AppButton
            onPress={formCategory.handleSubmit}
            backgroundColor="primary"
          >
            <Text
              textAlign="center"
              color="white"
              textTransform="uppercase"
            >
              {isEdit ? t('common.update') : t('common.create')}
            </Text>
          </AppButton>
          {isEdit ? (
            <AppButton
              onPress={handleDelete}
              backgroundColor="danger"
            >
              <Text
                textAlign="center"
                color="white"
                textTransform="uppercase"
              >
                {t('finance.delete_category')}
              </Text>
            </AppButton>
          ) : null}
        </Box>
      </AppScrollView>

      <IconPickerBottomSheet
        ref={iconPickerRef}
        selectedIcon={formCategory.values.icon}
        onSelect={name => formCategory.setFieldValue('icon', name)}
      />
    </Screen>
  );
};

const enhance = withObservables(
  ['categoryId'],
  ({ categoryId }: { categoryId?: string }) => ({
    category: categoryId
      ? database.collections.get<Category>('categories').findAndObserve(categoryId)
      : of(null),
  }),
);

const EnhancedCategoryForm = enhance(CategoryFormInner);

export default function CategoryFormScreen() {
  const { categoryId } = useRoute<RouteProp<RootStackParamList, 'CategoryForm'>>().params ?? {};
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'CategoryForm'>>();
  return (
    <EnhancedCategoryForm
      categoryId={categoryId}
      navigation={navigation}
    />
  );
}
