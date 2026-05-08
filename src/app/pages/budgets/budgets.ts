import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinanceService } from '../../services/finance';
import { Budget } from '../../models/finance.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-budgets',
  templateUrl: './budgets.html',
  styleUrls: ['./budgets.scss'],
  standalone: false
})
export class Budgets implements OnInit {
  budgetForm: FormGroup;
  budgets$: Observable<Budget[]>;

  constructor(private fb: FormBuilder, private financeService: FinanceService) {
    this.budgetForm = this.fb.group({
      category: ['', Validators.required],
      limit: [null, [Validators.required, Validators.min(1)]]
    });
    this.budgets$ = this.financeService.budgets$;
  }

  ngOnInit() {}

  onSubmit() {
    if (this.budgetForm.invalid) return;
    this.financeService.addBudget(this.budgetForm.value);
    this.budgetForm.reset();
  }

  deleteBudget(id: string) {
    if (confirm('Are you sure you want to delete this budget?')) {
      this.financeService.deleteBudget(id);
    }
  }

  // trackBy for *ngFor — Lab 4
  trackById(index: number, item: Budget): string {
    return item.id || index.toString();
  }
}
