export enum WALLET_TYPE {
  CASH = 'cash',
  CREDIT = 'credit',
  JAR = 'jar',
}

export const WALLET_TYPE_LABEL = {
  [WALLET_TYPE.CASH]: 'Ví tiền mặt',
  [WALLET_TYPE.CREDIT]: 'Ví tín dụng',
  [WALLET_TYPE.JAR]: 'Hũ chi tiêu',
};

/** Alias cho tương thích với BalanceAdjustment */
export const WALLET_TYPES = WALLET_TYPE_LABEL;

export const WALLET_TYPE_ICON: Record<string, string> = {
  [WALLET_TYPE.CASH]: 'sack-dollar',
  [WALLET_TYPE.CREDIT]: 'credit-card',
  [WALLET_TYPE.JAR]: 'piggy-bank',
};

export const WALLET_TYPE_COLOR: Record<string, string> = {
  [WALLET_TYPE.CASH]: '#33cc33',
  [WALLET_TYPE.CREDIT]: '#ff8000',
  [WALLET_TYPE.JAR]: '#ff7d66',
};
