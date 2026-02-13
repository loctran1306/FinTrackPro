export type Category = {
  id: string;
  name: string;
  limit: number;
  icon: string;
  color: string;
};

export type CategoryState = {
  categories: Category[] | null;
};
