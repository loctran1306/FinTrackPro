import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAppDispatch } from '@/store/hooks';
import { WalletType } from '@/services/wallet/wallet.type';
import { updateWallet } from '@/store/wallet/wallet.slice';
import { getFinanceOverviewThunk } from '@/store/wallet/wallet.thunk';
import { getCategoriesThunk } from '@/store/category/category.thunk';
import { getTransactionsThunk } from '@/store/transaction/transaction.thunk';

const MAX_RETRY = 3;
const RETRY_DELAY_MS = 3000;
const STABILIZE_DELAY_MS = 1500;
const ERROR_STATUSES = ['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'];

const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

export const useWalletsRealtime = (
  userId: string | undefined,
  month: number,
  year: number,
) => {
  console.log('userId', userId);
  const dispatch = useAppDispatch();
  const channelRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isReconnectingRef = useRef(false);
  const channelIdRef = useRef(0);

  const subscribe = useCallback(() => {
    if (!userId) return;

    const doSubscribe = async () => {
      isReconnectingRef.current = true;
      const thisChannelId = ++channelIdRef.current;
      try {
        if (channelRef.current) {
          try {
            await channelRef.current.unsubscribe();
          } catch (_) {}
          channelRef.current = null;
        }

        await supabase.removeAllChannels();
        await delay(STABILIZE_DELAY_MS);

        if (!isMountedRef.current || !userId) return;

        const channel = supabase.channel(`wallets_realtime_${userId}`);

        channel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'wallets',
              filter: `user_id=eq.${userId}`,
            },
            event => {
              const { new: newWallet } = event as { new?: Partial<WalletType> };
              if (newWallet?.id) {
                dispatch(
                  updateWallet({
                    id: newWallet.id,
                    display_name: newWallet.display_name ?? '',
                    wallet_type: newWallet.wallet_type ?? 'cash',
                    current_balance: newWallet.current_balance ?? 0,
                    credit_limit: newWallet.credit_limit ?? 0,
                  }),
                );
                dispatch(getFinanceOverviewThunk());
                dispatch(getCategoriesThunk({ month, year }));
                dispatch(getTransactionsThunk({ userId, page: 1, limit: 10 }));
              }
            },
          )
          .subscribe(status => {
            console.log(`📡 Realtime Status (${status})`);
            if (status === 'SUBSCRIBED') {
              isReconnectingRef.current = false;
              retryCountRef.current = 0;
              return;
            }
            if (ERROR_STATUSES.includes(status)) {
              if (isReconnectingRef.current) return;
              if (thisChannelId !== channelIdRef.current) return;
              if (retryCountRef.current < MAX_RETRY && isMountedRef.current) {
                retryCountRef.current += 1;
                const backoff = RETRY_DELAY_MS * retryCountRef.current;
                console.log(
                  `⚠️ Realtime ${status}, retry ${retryCountRef.current}/${MAX_RETRY} in ${backoff}ms`,
                );
                retryTimeoutRef.current = setTimeout(() => {
                  retryTimeoutRef.current = null;
                  doSubscribe();
                }, backoff);
              } else {
                console.warn(
                  `Realtime failed after ${MAX_RETRY} retries (${status})`,
                );
              }
            }
          });

        channelRef.current = channel;
      } catch (error) {
        isReconnectingRef.current = false;
        console.error('Realtime Setup Error:', error);
        if (
          retryCountRef.current < MAX_RETRY &&
          isMountedRef.current &&
          userId
        ) {
          retryCountRef.current += 1;
          const backoff = RETRY_DELAY_MS * retryCountRef.current;
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            doSubscribe();
          }, backoff);
        }
      }
    };

    doSubscribe();
  }, [userId, month, year, dispatch]);

  useEffect(() => {
    if (!userId) return;
    isMountedRef.current = true;
    retryCountRef.current = 0;
    subscribe();

    const sub = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && userId) {
          console.log('🚀 App Foreground: Reconnecting Realtime...');
          retryCountRef.current = 0;
          setTimeout(subscribe, STABILIZE_DELAY_MS);
        }
      },
    );

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      sub.remove();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe]);
};
