export type CategoryItem = {
  id: string;
  name: string;
  icon: string;
  color: string;
  subtext: string;
  amount: number;
  budget_limit: number;
  percent_total: number;
  percent_limit: number;
  remaining: string;
};

export type CategoryState = {
  categories: CategoryItem[] | null;
  loading: boolean;
};
