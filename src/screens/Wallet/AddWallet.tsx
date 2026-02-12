import AppButton from "@/components/button/AppButton";
import Screen from "@/components/common/Screen";
import { Theme } from "@/theme";
import { Text } from "@/theme/components";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "@shopify/restyle";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import AppIcon from "@/components/common/AppIcon";

const AddWalletScreen = () => {
    const route = useRoute<RouteProp<RootStackParamList, 'AddWallet'>>();
    const type = route.params?.type;
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { colors } = useTheme<Theme>();
    return (
        <Screen>
            <AppButton onPress={() => navigation.goBack()}>
                <AppIcon name="xmark" size={24} color={colors.primary} />
            </AppButton>
            <Text variant="header">Add {type}</Text>
        </Screen>
    );
};

export default AddWalletScreen;