export type transferPayload = {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  note?: string;
  categoryId: string;
  userId: string;
  date?: number;
};
