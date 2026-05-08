import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinanceService } from '../../services/finance';
import { Transaction, Budget } from '../../models/finance.model';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.html',
  styleUrls: ['./transactions.scss'],
  standalone: false
})
export class Transactions implements OnInit, OnDestroy {
  transactionForm: FormGroup;

  // Plain arrays instead of MatTableDataSource
  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  searchTerm: string = '';

  editingId: string | null = null;
  budgets$: Observable<Budget[]>;

  private sub!: Subscription;

  constructor(private fb: FormBuilder, private financeService: FinanceService, private cdr: ChangeDetectorRef) {
    this.budgets$ = this.financeService.budgets$;

    this.transactionForm = this.fb.group({
      title: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      category: [''],
      date: [new Date().toISOString().split('T')[0], Validators.required]
    });
  }

 ngOnInit() {
  this.sub = this.financeService.transactions$.subscribe(data => {
    this.allTransactions = [...data].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    this.applyFilter();
    this.cdr.detectChanges();  
  });
}

  
  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredTransactions = this.allTransactions;
    } else {
      this.filteredTransactions = this.allTransactions.filter(t =>
        t.title.toLowerCase().includes(term) ||
        t.type.toLowerCase().includes(term) ||
        (t.category || '').toLowerCase().includes(term)
      );
    }
  }

  onSearchInput(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilter();
  }

  editTransaction(transaction: Transaction) {
    this.editingId = transaction.id!;
    this.transactionForm.patchValue({
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category || '',
      date: transaction.date
    });
  }

  cancelEdit() {
    this.editingId = null;
    this.transactionForm.reset({
      type: 'expense',
      date: new Date().toISOString().split('T')[0]
    });
  }

  onSubmit() {
    if (this.transactionForm.invalid) return;

    if (this.editingId) {
      this.financeService.updateTransaction(this.editingId, this.transactionForm.value);
      this.editingId = null;
    } else {
      this.financeService.addTransaction(this.transactionForm.value);
    }

    this.transactionForm.reset({
      type: 'expense',
      date: new Date().toISOString().split('T')[0]
    });
  }

  deleteTransaction(id: string) {
    if (confirm('Are you sure you want to delete this?')) {
      this.financeService.deleteTransaction(id);
      if (this.editingId === id) this.cancelEdit();
    }
  }

  // trackBy for *ngFor — taught in Lab 4
  trackById(index: number, item: any): string {
    return item.id || index.toString();
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }
}