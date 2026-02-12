export type TransactionType = {
  id: string;
  category_id: string;
  categories: {
    name: string;
    icon: string;
    color: string;
  };
  wallet_id: string;
  wallet: {
    wallet_type: string;
    display_name: string;
  };
  to_wallet_id: string;
  to_wallet: {
    wallet_type: string;
    display_name: string;
  };
  amount: number;
  type: string;
  note: string;
  date: string;
};

export type TransactionState = {
  loading: boolean;
  transactions: TransactionType[];
  page: number;
  limit: number;
  total: number;
};
