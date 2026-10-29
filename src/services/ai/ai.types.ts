export type AIAvailability = {
  available: boolean;
  reason?: string;
};

export type TransactionDraft = {
  type: 'expense' | 'income' | null;
  amount: number | null;
  date: string | null;
  walletId: string | null;
  categoryId: string | null;
  note: string;
};

export type TransactionInput = {
  text: string;
  today: string;
  timezone: string;
  locale: string;
  currency: 'VND';
  wallets: { id: string; name: string }[];
  categories: { id: string; name: string }[];
};
