import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinanceService } from '../../services/finance';
import { Goal } from '../../models/finance.model';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-goals',
  templateUrl: './goals.html',
  styleUrls: ['./goals.scss'],
  standalone: false
})
export class Goals implements OnInit, OnDestroy {
  goalForm: FormGroup;
  goals$: Observable<Goal[]>;
  availableBalance: number = 0;
  private sub!: Subscription;

  constructor(private fb: FormBuilder, private financeService: FinanceService) {
    this.goalForm = this.fb.group({
      title: ['', Validators.required],
      targetAmount: [null, [Validators.required, Validators.min(1)]],
      deadline: ['', Validators.required]
    });
    this.goals$ = this.financeService.goals$;
  }

  ngOnInit() {
    // Subscribe to transactions — lab pattern
    this.sub = this.financeService.transactions$.subscribe(transactions => {
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      this.availableBalance = income - expenses;
    });
  }

  onSubmit() {
    if (this.goalForm.invalid) return;
    this.financeService.addGoal(this.goalForm.value);
    this.goalForm.reset();
  }

  addFunds(goal: Goal, amountString: string) {
    const amount = Number(amountString);
    if (!amount || amount <= 0) return;

    if (amount > this.availableBalance) {
      alert(`Insufficient funds! You only have $${this.availableBalance.toFixed(2)} available.`);
      return;
    }

    const newTotal = (goal.currentAmount || 0) + amount;
    this.financeService.updateGoal(goal.id!, newTotal);

    // Log as expense transaction
    this.financeService.addTransaction({
      title: `Transfer to Goal: ${goal.title}`,
      amount: amount,
      type: 'expense',
      category: 'Savings',
      date: new Date().toISOString().split('T')[0]
    });
  }

  deleteGoal(id: string) {
    if (confirm('Are you sure you want to delete this goal?')) {
      this.financeService.deleteGoal(id);
    }
  }

  getPercentage(current: number, target: number): number {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  }

  // trackBy for *ngFor — Lab 4
  trackById(index: number, item: Goal): string {
    return item.id || index.toString();
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }
}
