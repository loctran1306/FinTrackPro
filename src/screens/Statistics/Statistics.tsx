import React from 'react';
import { Box, Text } from '@theme/components';
import Screen from '@/components/common/Screen';

export const StatisticsScreen = () => {
  return (
    <Screen padding="m">
      <Text variant="header">Thống kê</Text>

      <Box backgroundColor="card" padding="m" borderRadius={16} marginTop="m">
        <Text variant="body" color="secondaryText">
          Tóm tắt tháng này
        </Text>
        <Box marginTop="s">
          <Text variant="body">Tổng thu</Text>
          <Text variant="header" color="primary">
            +12,450,000đ
          </Text>
        </Box>
        <Box marginTop="s">
          <Text variant="body">Tổng chi</Text>
          <Text variant="header" color="highlight">
            -7,820,000đ
          </Text>
        </Box>
      </Box>

      <Box backgroundColor="card" padding="m" borderRadius={16} marginTop="m">
        <Text variant="body" color="secondaryText">
          Danh mục chi tiêu
        </Text>
        <Box marginTop="s">
          <Text variant="body">Ăn uống</Text>
          <Text variant="body" color="secondaryText">
            2,300,000đ
          </Text>
        </Box>
        <Box marginTop="s">
          <Text variant="body">Di chuyển</Text>
          <Text variant="body" color="secondaryText">
            1,150,000đ
          </Text>
        </Box>
        <Box marginTop="s">
          <Text variant="body">Hóa đơn</Text>
          <Text variant="body" color="secondaryText">
            1,900,000đ
          </Text>
        </Box>
      </Box>
    </Screen>
  );
};
