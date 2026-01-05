
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  ReceiptText, 
  PieChart, 
  Settings, 
  LogOut, 
  Plus, 
  TrendingDown, 
  TrendingUp,
  BrainCircuit,
  AlertCircle,
  Menu,
  X,
  CreditCard
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';

import { AppMode, Transaction, BankAccount, TransactionType, UserProfile } from './types';
import { CATEGORIES, INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, DEMO_USER } from './constants';
import { getFinancialAdvice } from './geminiService';
import { auth, db, isFirebaseEnabled } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';

// --- Helper Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button: React.FC<{ 
  onClick?: () => void; 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}> = ({ onClick, children, variant = 'primary', className, type = "button", disabled }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
    ghost: 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
  };
  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DEMO);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // App State
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // Modals
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);

  // Load Initial Data
  useEffect(() => {
    if (mode === AppMode.DEMO) {
      setUser(DEMO_USER);
      setAccounts(INITIAL_ACCOUNTS);
      setTransactions(INITIAL_TRANSACTIONS);
    } else {
      if (!isFirebaseEnabled()) {
        alert("正式模式需要正確配置 Firebase 環境變數。請在 GitHub Secrets 中設定 FIREBASE_CONFIG。已自動切換回展示模式。");
        setMode(AppMode.DEMO);
        return;
      }
      
      const unsubscribe = onAuthStateChanged(auth!, (firebaseUser) => {
        if (firebaseUser) {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
          loadProductionData(firebaseUser.uid);
        } else {
          setUser(null);
          setAccounts([]);
          setTransactions([]);
        }
      });
      return () => unsubscribe();
    }
  }, [mode]);

  const loadProductionData = async (uid: string) => {
    if (!db) return;
    try {
      const qAcc = query(collection(db, 'accounts'), where('userId', '==', uid));
      const qTrans = query(collection(db, 'transactions'), where('userId', '==', uid));
      
      const accSnap = await getDocs(qAcc);
      const transSnap = await getDocs(qTrans);
      
      setAccounts(accSnap.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount)));
      setTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    } catch (e) {
      console.error("Load Data Error:", e);
    }
  };

  // Auth Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!auth) return;
    
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPass);
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPass);
      }
    } catch (err: any) {
      setAuthError(err.message || '認證失敗，請檢查輸入資訊。');
    }
  };

  const handleLogout = async () => {
    if (mode === AppMode.PRODUCTION && auth) {
      await signOut(auth);
    } else {
      setUser(null);
    }
    setActiveTab('dashboard');
  };

  // AI Analysis
  const handleAiAdvice = async () => {
    setIsAiLoading(true);
    const advice = await getFinancialAdvice(transactions, accounts);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  // Derived Data
  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);
  const monthIncome = useMemo(() => transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((s, t) => s + t.amount, 0), [transactions]);
  const monthExpense = useMemo(() => transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((s, t) => s + t.amount, 0), [transactions]);

  const categoryStats = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE) {
        data[t.category] = (data[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const chartData = useMemo(() => {
    // Basic daily accumulation for the last 7 days (mock logic for demo)
    return Array.from({length: 7}).map((_, i) => ({
      name: `Day ${i + 1}`,
      income: Math.floor(Math.random() * 2000),
      expense: Math.floor(Math.random() * 1500)
    }));
  }, [transactions]);

  // Auth Screen
  if (!user && mode === AppMode.PRODUCTION) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">WealthSense AI</h1>
            <p className="text-slate-500">歡迎來到您的個人智慧財富管家</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">電子郵件</label>
              <input 
                type="email" 
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
              <input 
                type="password" 
                required 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
              />
            </div>
            {authError && <div className="text-rose-500 text-sm">{authError}</div>}
            <Button type="submit" className="w-full py-3">
              {isRegistering ? '註冊帳號' : '登入系統'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-indigo-600 text-sm font-medium hover:underline"
            >
              {isRegistering ? '已有帳號？立即登入' : '還沒有帳號？立即註冊'}
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <button 
              onClick={() => setMode(AppMode.DEMO)}
              className="text-slate-500 text-sm hover:underline"
            >
              切換回展示模式
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-indigo-600" />
          <span className="font-bold">WealthSense</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-full w-64 bg-white border-r border-slate-200 p-6 flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="hidden md:flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">WealthSense AI</span>
        </div>

        <nav className="space-y-1 flex-1">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="控制面板" active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}} />
          <SidebarItem icon={<CreditCard size={20} />} label="銀行帳戶" active={activeTab === 'accounts'} onClick={() => {setActiveTab('accounts'); setIsSidebarOpen(false);}} />
          <SidebarItem icon={<ReceiptText size={20} />} label="財務明細" active={activeTab === 'transactions'} onClick={() => {setActiveTab('transactions'); setIsSidebarOpen(false);}} />
          <SidebarItem icon={<PieChart size={20} />} label="統計報表" active={activeTab === 'reports'} onClick={() => {setActiveTab('reports'); setIsSidebarOpen(false);}} />
        </nav>

        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="px-3 py-2 bg-slate-50 rounded-lg">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">當前模式</p>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold ${mode === AppMode.PRODUCTION ? 'text-emerald-600' : 'text-amber-600'}`}>
                {mode === AppMode.PRODUCTION ? '正式模式' : '展示模式'}
              </span>
              <button 
                onClick={() => setMode(mode === AppMode.DEMO ? AppMode.PRODUCTION : AppMode.DEMO)}
                className="text-xs text-indigo-600 hover:underline"
              >
                切換
              </button>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">登出系統</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {activeTab === 'dashboard' && '早安, ' + (user?.email?.split('@')[0] || '使用者')}
              {activeTab === 'accounts' && '銀行帳戶管理'}
              {activeTab === 'transactions' && '財務交易明細'}
              {activeTab === 'reports' && '財務統計分析'}
            </h2>
            <p className="text-slate-500 mt-1">
              {activeTab === 'dashboard' && '今天來看看您的資產分佈狀況吧。'}
              {activeTab === 'accounts' && '管理您所有的銀行帳戶與目前餘額。'}
              {activeTab === 'transactions' && '追蹤每一筆收入與支出的流向。'}
              {activeTab === 'reports' && '深入了解您的消費習慣。'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowAddTransaction(true)}>
              <Plus size={18} />
              <span>新增收支</span>
            </Button>
          </div>
        </header>

        {/* Dynamic Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard label="總資產淨值" amount={totalBalance} icon={<Wallet className="text-indigo-600" />} color="indigo" />
              <SummaryCard label="本月總收入" amount={monthIncome} icon={<TrendingUp className="text-emerald-600" />} color="emerald" />
              <SummaryCard label="本月總支出" amount={monthExpense} icon={<TrendingDown className="text-rose-600" />} color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Main Chart */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800">資產趨勢分析</h3>
                  <select className="text-sm bg-slate-50 border-none outline-none text-slate-500 font-medium">
                    <option>最近 7 天</option>
                    <option>最近 30 天</option>
                  </select>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                        cursor={{fill: '#f8fafc'}}
                      />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Category Breakdown */}
              <Card className="p-6">
                <h3 className="font-bold text-slate-800 mb-6">支出比例分析</h3>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="h-48 w-48 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={categoryStats}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    {categoryStats.slice(0, 4).map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{backgroundColor: ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'][i % 5]}} />
                          <span className="text-sm text-slate-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold">${item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* AI Advice Section */}
            <Card className="p-8 bg-indigo-900 text-white border-none relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 bg-indigo-500/30 rounded-3xl flex items-center justify-center shrink-0">
                  <BrainCircuit size={40} className="text-indigo-200" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-2">WealthSense AI 智慧診斷</h3>
                  <p className="text-indigo-200 mb-6 max-w-xl">
                    根據您的收支模式與預算目標，AI 將為您量身打造專屬的財務改善建議。
                  </p>
                  {!aiAdvice ? (
                    <Button 
                      variant="secondary" 
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                      onClick={handleAiAdvice}
                      disabled={isAiLoading}
                    >
                      {isAiLoading ? '分析中...' : '開始 AI 智慧分析'}
                    </Button>
                  ) : (
                    <div className="bg-white/10 rounded-xl p-6 text-left text-sm whitespace-pre-wrap border border-white/10">
                      {aiAdvice}
                    </div>
                  )}
                </div>
              </div>
              {/* Decoration Circle */}
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </Card>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(acc => (
              <Card key={acc.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 ${acc.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                    <Wallet size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded uppercase">{acc.type}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">{acc.name}</h4>
                <p className="text-2xl font-black text-slate-900 mb-4">${acc.balance.toLocaleString()}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 text-xs">詳情</Button>
                  <Button variant="secondary" className="flex-1 text-xs">設定</Button>
                </div>
              </Card>
            ))}
            <button 
              onClick={() => setShowAddAccount(true)}
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all bg-white/50"
            >
              <Plus size={32} />
              <span className="font-bold">新增銀行帳戶</span>
            </button>
          </div>
        )}

        {activeTab === 'transactions' && (
          <Card>
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <input 
                  type="text" 
                  placeholder="搜尋交易、分類或描述..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm border-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="absolute left-3 top-2.5 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="text-xs">篩選條件</Button>
                <Button variant="secondary" className="text-xs">匯出報表</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">日期</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">類別</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">描述</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">帳戶</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">{t.date}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                          {CATEGORIES.find(c => c.name === t.category)?.icon}
                          {t.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{t.description}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {accounts.find(a => a.id === t.accountId)?.name || '未知帳戶'}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}${t.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-6">
                  <h3 className="font-bold text-slate-800 mb-6">年度收支概況</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="income" name="收入" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="支出" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="p-6">
                   <h3 className="font-bold text-slate-800 mb-6">資產分配情況</h3>
                   <div className="space-y-6">
                      {accounts.map(acc => (
                        <div key={acc.id}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-slate-600">{acc.name}</span>
                            <span className="font-bold text-slate-900">{Math.round((acc.balance / totalBalance) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${acc.color}`} 
                              style={{width: `${(acc.balance / totalBalance) * 100}%`}}
                            />
                          </div>
                        </div>
                      ))}
                   </div>
                </Card>
             </div>
          </div>
        )}
      </main>

      {/* Modals - Simplified for UI demo */}
      {showAddTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">新增財務紀錄</h3>
              <button onClick={() => setShowAddTransaction(false)}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <Button variant="secondary" className="border-indigo-600 text-indigo-600 bg-indigo-50">支出</Button>
                 <Button variant="secondary">收入</Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">金額</label>
                  <input type="number" placeholder="0.00" className="w-full px-4 py-3 rounded-lg border border-slate-200 text-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">類別</label>
                  <select className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
                    {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <input type="text" placeholder="輸入交易明細..." className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddTransaction(false)}>取消</Button>
                <Button className="flex-1" onClick={() => setShowAddTransaction(false)}>儲存交易紀錄</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">新增銀行帳戶</h3>
              <button onClick={() => setShowAddAccount(false)}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">帳戶名稱</label>
                <input type="text" placeholder="例如：台新 Richart" className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">初始餘額</label>
                <input type="number" placeholder="0" className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">帳戶類型</label>
                <select className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>儲蓄帳戶</option>
                  <option>信用卡</option>
                  <option>投資帳戶</option>
                  <option>現金</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddAccount(false)}>取消</Button>
                <Button className="flex-1" onClick={() => setShowAddAccount(false)}>建立帳戶</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// --- Sub-components for Sidebar & Summary ---

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
        : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const SummaryCard: React.FC<{ label: string; amount: number; icon: React.ReactNode; color: 'indigo' | 'emerald' | 'rose' }> = ({ label, amount, icon, color }) => {
  const colors = {
    indigo: 'bg-indigo-50',
    emerald: 'bg-emerald-50',
    rose: 'bg-rose-50'
  };
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${colors[color]} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-black text-slate-900">${amount.toLocaleString()}</p>
        </div>
      </div>
    </Card>
  );
};

export default App;
