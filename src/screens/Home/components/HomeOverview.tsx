import AppButton from "@/components/button/AppButton";
import AppIcon from "@/components/common/AppIcon";
import { formatVND } from "@/helpers/currency.helper";
import { formatDayAndDate } from "@/helpers/time.helper";
import { FinanceOverview } from "@/services/wallet/wallet.type";
import { observeFinanceOverview } from "@/services/watermelondb/func/wmFinanceOverview";
import { setHiddenCurrency } from "@/store/global/global.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Theme } from "@/theme";
import { Box, Text } from "@/theme/components";
import { RADIUS, SPACING } from "@/theme/constant";
import withObservables from "@nozbe/with-observables";
import { useTheme } from "@shopify/restyle";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
    financeOverview: FinanceOverview;
}

const HomeOverview = ({ financeOverview }: Props) => {
    const { top: topSafeArea } = useSafeAreaInsets();
    const { colors } = useTheme<Theme>();
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const { hiddenCurrency } = useAppSelector(state => state.global);

    const handleToggleHiddenCurrency = () => {
        dispatch(setHiddenCurrency(!hiddenCurrency));
    };
    return (
        <Box
            paddingHorizontal="m"
            paddingBottom="l"
            gap="l"
            style={{ paddingTop: topSafeArea }}
        >

            <Box alignItems="center">
                <Box padding='s' borderRadius={RADIUS.l} backgroundColor='highlight'>

                    <Text variant="subheader" color='primary'>{formatDayAndDate(undefined, i18n.language as 'vi' | 'en')}</Text>
                </Box>
                <AppButton
                    shadow={false}
                    onPress={handleToggleHiddenCurrency}
                    style={{ padding: SPACING.m }}
                >
                    <Box flexDirection="row" alignItems="center" gap="s">
                        <Text
                            variant="caption"
                            color="text"
                            textTransform="uppercase"
                            letterSpacing={1}
                        >
                            {t('finance.physical_cash')}
                        </Text>
                        {!hiddenCurrency ? (
                            <AppIcon name="eye" size={16} color={colors.secondaryText} />
                        ) : (
                            <AppIcon name="eye-slash" size={16} color={colors.secondaryText} />
                        )}
                    </Box>
                </AppButton>
                <Text variant="header">
                    {formatVND(financeOverview?.physical_cash || 0, hiddenCurrency)}
                </Text>
            </Box>
            <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-around"
            >
                <Box flex={1} alignItems="center">
                    <Text variant="caption" color="secondaryText">
                        {t('finance.total_income')}
                    </Text>
                    <Text variant="subheader">
                        {formatVND(
                            financeOverview?.monthly_income || 0,
                            hiddenCurrency,
                        )}
                    </Text>
                </Box>
                <AppIcon
                    name="ellipsis-vertical"
                    size={24}
                    color={colors.secondaryText}
                />
                <Box flex={1} alignItems="center">
                    <Text variant="caption" color="secondaryText">
                        {t('finance.net_balance')}
                    </Text>
                    <Text variant="subheader">{formatVND(financeOverview?.net_balance || 0, hiddenCurrency)}</Text>
                </Box>
            </Box>

        </Box>
    );
};

const enhance = withObservables([], () => ({
    financeOverview: observeFinanceOverview(),
}));

export default enhance(HomeOverview);