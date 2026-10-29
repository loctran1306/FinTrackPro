import React from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Theme } from '@/theme';
import { SPACING, RADIUS } from '@/theme/constant';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const AppModal = ({ visible, onClose, children }: Props) => {
  const { colors } = useTheme<Theme>();
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng popup" />
        <View style={[styles.panel, {
          backgroundColor: colors.card,
          width: Math.min(width - SPACING.m * 2, 440), maxHeight: height * 0.84,
        }]}>{children}</View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,10,20,0.52)', alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: RADIUS.xl, padding: SPACING.l, overflow: 'hidden' },
});
export default AppModal;
