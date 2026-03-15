import { formatVND } from '@/helpers/currency.helper';
import { Theme } from '@/theme';
import {
  Canvas,
  Path,
  Skia,
  Text as SkiaText,
  matchFont,
  useFont,
  Group,
} from '@shopify/react-native-skia';
import { useTheme } from '@shopify/restyle';
import React, { useMemo } from 'react';
import { Platform, View, StyleSheet, TouchableWithoutFeedback, Text } from 'react-native';

export type DoughnutSegment = {
  id: string;
  value: number;
  color: string;
  name: string;
  amount: number;
};

const FONT_SIZE_PCT = 10;
const MIN_PERCENT = 2;

const fontStyle = {
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }) as string,
  fontSize: FONT_SIZE_PCT,
  fontWeight: 'bold' as const,
};
const fallbackFont = matchFont(fontStyle);

type DoughnutChartProps = {
  data: DoughnutSegment[];
  size: number;
  strokeWidth?: number;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
};

const DoughnutChart = ({
  data,
  size,
  strokeWidth = 35,
  selectedIndex,
  onSelect,
}: DoughnutChartProps) => {
  const fontPct = useFont(require('../../../assets/fonts/static/LexendDeca-SemiBold.ttf'), 10) ?? fallbackFont;
  const { colors } = useTheme<Theme>();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const center = size / 2;

  // 1. Tính toán logic các phân khúc
  const segments = useMemo(() => {
    const filtered = data.filter(d => (d.value / total) * 100 >= MIN_PERCENT);
    const filteredTotal = filtered.reduce((sum, d) => sum + d.value, 0);
    const radius = (size - strokeWidth) / 2;
    const gapAngle = (strokeWidth / (4 * Math.PI * radius)) * 360 + 8;
    const availableAngle = 360 - (filtered.length * gapAngle);

    let currentStartAngle = -90 + (gapAngle / 2);

    return filtered.map((d) => {
      const sweep = (d.value / filteredTotal) * availableAngle;
      const start = currentStartAngle;
      currentStartAngle += sweep + gapAngle;
      return { ...d, start, sweep, percentage: Math.round((d.value / total) * 100) };
    });
  }, [data, total, size, strokeWidth]);

  // 2. Sắp xếp thứ tự vẽ: Thằng nào Active vẽ cuối cùng để đè lên trên
  const sortedSegments = useMemo(() => {
    return [...segments].sort((a, b) => {
      const idxA = segments.indexOf(a);
      const idxB = segments.indexOf(b);
      if (idxA === selectedIndex) return 1;
      if (idxB === selectedIndex) return -1;
      return 0;
    });
  }, [segments, selectedIndex]);

  const handlePress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const dx = locationX - center;
    const dy = locationY - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Kiểm tra vùng bấm (vòng nhẫn)
    if (distance < (size / 2 - strokeWidth - 20) || distance > (size / 2 + 20)) {
      onSelect(null);
      return;
    }

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < -90) angle += 360;

    const index = segments.findIndex(s => angle >= s.start && angle <= s.start + s.sweep);
    onSelect(selectedIndex === index ? null : index !== -1 ? index : null);
  };

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View>
          <Canvas style={{ width: size, height: size }}>
            {sortedSegments.map((segment) => {
              const originalIndex = segments.indexOf(segment);
              const isActive = selectedIndex === originalIndex;

              // 3. Tính toán Stroke và Radius mới để không bị lệch trục khi bự lên
              const currentStroke = isActive ? strokeWidth + 12 : selectedIndex === null ? strokeWidth : strokeWidth - 5;
              const radiusOffset = isActive ? 0 : 4
              const currentRadius = (size - currentStroke) / 2 - radiusOffset;

              const arcRect = Skia.XYWHRect(
                center - currentRadius,
                center - currentRadius,
                currentRadius * 2,
                currentRadius * 2
              );

              const path = Skia.Path.Make();
              path.addArc(arcRect, segment.start, segment.sweep);

              const middleAngleRad = ((segment.start + segment.sweep / 2) * Math.PI) / 180;
              const tx = center + currentRadius * Math.cos(middleAngleRad);
              const ty = center + currentRadius * Math.sin(middleAngleRad);

              // 4. Xoay chữ theo chiều hiển thị và chống ngược
              let rotation = middleAngleRad + Math.PI / 2;
              const normAngle = ((segment.start + segment.sweep / 2) + 360) % 360;
              if (normAngle > 90 && normAngle < 270) rotation += Math.PI;

              const textStr = `${segment.percentage}%`;
              const textWidth = fontPct.measureText(textStr).width;

              return (
                <Group key={segment.id}>
                  <Path
                    path={path}
                    color={segment.color}
                    style="stroke"
                    strokeWidth={currentStroke}
                    strokeCap="round"
                    opacity={selectedIndex === null || isActive ? 1 : 0.3}
                  />
                  {(selectedIndex === null || isActive) && (
                    <Group origin={{ x: tx, y: ty }} transform={[{ rotate: rotation }]}>
                      <SkiaText
                        x={tx - textWidth / 2}
                        y={ty + FONT_SIZE_PCT / 3}
                        text={textStr}
                        font={fontPct}
                        color={colors.white}
                      />
                    </Group>
                  )}
                </Group>
              );
            })}
          </Canvas>
        </View>
      </TouchableWithoutFeedback>

      {/* 5. Thông tin chi tiết hiển thị ở giữa */}
      {selectedIndex !== null && (
        <View style={styles.centerContainer} pointerEvents="none">
          <Text style={[styles.centerName, { color: segments[selectedIndex].color }]}>
            {segments[selectedIndex].name}
          </Text>
          <Text style={styles.centerValue}>
            {formatVND(segments[selectedIndex].amount || 0)}
          </Text>
        </View>
      )}
    </View>
  );
};

export default DoughnutChart;

const styles = StyleSheet.create({
  centerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  centerName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  centerValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
  },
});