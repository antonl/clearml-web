import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Store } from '@ngrx/store';
import { catchError, finalize, switchMap, take, tap } from 'rxjs/operators';
import { EMPTY, Observable, of } from 'rxjs';
import { Role } from '~/business-logic/model/auth/role';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '@common/shared/ui-components/overlay/confirm-dialog/confirm-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiAuthService } from '~/business-logic/api-services/auth.service';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isEditing: boolean;
}

@Component({
  selector: 'sm-role-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="role-management-container">
      <h2>User Role Management</h2>
      <p>Manage user roles within your company</p>

      <div class="table-container">
        <table mat-table [dataSource]="users" class="role-table">
          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let user">{{user.name}}</td>
          </ng-container>

          <!-- Email Column -->
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let user">{{user.email}}</td>
          </ng-container>

          <!-- Role Column -->
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Role</th>
            <td mat-cell *matCellDef="let user">
              <div *ngIf="!user.isEditing">
                {{getRoleName(user.role)}}
              </div>
              <mat-form-field *ngIf="user.isEditing" appearance="outline">
                <mat-select [(ngModel)]="user.role">
                  <mat-option *ngFor="let role of availableRoles" [value]="role.value">
                    {{role.label}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let user">
              <button *ngIf="!user.isEditing" 
                      mat-icon-button 
                      color="primary" 
                      (click)="editUser(user)"
                      [disabled]="loading">
                <mat-icon>edit</mat-icon>
              </button>
              <div *ngIf="user.isEditing" class="edit-actions">
                <button mat-icon-button 
                        color="primary" 
                        (click)="saveRole(user)"
                        [disabled]="loading">
                  <mat-icon>check</mat-icon>
                </button>
                <button mat-icon-button 
                        color="warn" 
                        (click)="cancelEdit(user)"
                        [disabled]="loading">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div *ngIf="loading" class="loading-overlay">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <div *ngIf="users.length === 0 && !loading" class="no-users">
          No users found.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .role-management-container {
      padding: 24px;
    }

    h2 {
      margin-bottom: 8px;
    }

    p {
      margin-bottom: 24px;
      color: var(--color-text-secondary);
    }

    .table-container {
      position: relative;
      overflow: hidden;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .role-table {
      width: 100%;
    }

    .edit-actions {
      display: flex;
      gap: 8px;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(255, 255, 255, 0.7);
    }

    .no-users {
      padding: 24px;
      text-align: center;
      font-style: italic;
      color: var(--color-text-secondary);
    }

    mat-form-field {
      width: 100%;
    }
  `]
})
export class RoleManagementComponent implements OnInit {
  private store = inject(Store);
  private dialog = inject(MatDialog);
  private authService = inject(ApiAuthService);

  users: UserRow[] = [];
  loading = false;
  originalRoles = new Map<string, string>();
  displayedColumns = ['name', 'email', 'role', 'actions'];

  // Role options available for assignment
  availableRoles = [
    { value: 'admin', label: 'Admin' },
    { value: 'superuser', label: 'Superuser' },
    { value: 'user', label: 'User' },
    { value: 'annotator', label: 'Annotator' },
    { value: 'guest', label: 'Guest' }
  ];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    
    // In a real implementation, this would call an API to get users in the company
    // This is a placeholder for your actual API call
    this.getUsersFromAPI()
      .pipe(
        take(1),
        finalize(() => this.loading = false)
      )
      .subscribe(users => {
        this.users = users.map(user => ({
          ...user,
          isEditing: false
        }));
        
        // Store original roles to track changes
        users.forEach(user => {
          this.originalRoles.set(user.id, user.role);
        });
      });
  }

  getUsersFromAPI(): Observable<UserRow[]> {
    // This is a placeholder. In a real implementation, you would call your API here
    // TODO: Replace with actual API call to retrieve users in the current company
    
    // For now, returning mock data
    return of([
      { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', isEditing: false },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user', isEditing: false },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'superuser', isEditing: false }
    ]);
  }

  editUser(user: UserRow): void {
    // Reset any other editing rows
    this.users.forEach(u => {
      if (u.id !== user.id) {
        u.isEditing = false;
        u.role = this.originalRoles.get(u.id) || u.role;
      }
    });
    
    user.isEditing = true;
  }

  cancelEdit(user: UserRow): void {
    user.isEditing = false;
    user.role = this.originalRoles.get(user.id) || user.role;
  }

  saveRole(user: UserRow): void {
    const originalRole = this.originalRoles.get(user.id);
    
    if (originalRole === user.role) {
      // No change, just exit edit mode
      user.isEditing = false;
      return;
    }
    
    // Ask for confirmation before changing role
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Role Change',
        body: `Are you sure you want to change ${user.name}'s role from ${this.getRoleName(originalRole)} to ${this.getRoleName(user.role)}?`,
        yes: 'Confirm',
        no: 'Cancel',
        iconClass: 'al-ico-alert'
      }
    });

    dialogRef.afterClosed().pipe(
      take(1),
      switchMap(result => {
        if (result) {
          this.loading = true;
          // In a real implementation, this would update the user's role through an API
          // TODO: Replace with actual API call to update user role
          
          // Simulating API call
          return of(true).pipe(
            tap(() => {
              // Update original role in our tracking map
              this.originalRoles.set(user.id, user.role);
              user.isEditing = false;
              this.loading = false;
            }),
            catchError(err => {
              console.error('Error updating user role', err);
              // Revert to original role on error
              user.role = originalRole;
              user.isEditing = false;
              this.loading = false;
              return EMPTY;
            })
          );
        } else {
          // Cancelled, revert to original role
          user.role = originalRole;
          user.isEditing = false;
          return EMPTY;
        }
      })
    ).subscribe();
  }

  getRoleName(roleValue: string): string {
    const role = this.availableRoles.find(r => r.value === roleValue);
    return role ? role.label : roleValue;
  }
}