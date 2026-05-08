import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth';
import { Transaction, Budget, Goal } from '../models/finance.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {

  private dbUrl = environment.firebase.databaseURL;

  // BehaviorSubjects — lab taught pattern
  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  transactions$: Observable<Transaction[]> = this.transactionsSubject.asObservable();

  private budgetsSubject = new BehaviorSubject<Budget[]>([]);
  budgets$: Observable<Budget[]> = this.budgetsSubject.asObservable();

  private goalsSubject = new BehaviorSubject<Goal[]>([]);
  goals$: Observable<Goal[]> = this.goalsSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {
    // When user logs in or out, reload or clear data
    this.authService.user$.subscribe(user => {
      if (user) {
        this.loadAll();
      } else {
        this.transactionsSubject.next([]);
        this.budgetsSubject.next([]);
        this.goalsSubject.next([]);
      }
    });
  }

  // ─── HELPERS ────────────────────────────────────────────────

  private getUid(): string {
    return this.authService.getUid() || '';
  }

  // Convert Firebase's object-of-objects response into a typed array with ids
  private toArray<T>(obj: any): T[] {
    if (!obj) return [];
    return Object.keys(obj).map(key => ({ id: key, ...obj[key] }));
  }

  // ─── LOAD ALL DATA ──────────────────────────────────────────

  loadAll() {
    this.loadTransactions();
    this.loadBudgets();
    this.loadGoals();
  }

  loadTransactions() {
    const uid = this.getUid();
    if (!uid) return;

    this.http.get<any>(`${this.dbUrl}/transactions/${uid}.json`).subscribe({
      next: (data) => {
        const list: Transaction[] = this.toArray<Transaction>(data);
        this.transactionsSubject.next(list);
      },
      error: (err) => console.error('Error loading transactions:', err)
    });
  }

  loadBudgets() {
    const uid = this.getUid();
    if (!uid) return;

    this.http.get<any>(`${this.dbUrl}/budgets/${uid}.json`).subscribe({
      next: (data) => {
        const list: Budget[] = this.toArray<Budget>(data);
        this.budgetsSubject.next(list);
      },
      error: (err) => console.error('Error loading budgets:', err)
    });
  }

  loadGoals() {
    const uid = this.getUid();
    if (!uid) return;

    this.http.get<any>(`${this.dbUrl}/goals/${uid}.json`).subscribe({
      next: (data) => {
        const list: Goal[] = this.toArray<Goal>(data);
        this.goalsSubject.next(list);
      },
      error: (err) => console.error('Error loading goals:', err)
    });
  }

  // ─── TRANSACTIONS ───────────────────────────────────────────

  addTransaction(transaction: Transaction) {
    const uid = this.getUid();
    const newTx = { ...transaction, uid };

    console.log('STEP 1: Sending POST', newTx);

    this.http.post<any>(`${this.dbUrl}/transactions/${uid}.json`, newTx).subscribe({
      next: (res) => {
        console.log('STEP 2: POST succeeded, res =', res);
        
        const current = this.transactionsSubject.getValue();
        console.log('STEP 3: current transactions count =', current.length);
        
        const withId = { ...newTx, id: res.name };
        const newList = [withId, ...current];
        
        console.log('STEP 4: pushing new list with count =', newList.length);
        this.transactionsSubject.next(newList);
        console.log('STEP 5: subject.next() called');

        if (newTx.type === 'expense' && newTx.category) {
          this.updateBudgetSpent(newTx.category, Number(newTx.amount));
        }
      },
      error: (err) => console.error('Error adding transaction:', err)
    });
  }

  updateTransaction(id: string, newData: Partial<Transaction>) {
    const uid = this.getUid();

    this.http.put<any>(`${this.dbUrl}/transactions/${uid}/${id}.json`, newData).subscribe({
      next: () => {
        // Update in memory immediately
        const current = this.transactionsSubject.getValue();
        this.transactionsSubject.next(
          current.map(t => t.id === id ? { ...t, ...newData } : t)
        );
        this.recalculateAllBudgets();
      },
      error: (err) => console.error('Error updating transaction:', err)
    });
  }

  deleteTransaction(id: string) {
    const uid = this.getUid();

    const tx = this.transactionsSubject.getValue().find(t => t.id === id);

    this.http.delete<any>(`${this.dbUrl}/transactions/${uid}/${id}.json`).subscribe({
      next: () => {
        // Remove from memory immediately
        const current = this.transactionsSubject.getValue();
        this.transactionsSubject.next(current.filter(t => t.id !== id));

        if (tx && tx.type === 'expense' && tx.category) {
          this.updateBudgetSpent(tx.category, -Number(tx.amount));
        }
      },
      error: (err) => console.error('Error deleting transaction:', err)
    });
  }

  // ─── BUDGETS ────────────────────────────────────────────────

  addBudget(budget: Budget) {
    const uid = this.getUid();
    const newBudget = { ...budget, uid, spent: 0 };

    this.http.post<any>(`${this.dbUrl}/budgets/${uid}.json`, newBudget).subscribe({
      next: () => this.loadBudgets(),
      error: (err) => console.error('Error adding budget:', err)
    });
  }

  updateBudget(id: string, data: Partial<Budget>) {
    const uid = this.getUid();

    this.http.patch<any>(`${this.dbUrl}/budgets/${uid}/${id}.json`, data).subscribe({
      next: () => this.loadBudgets(),
      error: (err) => console.error('Error updating budget:', err)
    });
  }

  deleteBudget(id: string) {
    const uid = this.getUid();

    this.http.delete<any>(`${this.dbUrl}/budgets/${uid}/${id}.json`).subscribe({
      next: () => this.loadBudgets(),
      error: (err) => console.error('Error deleting budget:', err)
    });
  }

  // Update a budget's spent amount by a delta (+amount or -amount)
  private updateBudgetSpent(category: string, delta: number) {
    const budgets = this.budgetsSubject.getValue();
    const budget = budgets.find(b => b.category === category);
    if (!budget || !budget.id) return;

    const newSpent = Math.max(0, (Number(budget.spent) || 0) + delta);
    this.updateBudget(budget.id, { spent: newSpent });
  }

  // Recalculate all budgets from scratch based on current transactions
  recalculateAllBudgets() {
    const transactions = this.transactionsSubject.getValue();
    const budgets = this.budgetsSubject.getValue();

    budgets.forEach(budget => {
      if (!budget.id) return;
      const totalSpent = transactions
        .filter(t => t.type === 'expense' && t.category === budget.category)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      this.updateBudget(budget.id, { spent: totalSpent });
    });
  }

  // ─── GOALS ──────────────────────────────────────────────────

  addGoal(goal: Goal) {
    const uid = this.getUid();
    const newGoal = { ...goal, uid, currentAmount: 0 };

    this.http.post<any>(`${this.dbUrl}/goals/${uid}.json`, newGoal).subscribe({
      next: () => this.loadGoals(),
      error: (err) => console.error('Error adding goal:', err)
    });
  }

  updateGoal(id: string, currentAmount: number) {
    const uid = this.getUid();

    this.http.patch<any>(`${this.dbUrl}/goals/${uid}/${id}.json`, { currentAmount }).subscribe({
      next: () => this.loadGoals(),
      error: (err) => console.error('Error updating goal:', err)
    });
  }

  deleteGoal(id: string) {
    const uid = this.getUid();

    this.http.delete<any>(`${this.dbUrl}/goals/${uid}/${id}.json`).subscribe({
      next: () => this.loadGoals(),
      error: (err) => console.error('Error deleting goal:', err)
    });
  }
}