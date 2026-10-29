import type { TransactionDraft, TransactionInput } from './ai.types';

// Treat native/model output as untrusted, even with guided generation.
export function validateTransactionDraft(
  value: unknown,
  input: TransactionInput,
): TransactionDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalidOutput');
  }
  const raw = value as Record<string, unknown>;
  if (raw.status === 'multiple' || raw.status === 'unsupported') {
    throw new Error(raw.status);
  }
  if (raw.status !== 'single') throw new Error('invalidOutput');
  const type =
    raw.type === 'expense' || raw.type === 'income' ? raw.type : null;
  const amount =
    typeof raw.amount === 'number' &&
    Number.isSafeInteger(raw.amount) &&
    raw.amount > 0
      ? raw.amount
      : null;
  let date: string | null = null;
  if (typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)) {
    const [year, month, day] = raw.date.split('-').map(Number);
    const parsed = new Date(year, month - 1, day, 12);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      date = raw.date;
    }
  }
  return {
    type,
    amount,
    date,
    walletId: input.wallets.find(w => w.id === raw.walletId)?.id ?? null,
    categoryId:
      type === 'expense'
        ? input.categories.find(c => c.id === raw.categoryId)?.id ?? null
        : null,
    note: typeof raw.note === 'string' ? raw.note.slice(0, 500) : input.text,
  };
}
