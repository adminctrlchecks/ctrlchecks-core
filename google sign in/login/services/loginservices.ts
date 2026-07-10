import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { CartService } from '../../cart-details/services/cartservice';
import { API_BASE_URL } from '../../config/api.config';
import {LoginResponse} from '../../models.ts/login-response.model';


@Injectable({
  providedIn: 'root'
})
export class LoginService {

   private BASE_URL = `${API_BASE_URL}/api/auth`;

  private userState = new BehaviorSubject<any>(this.getUser());
  userState$ = this.userState.asObservable();

  private adminState = new BehaviorSubject<any>(this.getAdmin());
  adminState$ = this.adminState.asObservable();

  constructor(
    private http: HttpClient,
    private cartService: CartService
  ) {}

  // login(email: string, password: string) {
  //   return this.http.post<any>(`${this.BASE_URL}/login`, { email, password });
  // }
login(data: { email: string; password: string }) {
    return this.http.post<LoginResponse>(
      `${this.BASE_URL}/login`,
      data
    );
  }

  register(data: any) {
    return this.http.post<any>(`${this.BASE_URL}/register`, data);
  }

  googleRegister(credential: string) {
    return this.http.post<any>(
      `${this.BASE_URL}/google`,
      { token: credential }
    );
  }

  // saveSession(token: string, user: any) {
  //   sessionStorage.setItem('token', token);
  //   sessionStorage.setItem('user', JSON.stringify(user));
  //   if (user?.user_id || user?.id) {
  //     sessionStorage.setItem('userId', String(user.user_id || user.id));
  //   }
  //   this.userState.next(user);

  //   this.cartService.clearCart(true);

  //   const userId = this.getUserId();
  //   if (userId) {
  //     this.cartService.loadCartForUser(userId, token);
  //   }
  // }
  saveSession(token: string, user: any) {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));

  if (user?.user_id || user?.id) {
    sessionStorage.setItem('userId', String(user.user_id || user.id));
  }

  this.userState.next(user);

  // ✅ NEW CART FLOW
  this.cartService.syncCartAfterLogin(token);
}


  // logout() {
  //   sessionStorage.clear();
  //   localStorage.removeItem('userId');
  //   localStorage.removeItem('token');
  //   this.cartService.clearCart(true);
  //   this.userState.next(null);
  // }
  logout() {
  sessionStorage.clear();
  localStorage.removeItem('guest_cart'); // 👈 important
  this.cartService.clearLocalCart();     // 👈 new method
  this.userState.next(null);
}


  isLoggedIn(): boolean {
    const token = sessionStorage.getItem('token');
    return !!token && token.split('.').length === 3;
  }

  adminLogin(email: string, password: string) {
    return this.http.post<any>(`${this.BASE_URL}/admin/login`, { email, password });
  }

  saveAdminSession(token: string) {
    sessionStorage.setItem('adminToken', token);
    this.adminState.next({ token });
  }

  adminLogout() {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('admin');
  }

  getAdmin() {
    const token = sessionStorage.getItem('adminToken');
    return token ? { token } : null;
  }

  getUser() {
    return JSON.parse(sessionStorage.getItem('user') || 'null');
  }

  getUserId() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.user_id || user.id || null;
  }
  getToken(): string | null {
  return sessionStorage.getItem('token');
}

}
