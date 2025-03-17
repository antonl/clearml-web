import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { ApiLoginService } from '~/business-logic/api-services/login.service';
import { catchError, switchMap, take } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { Store } from '@ngrx/store';
import { fetchCurrentUser } from '@common/core/actions/users.actions';
import { UserPreferences } from '@common/user-preferences';

@Component({
  selector: 'sm-sso-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinner],
  template: `
    <div class="callback-container">
      <h2>Logging in...</h2>
      <mat-spinner diameter="40"></mat-spinner>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 24px;
    }

    h2 {
      color: var(--color-text);
      margin: 0;
    }
  `]
})
export class SsoCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loginApi = inject(ApiLoginService);
  private store = inject(Store);
  private userPreferences = inject(UserPreferences);

  ngOnInit(): void {
    // Extract query parameters
    this.route.queryParams.pipe(
      take(1),
      switchMap(params => {
        const code = params['code'];
        const state = params['state'];
        const provider = params['provider'] || this.extractProviderFromRoute();
        
        if (!code || !provider) {
          console.error('Missing required parameters for SSO callback');
          this.router.navigate(['/login']);
          return EMPTY;
        }

        // Process login with the SSO provider
        return this.loginApi.loginSsoLogin({
          provider,
          code,
          state,
          redirect_uri: window.location.origin + '/auth/sso/callback'
        }).pipe(
          switchMap(() => this.userPreferences.loadPreferences()),
          catchError(err => {
            console.error('Error processing SSO login', err);
            this.router.navigate(['/login']);
            return EMPTY;
          })
        );
      })
    ).subscribe(() => {
      // On successful login
      this.store.dispatch(fetchCurrentUser());

      // Try to extract redirect URL from state parameter
      try {
        const stateParam = this.route.snapshot.queryParams['state'];
        if (stateParam) {
          const stateObj = JSON.parse(atob(stateParam));
          if (stateObj.redirect) {
            window.location.href = stateObj.redirect;
            return;
          }
        }
      } catch (e) {
        console.error('Error parsing state parameter', e);
      }

      // Default redirect to dashboard
      this.router.navigate(['/dashboard']);
    });
  }

  private extractProviderFromRoute(): string | null {
    // Extract provider from URL path if it's structured like /auth/sso/callback/:provider
    const segments = this.router.url.split('/');
    const callbackIndex = segments.indexOf('callback');
    if (callbackIndex >= 0 && segments.length > callbackIndex + 1) {
      return segments[callbackIndex + 1];
    }
    return null;
  }
}