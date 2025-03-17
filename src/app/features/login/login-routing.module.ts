import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from '../../webapp-common/login/login/login.component';
import { SsoCallbackComponent } from '../../webapp-common/login/sso-callback/sso-callback.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'signup', component: LoginComponent },
  { path: 'auth/sso/callback', component: SsoCallbackComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule { }
