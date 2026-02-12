import { Box, Text } from "@/theme/components"
import AppButton from "../button/AppButton";
import AppIcon from "./AppIcon";
import { Theme } from "@/theme";
import { useTheme } from "@shopify/restyle";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { useNavigation } from "@react-navigation/native";

type AppHeaderProps = {
    title: string;
    backButton?: () => void;

}

const AppHeader = ({ title, backButton }: AppHeaderProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { colors } = useTheme<Theme>();
    return (
        <Box paddingHorizontal='m' flexDirection="row" alignItems="center" gap='m'>
            <AppButton shadow={false} onPress={backButton ? backButton : () => navigation.goBack()}>
                <AppIcon name="xmark" size={24} color={colors.primary} />
            </AppButton>
            <Text variant="header">{title}</Text>
        </Box>
    )
}

export default AppHeader;