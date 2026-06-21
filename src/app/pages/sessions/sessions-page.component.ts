import { Component } from '@angular/core';
import { ListPageComponent } from '../list-page/list-page';

@Component({
  selector: 'app-sessions-page',
  standalone: true,
  imports: [ListPageComponent],
  templateUrl: './sessions-page.component.html',
  styleUrl: './sessions-page.component.css'
})
export class SessionsPageComponent {}
