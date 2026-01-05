
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface BankAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: TransactionType;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export enum AppMode {
  DEMO = 'DEMO',
  PRODUCTION = 'PRODUCTION'
}

export interface UserProfile {
  uid: string;
  email: string | null;
}
