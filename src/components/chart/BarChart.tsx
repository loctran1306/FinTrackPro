import { formatVND } from '@/helpers/currency.helper';
import { COLORS } from '@/theme';
import {
  Canvas,
  RoundedRect,
  Text as SkiaText,
  Line as SkiaLine,
  matchFont,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import {
  Platform,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Text,
} from 'react-native';

export type BarChartItem = {
  id: string;
  name: string;
  color: string;
  amount: number;
  budget_limit: number;
};

const FONT_SIZE = 10;
const LABEL_FONT_SIZE = 9;

const fontStyle = {
  fontFamily: Platform.select({
    ios: 'Helvetica',
    default: 'sans-serif',
  }) as string,
  fontSize: FONT_SIZE,
  fontWeight: 'bold' as const,
};

const labelFontStyle = {
  fontFamily: Platform.select({
    ios: 'Helvetica',
    default: 'sans-serif',
  }) as string,
  fontSize: LABEL_FONT_SIZE,
  fontWeight: 'normal' as const,
};

const fallbackFont = matchFont(fontStyle);
const fallbackLabelFont = matchFont(labelFontStyle);

type BarChartProps = {
  data: BarChartItem[];
  width: number;
  height: number;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
};

const BUDGET_COLOR = '#E0E0E0';
const BAR_RADIUS = 4;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 48;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;
const GRID_LINES = 4;

const BarChart = ({
  data,
  width,
  height,
  selectedIndex,
  onSelect,
}: BarChartProps) => {
  const font =
    useFont(
      require('../../../assets/fonts/static/LexendDeca-SemiBold.ttf'),
      FONT_SIZE,
    ) ?? fallbackFont;

  const labelFont =
    useFont(
      require('../../../assets/fonts/static/LexendDeca-Regular.ttf'),
      LABEL_FONT_SIZE,
    ) ?? fallbackLabelFont;

  // Filter out categories with 0 amount
  const filteredData = useMemo(
    () => data.filter(item => item.amount > 0),
    [data],
  );

  // Calculate chart dimensions
  const chartWidth = width - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;

  // Find max value for scaling
  const maxValue = useMemo(() => {
    const max = filteredData.reduce((m, item) => {
      return Math.max(m, item.amount, item.budget_limit);
    }, 0);
    return max > 0 ? max * 1.15 : 100; // add 15% headroom
  }, [filteredData]);

  // Calculate bar positions
  const bars = useMemo(() => {
    const count = filteredData.length;
    if (count === 0) return [];

    const groupWidth = chartWidth / count;
    const barPairWidth = groupWidth * 0.7;
    const singleBarWidth = barPairWidth / 2 - 1;
    const groupPadding = (groupWidth - barPairWidth) / 2;

    return filteredData.map((item, index) => {
      const groupX = PADDING_LEFT + index * groupWidth;

      // Budget bar (behind)
      const budgetHeight =
        item.budget_limit > 0
          ? (item.budget_limit / maxValue) * chartHeight
          : 0;
      const budgetX = groupX + groupPadding;
      const budgetY = PADDING_TOP + chartHeight - budgetHeight;

      // Amount bar (in front)
      const amountHeight = (item.amount / maxValue) * chartHeight;
      const amountX = groupX + groupPadding + singleBarWidth + 2;
      const amountY = PADDING_TOP + chartHeight - amountHeight;

      // Label position (center of group)
      const labelX = groupX + groupWidth / 2;
      const labelY = PADDING_TOP + chartHeight + 14;

      return {
        ...item,
        budgetX,
        budgetY,
        budgetHeight,
        budgetWidth: singleBarWidth,
        amountX,
        amountY,
        amountHeight,
        amountWidth: singleBarWidth,
        labelX,
        labelY,
        groupX,
        groupWidth,
      };
    });
  }, [filteredData, chartWidth, chartHeight, maxValue]);

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= GRID_LINES; i++) {
      const y = PADDING_TOP + (chartHeight / GRID_LINES) * i;
      const value = maxValue - (maxValue / GRID_LINES) * i;
      lines.push({ y, value });
    }
    return lines;
  }, [chartHeight, maxValue]);

  const handlePress = (event: any) => {
    const { locationX } = event.nativeEvent;

    const index = bars.findIndex(
      bar => locationX >= bar.groupX && locationX < bar.groupX + bar.groupWidth,
    );

    if (index !== -1) {
      onSelect(selectedIndex === index ? null : index);
    } else {
      onSelect(null);
    }
  };

  // Truncate long names
  const truncateName = (name: string, maxLen: number = 5) => {
    return name.length > maxLen ? name.substring(0, maxLen) + '..' : name;
  };

  return (
    <View
      style={{ width, height, justifyContent: 'center', alignItems: 'center' }}
    >
      <TouchableWithoutFeedback onPress={handlePress}>
        <View>
          <Canvas style={{ width, height }}>
            {/* Grid lines */}
            {gridLines.map((line, i) => (
              <React.Fragment key={`grid-${i}`}>
                <SkiaLine
                  p1={vec(PADDING_LEFT, line.y)}
                  p2={vec(width - PADDING_RIGHT, line.y)}
                  color="#E8E8E8"
                  strokeWidth={0.5}
                />
              </React.Fragment>
            ))}

            {/* Bars */}
            {bars.map((bar, index) => {
              const isActive = selectedIndex === index;
              const opacity = selectedIndex === null || isActive ? 1 : 0.3;

              return (
                <React.Fragment key={bar.id}>
                  {/* Budget bar (background) */}
                  {bar.budgetHeight > 0 && (
                    <RoundedRect
                      x={bar.budgetX}
                      y={bar.budgetY}
                      width={bar.budgetWidth}
                      height={bar.budgetHeight}
                      r={BAR_RADIUS}
                      color={BUDGET_COLOR}
                      opacity={opacity}
                    />
                  )}

                  {/* Amount bar */}
                  <RoundedRect
                    x={bar.amountX}
                    y={bar.amountY}
                    width={bar.amountWidth}
                    height={bar.amountHeight}
                    r={BAR_RADIUS}
                    color={bar.color}
                    opacity={opacity}
                  />

                  {/* Category label */}
                  {labelFont && (
                    <SkiaText
                      x={
                        bar.labelX -
                        labelFont.measureText(truncateName(bar.name)).width / 2
                      }
                      y={bar.labelY}
                      text={truncateName(bar.name)}
                      font={labelFont}
                      color={
                        isActive
                          ? bar.color
                          : selectedIndex === null
                          ? COLORS.black
                          : '#CCCCCC'
                      }
                    />
                  )}

                  {/* Amount value on top of bar when selected */}
                  {isActive && font && (
                    <SkiaText
                      x={
                        bar.amountX +
                        bar.amountWidth / 2 -
                        font.measureText(formatVND(bar.amount)).width / 2
                      }
                      y={bar.amountY - 6}
                      text={formatVND(bar.amount)}
                      font={font}
                      color={bar.color}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </Canvas>
        </View>
      </TouchableWithoutFeedback>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BUDGET_COLOR }]} />
          <Text style={styles.legendText}>Hạn mức</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.primary }]}
          />
          <Text style={styles.legendText}>Chi tiêu</Text>
        </View>
      </View>

      {/* Selected info tooltip */}
      {selectedIndex !== null && bars[selectedIndex] && (
        <View style={styles.tooltip}>
          <Text
            style={[styles.tooltipName, { color: bars[selectedIndex].color }]}
          >
            {bars[selectedIndex].name}
          </Text>
          <Text style={styles.tooltipValue}>
            {formatVND(bars[selectedIndex].amount)}
            {bars[selectedIndex].budget_limit > 0
              ? ` / ${formatVND(bars[selectedIndex].budget_limit)}`
              : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

export default BarChart;

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#8E8E93',
    fontFamily: 'LexendDeca-Regular',
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  tooltipName: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'LexendDeca-SemiBold',
  },
  tooltipValue: {
    fontSize: 10,
    color: '#8E8E93',
    fontFamily: 'LexendDeca-Regular',
  },
});
