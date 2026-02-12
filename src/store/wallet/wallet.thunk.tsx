import { createAsyncThunk } from "@reduxjs/toolkit";
import { walletService } from "@/services/wallet/wallet.service";
import { WalletCreateType, WalletTransferType } from "@/services/wallet/wallet.type";

export const getFinanceOverviewThunk = createAsyncThunk('wallet/getFinanceOverview', async (_, thunkAPI) => {
    try {
        const response = await walletService.getFinancialAccounts();
        return response;
    } catch (error) {
        return thunkAPI.rejectWithValue(error);
    }
});

export const getWalletsThunk = createAsyncThunk('wallet/getWallets', async (userId: string, thunkAPI) => {
    try {
        const response = await walletService.getWallets(userId);
        return response;
    } catch (error) {
        return thunkAPI.rejectWithValue(error);
    }
});

export const createWalletThunk = createAsyncThunk('wallet/createWallet', async (walletData: WalletCreateType, thunkAPI) => {
    try {
        const response = await walletService.createWallet(walletData);
        return response;
    } catch (error) {
        return thunkAPI.rejectWithValue(error);
    }
});

export const transferWalletThunk = createAsyncThunk('wallet/transferWallet', async (walletTransferData: WalletTransferType, thunkAPI) => {
    try {
        const response = await walletService.transfer(walletTransferData);
        if (response) {
            return walletTransferData;
        }
    } catch (error) {
        return thunkAPI.rejectWithValue(error);
    }
});