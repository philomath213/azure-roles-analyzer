import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RoleService } from './services';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly roleService = inject(RoleService);

  protected readonly roles = this.roleService.roles;
  protected readonly roleCount = this.roleService.roleCount;
  protected readonly builtInCount = this.roleService.builtInRoles;
  protected readonly customCount = this.roleService.customRoles;
  protected readonly loading = this.roleService.loading;
  protected readonly error = this.roleService.error;

  ngOnInit(): void {
    this.roleService.loadRoles();
  }
}
