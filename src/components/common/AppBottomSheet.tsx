import { COLORS } from '@/theme';
import { SPACING } from '@/theme/constant';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
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
}

const AppBottomSheet = forwardRef<AppBottomSheetRef, AppBottomSheetProps>(
  ({ children, snapPoints, onClose, enableDynamicSizing = false }, ref) => {
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
          style={styles.backdrop}
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

    return (
      <BottomSheetModal
        ref={modalRef}
        snapPoints={defaultSnapPoints}
        enableDynamicSizing={enableDynamicSizing}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onDismiss={onClose}
        handleIndicatorStyle={styles.indicator}
        backgroundStyle={styles.background}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableBlurKeyboardOnGesture
      >
        <BottomSheetScrollView
          style={[
            styles.content,
            enableDynamicSizing && { minHeight: contentMinHeight },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,1)',
  },
  background: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
  },
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
