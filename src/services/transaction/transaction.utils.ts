import { TransactionType } from './transaction.type';
type RelationOrArray<T> = T | T[] | null;
const normalizeRelation = <T>(value: RelationOrArray<T>, fallback: T): T => {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
};

export const normalizedResponseTransaction = (
  response: any,
): TransactionType => {
  return {
    id: response.id,
    category_id: response.category_id,
    categories: normalizeRelation(response.categories, {
      name: '',
      icon: '',
      color: '',
    }),
    wallet_id: response.wallet_id,
    wallet: normalizeRelation(response.wallet, {
      wallet_type: '',
      display_name: '',
    }),
    to_wallet_id: response.to_wallet_id,
    to_wallet: normalizeRelation(response.to_wallet, {
      wallet_type: '',
      display_name: '',
    }),
    amount: response.amount,
    type: response.type,
    note: response.note,
    date: response.date,
  };
};
