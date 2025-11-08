<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // User management
            'view_users',
            'create_users',
            'edit_users',
            'delete_users',
            'manage_roles',

            // Client management
            'view_clients',
            'create_clients',
            'edit_clients',
            'delete_clients',

            // Project management
            'view_all_projects',
            'create_projects',
            'edit_projects',
            'delete_projects',
            'manage_project_users',

            // Task management
            'view_all_tasks',
            'create_tasks',
            'edit_all_tasks',
            'delete_all_tasks',

            // Time tracking
            'view_all_time_entries',
            'edit_all_time_entries',
            'delete_all_time_entries',
            'approve_time_entries',
            'lock_time_entries',

            // Invoicing
            'view_invoices',
            'create_invoices',
            'edit_invoices',
            'delete_invoices',
            'send_invoices',
            'mark_invoices_paid',
            'export_invoices',

            // Expenses
            'view_all_expenses',
            'create_expenses',
            'edit_all_expenses',
            'delete_all_expenses',
            'approve_expenses',

            // Reports
            'view_reports',
            'create_reports',
            'export_reports',
            'view_financial_reports',

            // Settings
            'manage_settings',
            'manage_tenant',
            'manage_integrations',
            'manage_webhooks',

            // API
            'manage_api_keys',
            'access_api'
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions

        // Super Admin - has all permissions
        $superAdmin = Role::create(['name' => 'super-admin']);
        $superAdmin->givePermissionTo(Permission::all());

        // Admin - has most permissions except system management
        $admin = Role::create(['name' => 'admin']);
        $admin->givePermissionTo([
            'view_users', 'create_users', 'edit_users', 'delete_users',
            'view_clients', 'create_clients', 'edit_clients', 'delete_clients',
            'view_all_projects', 'create_projects', 'edit_projects', 'delete_projects', 'manage_project_users',
            'view_all_tasks', 'create_tasks', 'edit_all_tasks', 'delete_all_tasks',
            'view_all_time_entries', 'edit_all_time_entries', 'delete_all_time_entries', 'approve_time_entries', 'lock_time_entries',
            'view_invoices', 'create_invoices', 'edit_invoices', 'delete_invoices', 'send_invoices', 'mark_invoices_paid', 'export_invoices',
            'view_all_expenses', 'create_expenses', 'edit_all_expenses', 'delete_all_expenses', 'approve_expenses',
            'view_reports', 'create_reports', 'export_reports', 'view_financial_reports',
            'manage_settings', 'manage_integrations', 'manage_webhooks',
            'manage_api_keys', 'access_api'
        ]);

        // Manager - can manage projects and approve time/expenses
        $manager = Role::create(['name' => 'manager']);
        $manager->givePermissionTo([
            'view_users',
            'view_clients', 'create_clients', 'edit_clients',
            'view_all_projects', 'create_projects', 'edit_projects', 'manage_project_users',
            'view_all_tasks', 'create_tasks', 'edit_all_tasks',
            'view_all_time_entries', 'approve_time_entries',
            'view_invoices', 'create_invoices', 'edit_invoices', 'send_invoices',
            'view_all_expenses', 'create_expenses', 'approve_expenses',
            'view_reports', 'create_reports', 'export_reports',
            'access_api'
        ]);

        // Employee - basic permissions
        $employee = Role::create(['name' => 'employee']);
        $employee->givePermissionTo([
            'view_clients',
            'create_tasks',
            'create_expenses',
            'view_reports',
            'access_api'
        ]);

        // Accountant - financial permissions
        $accountant = Role::create(['name' => 'accountant']);
        $accountant->givePermissionTo([
            'view_clients',
            'view_all_projects',
            'view_all_time_entries',
            'view_invoices', 'create_invoices', 'edit_invoices', 'send_invoices', 'mark_invoices_paid', 'export_invoices',
            'view_all_expenses', 'approve_expenses',
            'view_reports', 'create_reports', 'export_reports', 'view_financial_reports',
            'access_api'
        ]);

        // Client - limited read-only access
        $client = Role::create(['name' => 'client']);
        $client->givePermissionTo([
            'view_reports',
            'access_api'
        ]);
    }
}