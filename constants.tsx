
import React from 'react';
import { 
  Utensils, 
  Car, 
  ShoppingBag, 
  Home, 
  Zap, 
  HeartPulse, 
  Tv, 
  Briefcase, 
  TrendingUp, 
  PlusCircle,
  HelpCircle
} from 'lucide-react';

export const CATEGORIES = [
  { id: 'food', name: '飲食', icon: <Utensils className="w-4 h-4" /> },
  { id: 'transport', name: '交通', icon: <Car className="w-4 h-4" /> },
  { id: 'shopping', name: '購物', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'housing', name: '居住', icon: <Home className="w-4 h-4" /> },
  { id: 'utilities', name: '水電瓦斯', icon: <Zap className="w-4 h-4" /> },
  { id: 'health', name: '醫療', icon: <HeartPulse className="w-4 h-4" /> },
  { id: 'entertainment', name: '娛樂', icon: <Tv className="w-4 h-4" /> },
  { id: 'salary', name: '薪資', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'investment', name: '投資', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'other', name: '其他', icon: <HelpCircle className="w-4 h-4" /> },
];

export const ACCOUNT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-slate-700'
];

export const DEMO_USER = {
  uid: 'demo-user-123',
  email: 'demo@example.com'
};

export const INITIAL_ACCOUNTS = [
  { id: 'acc1', name: '中國信託', type: '儲蓄', balance: 50000, color: 'bg-blue-500' },
  { id: 'acc2', name: '台新 Richart', type: '儲蓄', balance: 12000, color: 'bg-rose-500' }
];

export const INITIAL_TRANSACTIONS = [
  { id: 't1', accountId: 'acc1', amount: 35000, category: '薪資', description: '2月薪資', date: '2024-02-05', type: 'INCOME' },
  { id: 't2', accountId: 'acc1', amount: 150, category: '飲食', description: '午餐便當', date: '2024-02-10', type: 'EXPENSE' },
  { id: 't3', accountId: 'acc2', amount: 1200, category: '購物', description: '新衣服', date: '2024-02-11', type: 'EXPENSE' },
  { id: 't4', accountId: 'acc1', amount: 500, category: '交通', description: '加油', date: '2024-02-12', type: 'EXPENSE' }
];
