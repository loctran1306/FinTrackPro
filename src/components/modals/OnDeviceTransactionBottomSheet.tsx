import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { AppState, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AppBottomSheetRef } from '@/components/common/AppBottomSheet';
import QuickTransactionBottomSheet from './QuickTransactionBottomSheet';
import { getAIAvailability } from '@/services/ai/foundationModels.native';
import { parseTransactionInput } from '@/services/ai/parseTransactionInput';
import type { AIAvailability, TransactionDraft } from '@/services/ai/ai.types';

export default forwardRef<
  AppBottomSheetRef,
  {
    userId: string;
    onDraft: (draft: TransactionDraft) => void;
  }
>(function OnDeviceTransactionBottomSheet({ userId, onDraft }, ref) {
  const { i18n } = useTranslation();
  const sheet = useRef<AppBottomSheetRef>(null);
  const request = useRef(0);
  const running = useRef(false);
  const [availability, setAvailability] = useState<AIAvailability | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      setAvailability(null);
      getAIAvailability(i18n.language).then(
        result => {
          if (active) setAvailability(result);
        },
        () => {
          if (active)
            setAvailability({ available: false, reason: 'unavailable' });
        },
      );
    };
    refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      request.current += 1;
      subscription.remove();
    };
  }, [i18n.language, userId]);

  const open = async () => {
    const id = request.current;
    sheet.current?.expand();
    setAvailability(null);
    try {
      const result = await getAIAvailability(i18n.language);
      if (id === request.current) setAvailability(result);
    } catch {
      if (id === request.current)
        setAvailability({ available: false, reason: 'unavailable' });
    }
  };

  const generate = async () => {
    if (running.current || !availability?.available || !text.trim() || !userId)
      return;
    running.current = true;
    const id = ++request.current;
    setBusy(true);
    setError(null);
    Keyboard.dismiss();
    try {
      const draft = await parseTransactionInput(text, userId, i18n.language);
      if (id !== request.current) return;
      onDraft(draft);
      sheet.current?.close();
    } catch (cause) {
      if (id !== request.current) return;
      const failure = cause as { code?: string; message?: string };
      const reason = failure.code || failure.message || 'generationFailed';
      if (
        [
          'modelNotReady',
          'appleIntelligenceNotEnabled',
          'deviceNotEligible',
          'unsupportedLanguage',
          'unsupportedOS',
          'unsupportedPlatform',
          'nativeModuleMissing',
          'unavailable',
        ].includes(reason)
      ) {
        setAvailability({ available: false, reason });
      } else {
        setError(reason);
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  useImperativeHandle(ref, () => ({
    expand: open,
    close: () => sheet.current?.close(),
  }));

  return (
    <QuickTransactionBottomSheet
      ref={sheet}
      input={text}
      onChangeText={setText}
      onSubmit={generate}
      busy={busy}
      checkingModel={availability === null}
      modelAvailable={availability?.available === true}
      canSend={
        !busy && availability?.available === true && !!text.trim() && !!userId
      }
      error={error}
      onClose={() => {
        request.current += 1;
        setError(null);
      }}
    />
  );
});
