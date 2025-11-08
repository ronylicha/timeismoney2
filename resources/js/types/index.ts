// User Types
export interface User {
    id: string;
    name: string;
    email: string;
    email_verified_at?: string;
    tenant_id: string;
    role: string;
    avatar?: string;
    timezone?: string;
    locale?: string;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
}

// Tenant Types
export interface Tenant {
    id: string;
    name: string;
    domain?: string;
    plan: 'individual' | 'team' | 'enterprise';
    max_users: number;
    trial_ends_at?: string;
    subscription_ends_at?: string;
    settings?: TenantSettings;
    created_at: string;
    updated_at: string;
}

export interface TenantSettings {
    default_currency: string;
    timezone: string;
    date_format: string;
    time_format: string;
    week_starts_on: number;
    invoice_prefix?: string;
    invoice_starting_number?: number;
    tax_rate?: number;
    company_info?: CompanyInfo;
}

export interface CompanyInfo {
    name?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    vat_number?: string;
    siret?: string;
    naf_code?: string;
}

// Client Types
export interface Client {
    id: string;
    tenant_id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    vat_number?: string;
    siret?: string;
    website?: string;
    notes?: string;
    client_type: 'individual' | 'company' | 'government';
    is_active: boolean;
    contacts?: ClientContact[];
    created_at: string;
    updated_at: string;
}

export interface ClientContact {
    id: string;
    client_id: string;
    name: string;
    email?: string;
    phone?: string;
    position?: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

// Project Types
export interface Project {
    id: string;
    tenant_id: string;
    client_id: string;
    name: string;
    code?: string;
    description?: string;
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    billable_type: 'hourly' | 'fixed' | 'milestone' | 'non_billable';
    hourly_rate?: number;
    budget?: number;
    estimated_hours?: number;
    start_date?: string;
    end_date?: string;
    color?: string;
    client?: Client;
    users?: User[];
    tasks?: Task[];
    created_at: string;
    updated_at: string;
}

// Task Types
export interface Task {
    id: string;
    tenant_id: string;
    project_id: string;
    parent_id?: string;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: string;
    estimated_hours?: number;
    actual_hours?: number;
    start_date?: string;
    due_date?: string;
    completed_at?: string;
    position: number;
    is_billable: boolean;
    hourly_rate?: number;
    tags?: string[];
    project?: Project;
    assignee?: User;
    subtasks?: Task[];
    created_at: string;
    updated_at: string;
}

// Time Entry Types
export interface TimeEntry {
    id: string;
    tenant_id: string;
    user_id: string;
    project_id: string;
    task_id?: string;
    invoice_id?: string;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
    description?: string;
    is_billable: boolean;
    hourly_rate: number;
    is_locked: boolean;
    user?: User;
    project?: Project;
    task?: Task;
    invoice?: Invoice;
    created_at: string;
    updated_at: string;
}

// Invoice Types - Conformité française avec multi-acomptes
export type InvoiceType = 'invoice' | 'advance' | 'final' | 'credit_note' | 'quote' | 'recurring';

export interface FrenchLegalMentions {
    payment_conditions?: string;
    late_payment_penalty_rate: number;
    recovery_indemnity: number;
    early_payment_discount?: number;
    vat_exemption_reason?: string;
}

export interface InvoiceAdvanceLink {
    id: number;
    final_invoice_id: number;
    advance_invoice_id: number;
    advance_amount: number;
    created_at: string;
    updated_at: string;
    advance_invoice?: Invoice;
}

export interface Invoice {
    id: string;
    tenant_id: string;
    client_id: string;
    project_id?: string;
    invoice_number: string;
    sequential_number: number;
    invoice_date: string;
    due_date: string;
    status: 'draft' | 'pending' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
    payment_status: 'unpaid' | 'partial' | 'paid';

    // Type de facture française
    type: InvoiceType;

    // Champs acompte
    advance_percentage?: number;

    // Relations multi-acomptes (pour facture de SOLDE)
    advances?: Invoice[];
    total_advances?: number;
    remaining_balance?: number;

    // Relation solde (pour facture d'ACOMPTE)
    final_invoice?: Invoice[];
    is_linked_to_final?: boolean;

    // Montants
    subtotal: number;
    tax_rate?: number;
    tax_amount: number;
    discount_amount?: number;
    discount_type?: 'fixed' | 'percentage';
    total: number;
    paid_amount?: number;
    currency: string;
    payment_terms?: number;

    // Mentions légales françaises (Article 441-3 Code de commerce)
    legal_mentions?: string;
    payment_conditions?: string;
    late_payment_penalty_rate?: number; // 19.59% (3× taux légal 2025)
    recovery_indemnity?: number; // 40€ obligatoire
    early_payment_discount?: number;

    notes?: string;
    footer?: string;
    is_locked: boolean;
    sent_at?: string;
    viewed_at?: string;
    paid_at?: string;

    // NF525 compliance
    hash?: string;
    previous_hash?: string;

    // Relations
    client?: Client;
    project?: Project;
    items?: InvoiceItem[];
    payments?: Payment[];

    created_at: string;
    updated_at: string;
}

export interface InvoiceItem {
    id: string;
    invoice_id: string;
    type: 'time' | 'expense' | 'product' | 'service' | 'other';
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    tax_amount?: number;
    discount_amount?: number;
    total: number;
    time_entry_ids?: string[];
    expense_id?: string;
    position: number;
    created_at: string;
    updated_at: string;
}

// Payment Types
export interface Payment {
    id: string;
    invoice_id: string;
    client_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    notes?: string;
    gateway_response?: any;
    invoice?: Invoice;
    client?: Client;
    created_at: string;
    updated_at: string;
}

// Expense Types
export interface Expense {
    id: string;
    tenant_id: string;
    user_id: string;
    project_id?: string;
    category_id?: string;
    invoice_id?: string;
    description: string;
    amount: number;
    expense_date: string;
    is_billable: boolean;
    is_reimbursable: boolean;
    receipt_path?: string;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
    approved_by?: string;
    approved_at?: string;
    user?: User;
    project?: Project;
    category?: ExpenseCategory;
    invoice?: Invoice;
    created_at: string;
    updated_at: string;
}

export interface ExpenseCategory {
    id: string;
    tenant_id: string;
    name: string;
    code?: string;
    description?: string;
    icon?: string;
    color?: string;
    is_active: boolean;
    is_billable_default: boolean;
    is_reimbursable_default: boolean;
    tax_rate?: number;
    sort_order?: number;
    created_at: string;
    updated_at: string;
}

// Quote Types
export interface Quote {
    id: string;
    tenant_id: string;
    client_id: string;
    project_id?: string;
    quote_number: string;
    reference?: string;
    quote_date: string;
    valid_until: string;
    status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted';
    description?: string;
    items: QuoteItem[];
    subtotal: number;
    tax_amount?: number;
    discount_amount?: number;
    discount_type?: 'fixed' | 'percentage';
    total: number;
    currency: string;
    terms_conditions?: string;
    notes?: string;
    internal_notes?: string;
    sent_at?: string;
    viewed_at?: string;
    accepted_at?: string;
    accepted_by?: string;
    signature?: string;
    converted_to_invoice_id?: string;
    client?: Client;
    project?: Project;
    invoice?: Invoice;
    created_at: string;
    updated_at: string;
}

export interface QuoteItem {
    id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    total: number;
}

// API Response Types
export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    path: string;
    first_page_url: string;
    last_page_url: string;
    next_page_url?: string;
    prev_page_url?: string;
}

export interface ApiResponse<T> {
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
}

// Form Types
export interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    company_name?: string;
    plan?: 'individual' | 'team' | 'enterprise';
}

export interface TimerStartData {
    project_id: string;
    task_id?: string;
    description?: string;
    is_billable: boolean;
}

export interface TimeEntryUpdateData {
    started_at?: string;
    ended_at?: string;
    description?: string;
    is_billable?: boolean;
    project_id?: string;
    task_id?: string;
}

// Dashboard Types
export interface DashboardStats {
    today_hours: number;
    week_hours: number;
    month_hours: number;
    active_projects: number;
    pending_invoices: number;
    pending_amount: number;
    overdue_invoices: number;
    overdue_amount: number;
}

export interface ActivityLog {
    id: string;
    description: string;
    type: string;
    properties?: any;
    causer_type?: string;
    causer_id?: string;
    subject_type?: string;
    subject_id?: string;
    created_at: string;
}

// Notification Types
export interface Notification {
    id: string;
    type: string;
    notifiable_type: string;
    notifiable_id: string;
    data: any;
    read_at?: string;
    created_at: string;
    updated_at: string;
}