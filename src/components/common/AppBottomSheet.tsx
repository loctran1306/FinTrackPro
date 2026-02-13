import { COLORS, Theme } from '@/theme';
import { SPACING } from '@/theme/constant';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@shopify/restyle';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Dimensions, Keyboard, StyleSheet } from 'react-native';

export interface AppBottomSheetRef {
  expand: () => void;
  close: () => void;
}

interface AppBottomSheetProps {
  children: React.ReactNode;
  snapPoints?: Array<string | number>;
  onClose?: () => void;
  /** Dùng để xử lý khi snap points bị đo sai (sheet mở nhỏ) */
  enableDynamicSizing?: boolean;
  /** Có cho phép cuộn nội dung không (mặc định true) */
  isScrollable?: boolean;
  /** Ẩn thanh kéo (handle indicator) */
  hideIndicator?: boolean;
  /** Ẩn backdrop */
  hideBackdrop?: boolean;
}

const AppBottomSheet = forwardRef<AppBottomSheetRef, AppBottomSheetProps>(
  (
    {
      children,
      snapPoints,
      onClose,
      enableDynamicSizing = false,
      isScrollable = true,
      hideIndicator = false,
      hideBackdrop = false,
    },
    ref,
  ) => {
    const { colors } = useTheme<Theme>();
    const modalRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      expand: () => (modalRef.current as any)?.present(),
      close: () => (modalRef.current as any)?.dismiss(),
    }));

    const screenHeight = Dimensions.get('window').height;
    const defaultSnapPoints = useMemo(
      () =>
        enableDynamicSizing
          ? undefined
          : snapPoints || [Math.round(screenHeight * 0.45)],
      [snapPoints, screenHeight, enableDynamicSizing],
    );
    const contentMinHeight = Math.round(screenHeight * 0.9);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
          pressBehavior="close"
          style={{
            backgroundColor: hideBackdrop ? 'transparent' : 'rgba(0,0,0,1)',
          }}
        />
      ),
      [],
    );

    // Listen for keyboard dismiss to snap back to first snap point
    useEffect(() => {
      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          // Snap to first snap point (index 0) when keyboard is dismissed
          modalRef.current?.snapToIndex(0);
        },
      );

      return () => {
        keyboardDidHideListener.remove();
      };
    }, []);

    const renderContent = () => {
      if (isScrollable) {
        return (
          <BottomSheetScrollView
            style={[
              styles.content,
              enableDynamicSizing && { minHeight: contentMinHeight },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </BottomSheetScrollView>
        );
      }
      return (
        <BottomSheetView style={styles.content}>{children}</BottomSheetView>
      );
    };

    return (
      <BottomSheetModal
        ref={modalRef}
        snapPoints={defaultSnapPoints}
        enableDynamicSizing={enableDynamicSizing}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onDismiss={onClose}
        handleIndicatorStyle={
          hideIndicator ? { width: 0, height: 0, opacity: 0 } : styles.indicator
        }
        backgroundStyle={{
          backgroundColor: colors.main,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
        }}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableBlurKeyboardOnGesture
      >
        {renderContent()}
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: COLORS.primary,
    width: 40,
  },
  content: {
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.l,
  },
});

export default AppBottomSheet;
