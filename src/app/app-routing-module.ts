import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { NotFound } from './components/not-found/not-found';
import { Transactions } from './pages/transactions/transactions';
import { Budgets } from './pages/budgets/budgets';
import { Goals } from './pages/goals/goals';
import { Reports } from './pages/reports/reports';
import { AuthGuard } from './guards/auth.guard';




const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',    component: Dashboard,    canActivate: [AuthGuard] },
  { path: 'login',        component: Login },
  { path: 'transactions', component: Transactions, canActivate: [AuthGuard] },
  { path: 'budgets',      component: Budgets,      canActivate: [AuthGuard] },
  { path: 'goals',        component: Goals,        canActivate: [AuthGuard] },
  { path: 'reports',      component: Reports,      canActivate: [AuthGuard] },
  { path: '**',           component: NotFound }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }