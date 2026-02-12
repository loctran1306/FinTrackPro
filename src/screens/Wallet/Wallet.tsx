import React from 'react';
import { Box, Text } from '@theme/components';
import Screen from '@/components/common/Screen';

export const WalletScreen = () => {
  return (
    <Screen>
      <Text variant="header">Ví của tôi</Text>

      <Box
        backgroundColor="primary"
        padding="l"
        borderRadius={18}
        marginTop="m"
      >
        <Text variant="body" color="main">
          Tổng số dư
        </Text>
        <Text variant="header" color="main">
          21,300,000đ
        </Text>
        <Text variant="body" color="main" marginTop="s">
          Cập nhật 5 phút trước
        </Text>
      </Box>

      <Box marginTop="m">
        <Text variant="body">Danh sách ví</Text>
        <Box
          backgroundColor="card"
          padding="m"
          borderRadius={14}
          marginTop="s"
        >
          <Text variant="body">Ví tiền mặt</Text>
          <Text variant="body" color="secondaryText">
            3,200,000đ
          </Text>
        </Box>
        <Box
          backgroundColor="card"
          padding="m"
          borderRadius={14}
          marginTop="s"
        >
          <Text variant="body">Tài khoản ngân hàng</Text>
          <Text variant="body" color="secondaryText">
            16,800,000đ
          </Text>
        </Box>
        <Box
          backgroundColor="card"
          padding="m"
          borderRadius={14}
          marginTop="s"
        >
          <Text variant="body">Ví tiết kiệm</Text>
          <Text variant="body" color="secondaryText">
            1,300,000đ
          </Text>
        </Box>
      </Box>
    </Screen>
  );
};
