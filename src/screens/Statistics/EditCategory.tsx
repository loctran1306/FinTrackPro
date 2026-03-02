import AppButton from '@/components/button/AppButton';
import AppIcon from '@/components/common/AppIcon';
import AppInput from '@/components/common/AppInput';
import AppScrollView from '@/components/common/AppScrollView';
import Screen from '@/components/common/Screen';
import IconPickerBottomSheet, {
  IconPickerBottomSheetRef,
} from '@/components/modals/IconPickerBottomSheet';
import { CATEGORY_COLORS } from '@/constants/category';
import { addOpacity } from '@/helpers/color.helper';
import {
  formatVND,
  formatVNDInput,
  parseVNDInput
} from '@/helpers/currency.helper';
import { RootStackParamList } from '@/navigation/types';
import categoryService from '@/services/category/category.service';
import { selectCategoryById } from '@/store/category/category.selector';
import { getCategoriesThunk } from '@/store/category/category.thunk';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Theme } from '@/theme';
import { RADIUS, SPACING } from '@/theme/constant';
import { toast } from '@/utils/toast';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from '@theme/components';
import { useFormik } from 'formik';
import React, { useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  Switch,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Yup from 'yup';

type Props = NativeStackScreenProps<RootStackParamList, 'EditCategory'>;

const EditCategoryScreen = ({ route, navigation }: Props) => {
  const {
    categoryId,
  } = route.params;

  const { colors } = useTheme<Theme>();
  const { top: topSafeArea, bottom: bottomSafeArea } = useSafeAreaInsets();

  const [budgetAlert, setBudgetAlert] = useState(false);

  const dispatch = useAppDispatch();
  const iconPickerRef = useRef<IconPickerBottomSheetRef>(null);
  const category = useAppSelector(selectCategoryById(categoryId));
  const { time } = useAppSelector(state => state.global);

  const formCategory = useFormik<{ id: string; name: string; icon: string; color: string; budget_limit: number }>({
    initialValues: {
      id: category?.id ?? '',
      name: category?.name ?? '',
      icon: category?.icon ?? 'utensils',
      color: category?.color ?? CATEGORY_COLORS[0],
      budget_limit: category?.budget_limit ?? 0,
    },
    validationSchema: Yup.object().shape({
      name: Yup.string().required('Vui lòng nhập tên danh mục'),
      icon: Yup.string().required('Vui lòng chọn icon'),
      color: Yup.string().required('Vui lòng chọn màu'),
      budget_limit: Yup.number().required('Vui lòng nhập giới hạn chi tiêu'),
    }),
    onSubmit: async (values) => {
      if (!category) return;
      try {
        const updatedCategory = await categoryService.updateCategory(values.id, {
          name: values.name,
          icon: values.icon,
          color: values.color,
          limit: values.budget_limit,
        });
        if (!updatedCategory) toast.error('Không thể cập nhật danh mục');
        await dispatch(getCategoriesThunk({ month: time.month, year: time.year })).unwrap();
        toast.success('Đã cập nhật danh mục');
        navigation.goBack();
      } catch {
        toast.error('Không thể cập nhật danh mục');
      }
    },
  });



  const handleDelete = () => {
    Alert.alert(
      'Xóa danh mục',
      'Bạn có chắc muốn xóa danh mục này? Các giao dịch liên quan sẽ không bị xóa.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            // try {
            //   await categoryService.deleteCategory(categoryId);
            //   await dispatch(getCategoriesThunk({ month: time.month, year: time.year })).unwrap();
            //   toast.success('Đã xóa danh mục');
            //   navigation.getParent()?.goBack();
            //   navigation.goBack();
            // } catch {
            //   toast.error('Không thể xóa danh mục');
            // }
          },
        },
      ]
    );
  };

  const addBudget = (amount: number) => {
    const current = formCategory.values.budget_limit;
    formCategory.setFieldValue('budget_limit', current + amount);
  };

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
        <Text variant="subheader">Chỉnh sửa danh mục</Text>
        <Box width={40} />
      </Box>

      <AppScrollView contentContainerStyle={{ paddingHorizontal: SPACING.m, paddingBottom: bottomSafeArea + SPACING.m }}>
        {/* Category Name */}
        <Box marginBottom="l">
          <Text variant="label" marginBottom="s" color="secondaryText">
            Tên danh mục
          </Text>
          <Box

            flexDirection="row"
            alignItems="center"
            padding="m"
            borderRadius={RADIUS.xl}
            backgroundColor="card"
            style={{ borderWidth: 1, borderColor: colors.card }}
          >
            <AppButton style={{ padding: 0 }} onPress={() => iconPickerRef.current?.expand()}>
              <Box
                width={50}
                height={50}
                borderRadius={RADIUS.m}
                alignItems="center"
                justifyContent="center"
                marginRight="m"
                style={{ backgroundColor: addOpacity(formCategory.values.color, 0.3) }}
              >
                <AppIcon name={formCategory.values.icon} size={24} color={formCategory.values.color} />
              </Box>
            </AppButton>
            <Box flex={1} style={{ minWidth: 0 }}>
              <AppInput
                value={formCategory.values.name}
                onChangeText={(t) => formCategory.setFieldValue('name', t)}
                placeholder="Nhập tên danh mục"
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
            Icon & Màu
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

              {CATEGORY_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => formCategory.setFieldValue('color', c)}
                  style={[
                    {
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: c,
                    },
                  ]}
                >
                  <AppIcon name="check" size={12} color={formCategory.values.color === c ? colors.white : 'transparent'} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Box>
        </Box>

        {/* Monthly Budget Limit */}
        <Box marginBottom="l">
          <Text variant="label" marginBottom="s" color="secondaryText">
            Giới hạn chi tiêu hàng tháng
          </Text>
          <Box
            padding="l"
            borderRadius={RADIUS.xl}
            backgroundColor="card"
            style={{ borderWidth: 1, borderColor: colors.card }}
          >
            <Text variant="caption" color="secondaryText" marginBottom="xs">
              Số tiền
            </Text>
            <Box >
              <AppInput
                value={formatVNDInput(formCategory.values.budget_limit)}
                onChangeText={(t) => formCategory.setFieldValue('budget_limit', parseVNDInput(t))}
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
              justifyContent='space-around'
              style={{ borderTopWidth: 1, borderTopColor: colors.card }}
            >
              <AppButton
                onPress={() => addBudget(-500)}
                shadow={false}
                backgroundColor="card"
              >
                <Text color='primary' variant="label">{`- ${formatVND(500)}`}</Text>
              </AppButton>

              <AppButton
                onPress={() => addBudget(500)}
                shadow={false}
                backgroundColor="card"
              >
                <Text color='primary' variant="label">{`+ ${formatVND(500)}`}</Text>
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
                Cảnh báo chi tiêu
              </Text>
              <Text variant="caption" color="secondaryText">
                Thông báo khi gần đạt giới hạn
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
            <Text textAlign="center" color="white" >
              CẬP NHẬT
            </Text>
          </AppButton>
          <AppButton
            disabled
            onPress={handleDelete}
            backgroundColor="danger"
          >
            <Text textAlign="center" color="white">
              XÓA DANH MỤC
            </Text>
          </AppButton>
        </Box>

      </AppScrollView>



      <IconPickerBottomSheet
        ref={iconPickerRef}
        selectedIcon={formCategory.values.icon}
        onSelect={(name) => formCategory.setFieldValue('icon', name)}
      />
    </Screen>
  );
};



export default EditCategoryScreen;
