import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'sm-serving-empty-state',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './serving-empty-state.component.html',
  styleUrl: './serving-empty-state.component.scss'
})
export class ServingEmptyStateComponent {

}
