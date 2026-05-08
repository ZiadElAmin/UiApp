import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { UserProfile } from '../models/finance.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiKey = environment.firebase.apiKey;
  private signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`;
  private signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`;

  // BehaviorSubject holds the current user — lab taught pattern
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  user$: Observable<UserProfile | null> = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Restore user from localStorage on app load
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.userSubject.next(JSON.parse(savedUser));
    }
  }

  // Register a new user using Firebase Auth REST API
  register(email: string, password: string) {
    const body = { email, password, returnSecureToken: true };
    this.http.post<any>(this.signUpUrl, body).subscribe({
      next: (res) => {
        const user: UserProfile = { uid: res.localId, email: res.email, token: res.idToken };
        this.userSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Register error:', err);
        throw err;
      }
    });
  }

  // Login using Firebase Auth REST API
  login(email: string, password: string): Observable<any> {
    const body = { email, password, returnSecureToken: true };
    const obs = this.http.post<any>(this.signInUrl, body);
    obs.subscribe({
      next: (res) => {
        const user: UserProfile = { uid: res.localId, email: res.email, token: res.idToken };
        this.userSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.router.navigate(['/dashboard']);
      },
      error: (err) => console.error('Login error:', err)
    });
    return obs;
  }

  // Logout
  logout() {
    this.userSubject.next(null);
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  // Get the current user's token for authenticated requests
  getToken(): string | null {
    return this.userSubject.value?.token || null;
  }

  // Get the current user's uid
  getUid(): string | null {
    return this.userSubject.value?.uid || null;
  }
}
