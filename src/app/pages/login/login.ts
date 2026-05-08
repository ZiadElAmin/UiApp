import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  standalone: false
})
export class Login implements OnInit {
  authForm: FormGroup;
  isLoginMode = true;
  errorMessage: string | null = null;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = null;
  }

  onSubmit() {
    if (this.authForm.invalid) return;

    const { email, password } = this.authForm.value;
    this.errorMessage = null;

    if (this.isLoginMode) {
      // Use .subscribe() as taught in labs
      this.authService.login(email, password).subscribe({
        error: (err) => {
          this.errorMessage = err?.error?.error?.message || 'Login failed. Please try again.';
        }
      });
    } else {
      this.authService.register(email, password);
    }
  }
}
