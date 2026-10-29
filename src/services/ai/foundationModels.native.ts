import { NativeModules, Platform } from 'react-native';
import type { AIAvailability, TransactionInput } from './ai.types';

interface FoundationModelsModule {
  getAvailability(locale: string): Promise<AIAvailability>;
  parseTransaction(input: TransactionInput): Promise<unknown>;
}

const nativeModule = (): FoundationModelsModule | undefined =>
  Platform.OS === 'ios' ? NativeModules.FinTrackFoundationModels : undefined;

export async function getAIAvailability(
  locale: string,
): Promise<AIAvailability> {
  if (Platform.OS !== 'ios') {
    return { available: false, reason: 'unsupportedPlatform' };
  }
  const module = nativeModule();
  if (!module) return { available: false, reason: 'nativeModuleMissing' };
  return module.getAvailability(locale);
}

export async function generateTransactionDraft(input: TransactionInput) {
  const module = nativeModule();
  if (!module) throw new Error('nativeModuleMissing');
  return module.parseTransaction(input);
}
