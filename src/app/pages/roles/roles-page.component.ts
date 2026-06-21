import { Component } from '@angular/core';
import { ListPageComponent } from '../list-page/list-page';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [ListPageComponent],
  templateUrl: './roles-page.component.html',
  styleUrl: './roles-page.component.css'
})
export class RolesPageComponent {}
