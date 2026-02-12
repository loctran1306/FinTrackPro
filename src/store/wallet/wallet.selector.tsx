import { RootState } from "../store";
import { createSelector } from "@reduxjs/toolkit";

export const selectWallets = createSelector(
    (state: RootState) => state.wallet.wallets,
    (wallets) => {
        const creditWallets = wallets?.filter((wallet) => wallet.wallet_type === 'credit');
        const paymentWallets = wallets?.filter((wallet) => wallet.wallet_type === 'cash' || wallet.wallet_type === 'bank');
        return {
            creditWallets,
            paymentWallets,
        };
    }
);  