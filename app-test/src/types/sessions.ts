export interface SessionItem {
  id: string;
  username: string;
  userId: string;
  ipAddress: string;
  start: number;
  lastAccess: number;
  clientId: string;
  clientName: string;
}

export interface SessionsListResponse {
  data: SessionItem[];
  total: number;
}

export interface SessionsStatsResponse {
  total_sessions: number;
  unique_users: number;
  active_last_hour: number;
  sessions_by_client: Record<string, number>;
}

export interface ClientSessionCount {
  clientId: string;
  clientName: string;
  sessionCount: number;
}
