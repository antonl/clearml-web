import { Injectable } from '@angular/core';
import {Store} from '@ngrx/store';
import {filter} from 'rxjs/operators';
import {updateUsageStats} from '../Actions/usage-stats.actions';
import {selectPromptUser} from '../reducers/usage-stats.reducer';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmDialogComponent} from '../../webapp-common/shared/ui-components/overlay/confirm-dialog/confirm-dialog.component';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsageStatsService {

  constructor(
    private store: Store<any>,
    private dialog: MatDialog,
  ) {

    if (!environment.demo) {
      this.store.select(selectPromptUser)
        .pipe(filter(prompt => prompt))
        .subscribe(() => {
          const dialogRef = this.dialog.open(ConfirmDialogComponent,
            {
              data: {
                title: 'Help us improve Trains',
                body: `Please allow the trains server to send anonymous usage metrics so we can better understand how Trains is being used and make it even better.<BR>
  This setting can be changed through the Profile page.`,
                yes: 'Approve',
                no: 'Deny',
                iconClass: 'i-terms',
              }
            });

          dialogRef.afterClosed().subscribe((allowed: boolean) => {
            this.store.dispatch(updateUsageStats({allowed}));
          });
        });
    }
  }
}
