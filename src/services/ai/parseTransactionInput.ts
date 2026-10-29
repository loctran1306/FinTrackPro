import { Q } from '@nozbe/watermelondb';
import { database } from '@/models';
import Category from '@/models/Category';
import Wallet from '@/models/Wallet';
import type { TransactionInput } from './ai.types';
import {
  generateTransactionDraft,
  getAIAvailability,
} from './foundationModels.native';
import { validateTransactionDraft } from './validateTransactionDraft';

export async function parseTransactionInput(
  text: string,
  userId: string,
  locale: string,
) {
  if (__DEV__) console.log('[QuickEntry AI] Input:', text);
  const trimmed = text.trim();
  if (!userId || !trimmed || trimmed.length > 500)
    throw new Error('invalidInput');
  const availability = await getAIAvailability(locale);
  if (!availability.available)
    throw new Error(availability.reason || 'unavailable');
  const [wallets, categories] = await Promise.all([
    database
      .get<Wallet>('wallets')
      .query(
        Q.where('user_id', userId),
        Q.where('is_active', true),
        Q.where('deleted_at', null),
        Q.where('wallet_type', Q.notEq('jar')),
      )
      .fetch(),
    database
      .get<Category>('categories')
      .query(Q.where('user_id', userId), Q.where('deleted_at', null))
      .fetch(),
  ]);
  const now = new Date();
  const input: TransactionInput = {
    text: trimmed,
    today: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(now.getDate()).padStart(2, '0')}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale,
    currency: 'VND',
    wallets: wallets.map(w => ({ id: w.id, name: w.displayName })),
    categories: categories.map(c => ({ id: c.id, name: c.name })),
  };
  // Bound metadata as well as the user's text to leave room for model output.
  if (JSON.stringify(input).length > 6000) throw new Error('contextTooLarge');
  if (__DEV__)
    console.log('[QuickEntry AI] Request:', JSON.stringify(input, null, 2));
  const response = await generateTransactionDraft(input);
  if (__DEV__)
    console.log('[QuickEntry AI] Response:', JSON.stringify(response, null, 2));
  return validateTransactionDraft(response, input);
}
