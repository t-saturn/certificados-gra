export interface ModuleItem {
  id: string;
  item?: string | null;
  name: string;
  route: string;
  icon?: string | null;
  parent_id?: string | null;
  application_id?: string | null;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;

  // Relaciones expandidas
  application_name?: string | null;
  application_client_id?: string | null;
  users_count?: number;

  // Para jerarquía
  children?: ModuleItem[];
  parent?: {
    id: string;
    name: string;
  } | null;
}

export interface ModulesListResponse {
  data: ModuleItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ModulesStatsResponse {
  total_modules: number;
  active_modules: number;
  deleted_modules: number;
  total_users: number;
}
