import { Component } from '@angular/core';
import { ListPageComponent } from '../list-page/list-page';

@Component({
  selector: 'app-audits-page',
  standalone: true,
  imports: [ListPageComponent],
  templateUrl: './audits-page.component.html',
  styleUrl: './audits-page.component.css'
})
export class AuditsPageComponent {}
