/**
 * src/lib/types/database.ts
 * 
 * Auto-generated Supabase types placeholder.
 * 
 * To regenerate after schema changes:
 *   npm run db:types
 * 
 * This will run: supabase gen types typescript --local > src/lib/types/database.ts
 * 
 * Note: You must have Supabase running locally with the migration applied.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          primary_contact: string | null
          region: string
          plan: 'starter' | 'growth' | 'enterprise'
          seat_limit: number
          status: 'active' | 'inactive' | 'invited' | 'suspended'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          primary_contact?: string | null
          region?: string
          plan?: 'starter' | 'growth' | 'enterprise'
          seat_limit?: number
          status?: 'active' | 'inactive' | 'invited' | 'suspended'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          primary_contact?: string | null
          region?: string
          plan?: 'starter' | 'growth' | 'enterprise'
          seat_limit?: number
          status?: 'active' | 'inactive' | 'invited' | 'suspended'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          org_id: string | null
          role: 'super_admin' | 'hr' | 'participant'
          email: string
          name: string
          plain_password: string | null
          password_set_by: string | null
          must_change_pw: boolean
          func: string | null
          level: string | null
          title: string | null
          avatar_emoji: string | null
          avatar_color: string | null
          status: 'active' | 'inactive' | 'invited' | 'suspended'
          joined_at: string
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          org_id?: string | null
          role: 'super_admin' | 'hr' | 'participant'
          email: string
          name: string
          plain_password?: string | null
          password_set_by?: string | null
          must_change_pw?: boolean
          func?: string | null
          level?: string | null
          title?: string | null
          avatar_emoji?: string | null
          avatar_color?: string | null
          status?: 'active' | 'inactive' | 'invited' | 'suspended'
          joined_at?: string
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          role?: 'super_admin' | 'hr' | 'participant'
          email?: string
          name?: string
          plain_password?: string | null
          password_set_by?: string | null
          must_change_pw?: boolean
          func?: string | null
          level?: string | null
          title?: string | null
          avatar_emoji?: string | null
          avatar_color?: string | null
          status?: 'active' | 'inactive' | 'invited' | 'suspended'
          joined_at?: string
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          org_id: string | null
          name: string
          description: string | null
          default_skills: string[]
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          name: string
          description?: string | null
          default_skills?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          name?: string
          description?: string | null
          default_skills?: string[]
          created_at?: string
        }
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          added_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          added_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          added_at?: string
        }
      }
      skills: {
        Row: {
          id: string
          org_id: string | null
          source: 'platform' | 'org_custom'
          name: string
          icon: string | null
          description: string | null
          dimensions: Json | null
          is_archived: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          source: 'platform' | 'org_custom'
          name: string
          icon?: string | null
          description?: string | null
          dimensions?: Json | null
          is_archived?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          source?: 'platform' | 'org_custom'
          name?: string
          icon?: string | null
          description?: string | null
          dimensions?: Json | null
          is_archived?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      org_skills: {
        Row: {
          org_id: string
          skill_id: string
          enabled: boolean
          added_at: string
        }
        Insert: {
          org_id: string
          skill_id: string
          enabled?: boolean
          added_at?: string
        }
        Update: {
          org_id?: string
          skill_id?: string
          enabled?: boolean
          added_at?: string
        }
      }
      user_skills: {
        Row: {
          id: string
          user_id: string | null
          skill_id: string | null
          org_id: string | null
          is_active: boolean
          is_locked: boolean
          baseline_peer: number | null
          current_peer: number | null
          peer_growth: number | null
          self_avg: number | null
          surveys_sent: number
          surveys_filled: number
          rc_round: number
          phase: 'pre' | 'training' | 'post'
          assigned_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          skill_id?: string | null
          org_id?: string | null
          is_active?: boolean
          is_locked?: boolean
          baseline_peer?: number | null
          current_peer?: number | null
          self_avg?: number | null
          surveys_sent?: number
          surveys_filled?: number
          rc_round?: number
          phase?: 'pre' | 'training' | 'post'
          assigned_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          skill_id?: string | null
          org_id?: string | null
          is_active?: boolean
          is_locked?: boolean
          baseline_peer?: number | null
          current_peer?: number | null
          self_avg?: number | null
          surveys_sent?: number
          surveys_filled?: number
          rc_round?: number
          phase?: 'pre' | 'training' | 'post'
          assigned_at?: string
        }
      }
      reality_check_rounds: {
        Row: {
          id: string
          user_skill_id: string | null
          round_number: number
          self_ratings: Json | null
          self_comments: string | null
          peer_aggregate: Json | null
          peer_themes: Json | null
          started_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          user_skill_id?: string | null
          round_number: number
          self_ratings?: Json | null
          self_comments?: string | null
          peer_aggregate?: Json | null
          peer_themes?: Json | null
          started_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          user_skill_id?: string | null
          round_number?: number
          self_ratings?: Json | null
          self_comments?: string | null
          peer_aggregate?: Json | null
          peer_themes?: Json | null
          started_at?: string
          closed_at?: string | null
        }
      }
      peer_invites: {
        Row: {
          id: string
          reality_check_id: string | null
          peer_email: string
          peer_name: string | null
          peer_relation: string | null
          token: string
          status: 'pending' | 'submitted' | 'expired'
          sent_at: string
          submitted_at: string | null
          reminder_count: number
        }
        Insert: {
          id?: string
          reality_check_id?: string | null
          peer_email: string
          peer_name?: string | null
          peer_relation?: string | null
          token?: string
          status?: 'pending' | 'submitted' | 'expired'
          sent_at?: string
          submitted_at?: string | null
          reminder_count?: number
        }
        Update: {
          id?: string
          reality_check_id?: string | null
          peer_email?: string
          peer_name?: string | null
          peer_relation?: string | null
          token?: string
          status?: 'pending' | 'submitted' | 'expired'
          sent_at?: string
          submitted_at?: string | null
          reminder_count?: number
        }
      }
      peer_ratings: {
        Row: {
          id: string
          peer_invite_id: string | null
          ratings: Json
          comments: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          peer_invite_id?: string | null
          ratings: Json
          comments?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          peer_invite_id?: string | null
          ratings?: Json
          comments?: string | null
          submitted_at?: string
        }
      }
      actions: {
        Row: {
          id: string
          user_skill_id: string | null
          title: string
          what: string | null
          why: string | null
          how: string | null
          difficulty: number | null
          effort_days: number | null
          status: 'pending' | 'done' | 'skipped'
          due_date: string | null
          done_at: string | null
          notes: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_skill_id?: string | null
          title: string
          what?: string | null
          why?: string | null
          how?: string | null
          difficulty?: number | null
          effort_days?: number | null
          status?: 'pending' | 'done' | 'skipped'
          due_date?: string | null
          done_at?: string | null
          notes?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_skill_id?: string | null
          title?: string
          what?: string | null
          why?: string | null
          how?: string | null
          difficulty?: number | null
          effort_days?: number | null
          status?: 'pending' | 'done' | 'skipped'
          due_date?: string | null
          done_at?: string | null
          notes?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string | null
          user_skill_id: string | null
          phase: 'pre' | 'training' | 'post'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_skill_id?: string | null
          phase?: 'pre' | 'training' | 'post'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_skill_id?: string | null
          phase?: 'pre' | 'training' | 'post'
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string | null
          role: string
          content: string
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          role: string
          content: string
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          role?: string
          content?: string
          tokens_used?: number | null
          created_at?: string
        }
      }
      agent_intel: {
        Row: {
          id: string
          user_id: string | null
          skill_id: string | null
          org_id: string | null
          current_level: string | null
          context: string | null
          motivations: string[] | null
          blockers: string[] | null
          raw_summary: string | null
          profile: Json
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          skill_id?: string | null
          org_id?: string | null
          current_level?: string | null
          context?: string | null
          motivations?: string[] | null
          blockers?: string[] | null
          raw_summary?: string | null
          profile?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          skill_id?: string | null
          org_id?: string | null
          current_level?: string | null
          context?: string | null
          motivations?: string[] | null
          blockers?: string[] | null
          raw_summary?: string | null
          profile?: Json
          updated_at?: string
        }
      }
      skill_insights: {
        Row: {
          id: string
          org_id: string | null
          skill_id: string | null
          avg_peer_score: number | null
          top_scorers: Json | null
          top_growers: Json | null
          volume: number
          unique_askers: number
          unique_convos: number
          summary: string | null
          top_themes: Json | null
          sample_qs: Json | null
          recommended_hr_action: string | null
          generated_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          skill_id?: string | null
          avg_peer_score?: number | null
          top_scorers?: Json | null
          top_growers?: Json | null
          volume?: number
          unique_askers?: number
          unique_convos?: number
          summary?: string | null
          top_themes?: Json | null
          sample_qs?: Json | null
          recommended_hr_action?: string | null
          generated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          skill_id?: string | null
          avg_peer_score?: number | null
          top_scorers?: Json | null
          top_growers?: Json | null
          volume?: number
          unique_askers?: number
          unique_convos?: number
          summary?: string | null
          top_themes?: Json | null
          sample_qs?: Json | null
          recommended_hr_action?: string | null
          generated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          org_id: string | null
          actor_id: string | null
          actor_role: 'super_admin' | 'hr' | 'participant' | null
          action: string
          target_type: string | null
          target_id: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          actor_id?: string | null
          actor_role?: 'super_admin' | 'hr' | 'participant' | null
          action: string
          target_type?: string | null
          target_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          actor_id?: string | null
          actor_role?: 'super_admin' | 'hr' | 'participant' | null
          action?: string
          target_type?: string | null
          target_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      email_log: {
        Row: {
          id: string
          org_id: string | null
          to_email: string
          subject: string | null
          template: string | null
          payload: Json | null
          sendgrid_msg_id: string | null
          status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
          error_message: string | null
          sent_at: string
          last_event_at: string | null
        }
        Insert: {
          id?: string
          org_id?: string | null
          to_email: string
          subject?: string | null
          template?: string | null
          payload?: Json | null
          sendgrid_msg_id?: string | null
          status?: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
          error_message?: string | null
          sent_at?: string
          last_event_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string | null
          to_email?: string
          subject?: string | null
          template?: string | null
          payload?: Json | null
          sendgrid_msg_id?: string | null
          status?: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
          error_message?: string | null
          sent_at?: string
          last_event_at?: string | null
        }
      }
      feature_flags: {
        Row: {
          id: string
          org_id: string | null
          key: string
          enabled: boolean
          value: Json | null
          updated_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          key: string
          enabled?: boolean
          value?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          key?: string
          enabled?: boolean
          value?: Json | null
          updated_at?: string
        }
      }
      llm_usage: {
        Row: {
          id: string
          org_id: string | null
          user_id: string | null
          model: string | null
          tokens_in: number | null
          tokens_out: number | null
          cost_cents: number | null
          feature: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          user_id?: string | null
          model?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          cost_cents?: number | null
          feature?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          user_id?: string | null
          model?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          cost_cents?: number | null
          feature?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      user_role: {
        Args: Record<PropertyKey, never>
        Returns: 'super_admin' | 'hr' | 'participant'
      }
    }
    Enums: {
      action_status: 'pending' | 'done' | 'skipped'
      email_event: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
      invite_status: 'pending' | 'submitted' | 'expired'
      phase: 'pre' | 'training' | 'post'
      plan_tier: 'starter' | 'growth' | 'enterprise'
      skill_source: 'platform' | 'org_custom'
      user_role: 'super_admin' | 'hr' | 'participant'
      user_status: 'active' | 'inactive' | 'invited' | 'suspended'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for cleaner usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
