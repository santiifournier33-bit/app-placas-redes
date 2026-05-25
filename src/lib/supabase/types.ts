export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          agent_email: string | null
          created_at: string | null
          currency: string
          estimated_fees: number | null
          id: string
          observations: string | null
          operation_type: string
          property_address: string
          status: string
          type: string
          value: number
        }
        Insert: {
          activity_date: string
          agent_email?: string | null
          created_at?: string | null
          currency: string
          estimated_fees?: number | null
          id?: string
          observations?: string | null
          operation_type: string
          property_address: string
          status?: string
          type: string
          value: number
        }
        Update: {
          activity_date?: string
          agent_email?: string | null
          created_at?: string | null
          currency?: string
          estimated_fees?: number | null
          id?: string
          observations?: string | null
          operation_type?: string
          property_address?: string
          status?: string
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "activities_agent_email_fkey"
            columns: ["agent_email"]
            isOneToOne: false
            referencedRelation: "agent_history"
            referencedColumns: ["email"]
          },
        ]
      }
      agent_history: {
        Row: {
          email: string
          id: string
          is_active_in_tokko: boolean | null
          last_synced_at: string | null
          name: string
          tokko_agent_id: number
        }
        Insert: {
          email: string
          id?: string
          is_active_in_tokko?: boolean | null
          last_synced_at?: string | null
          name: string
          tokko_agent_id: number
        }
        Update: {
          email?: string
          id?: string
          is_active_in_tokko?: boolean | null
          last_synced_at?: string | null
          name?: string
          tokko_agent_id?: number
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          event_date: string
          event_end: string | null
          event_type: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          last_synced_at: string | null
          owner_id: string
          scope: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          event_date: string
          event_end?: string | null
          event_type?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          owner_id: string
          scope?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          event_date?: string
          event_end?: string | null
          event_type?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          owner_id?: string
          scope?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activity_log: {
        Row: {
          contact_id: string
          created_at: string | null
          event_type: string
          id: string
          owner_id: string
          payload: Json | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          event_type: string
          id?: string
          owner_id: string
          payload?: Json | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          owner_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activity_log_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_emails: {
        Row: {
          contact_id: string
          created_at: string | null
          email: string
          id: string
          source: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          body: string
          contact_id: string
          created_at: string | null
          deleted_at: string | null
          id: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          body: string
          contact_id: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          contact_id?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_phones: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          phone: string
          source: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          phone: string
          source?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          phone?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_phones_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_pipelines: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          last_activity_at: string | null
          owner_id: string
          pipeline_id: string
          stage_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          owner_id: string
          pipeline_id: string
          stage_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          owner_id?: string
          pipeline_id?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_pipelines_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_pipelines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_pipelines_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_pipelines_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          category: string | null
          cercania: number | null
          circulo: string | null
          contexto: string | null
          created_at: string | null
          deleted_at: string | null
          es_estrategico: boolean | null
          es_influyente: boolean | null
          es_mentor: boolean | null
          first_name: string
          id: string
          last_activity_at: string | null
          last_contact_date: string | null
          last_name: string | null
          lead_status: string | null
          notes: string | null
          owner_id: string
          primary_email: string | null
          primary_phone: string | null
          rol: string | null
          source: string | null
          tags: string[] | null
          tipo: string | null
          tokko_contact_id: string | null
          ubicacion: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cercania?: number | null
          circulo?: string | null
          contexto?: string | null
          created_at?: string | null
          deleted_at?: string | null
          es_estrategico?: boolean | null
          es_influyente?: boolean | null
          es_mentor?: boolean | null
          first_name: string
          id?: string
          last_activity_at?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          lead_status?: string | null
          notes?: string | null
          owner_id: string
          primary_email?: string | null
          primary_phone?: string | null
          rol?: string | null
          source?: string | null
          tags?: string[] | null
          tipo?: string | null
          tokko_contact_id?: string | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cercania?: number | null
          circulo?: string | null
          contexto?: string | null
          created_at?: string | null
          deleted_at?: string | null
          es_estrategico?: boolean | null
          es_influyente?: boolean | null
          es_mentor?: boolean | null
          first_name?: string
          id?: string
          last_activity_at?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          lead_status?: string | null
          notes?: string | null
          owner_id?: string
          primary_email?: string | null
          primary_phone?: string | null
          rol?: string | null
          source?: string | null
          tags?: string[] | null
          tipo?: string | null
          tokko_contact_id?: string | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          google_account_email: string
          id: string
          is_active: boolean | null
          owner_id: string
          refresh_token: string
          sync_token: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          google_account_email: string
          id?: string
          is_active?: boolean | null
          owner_id: string
          refresh_token: string
          sync_token?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          google_account_email?: string
          id?: string
          is_active?: boolean | null
          owner_id?: string
          refresh_token?: string
          sync_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          comment: string | null
          contact_id: string
          created_at: string | null
          first_inquired_at: string
          id: string
          last_inquired_at: string
          location_id: number | null
          location_is_approximate: boolean
          match_method: string | null
          needs_review: boolean | null
          owner_id: string | null
          property_active: boolean | null
          property_snapshot: Json
          raw_payload: Json | null
          responded_at: string | null
          responded_by: string | null
          sla_notified_at: string | null
          source: string | null
          source_portal: string | null
          status: string | null
          tags: Json | null
          tokko_property_id: string
          tokko_property_reference: string | null
          tokko_web_contact_id: number | null
          updated_at: string | null
          user_preferences: Json | null
        }
        Insert: {
          comment?: string | null
          contact_id: string
          created_at?: string | null
          first_inquired_at: string
          id?: string
          last_inquired_at: string
          location_id?: number | null
          location_is_approximate?: boolean
          match_method?: string | null
          needs_review?: boolean | null
          owner_id?: string | null
          property_active?: boolean | null
          property_snapshot: Json
          raw_payload?: Json | null
          responded_at?: string | null
          responded_by?: string | null
          sla_notified_at?: string | null
          source?: string | null
          source_portal?: string | null
          status?: string | null
          tags?: Json | null
          tokko_property_id: string
          tokko_property_reference?: string | null
          tokko_web_contact_id?: number | null
          updated_at?: string | null
          user_preferences?: Json | null
        }
        Update: {
          comment?: string | null
          contact_id?: string
          created_at?: string | null
          first_inquired_at?: string
          id?: string
          last_inquired_at?: string
          location_id?: number | null
          location_is_approximate?: boolean
          match_method?: string | null
          needs_review?: boolean | null
          owner_id?: string | null
          property_active?: boolean | null
          property_snapshot?: Json
          raw_payload?: Json | null
          responded_at?: string | null
          responded_by?: string | null
          sla_notified_at?: string | null
          source?: string | null
          source_portal?: string | null
          status?: string | null
          tags?: Json | null
          tokko_property_id?: string
          tokko_property_reference?: string | null
          tokko_web_contact_id?: number | null
          updated_at?: string | null
          user_preferences?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_agents: {
        Row: {
          agent_email: string | null
          agent_share_amount: number
          applied_band: string
          id: string
          operation_id: string | null
          role_breakdown: Json
          share_currency: string
          side: string
        }
        Insert: {
          agent_email?: string | null
          agent_share_amount: number
          applied_band: string
          id?: string
          operation_id?: string | null
          role_breakdown: Json
          share_currency: string
          side: string
        }
        Update: {
          agent_email?: string | null
          agent_share_amount?: number
          applied_band?: string
          id?: string
          operation_id?: string | null
          role_breakdown?: Json
          share_currency?: string
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_agents_agent_email_fkey"
            columns: ["agent_email"]
            isOneToOne: false
            referencedRelation: "agent_history"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "operation_agents_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          agents_total_share: number
          close_date: string | null
          close_value: number
          created_at: string | null
          created_by: string | null
          currency: string
          fee_currency: string
          id: string
          observations: string | null
          office_total_share: number
          property_address: string
          property_detail: string | null
          reservation_date: string | null
          status: string
          total_fees_amount: number
          type: string
        }
        Insert: {
          agents_total_share: number
          close_date?: string | null
          close_value: number
          created_at?: string | null
          created_by?: string | null
          currency: string
          fee_currency: string
          id?: string
          observations?: string | null
          office_total_share: number
          property_address: string
          property_detail?: string | null
          reservation_date?: string | null
          status?: string
          total_fees_amount: number
          type: string
        }
        Update: {
          agents_total_share?: number
          close_date?: string | null
          close_value?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string
          fee_currency?: string
          id?: string
          observations?: string | null
          office_total_share?: number
          property_address?: string
          property_detail?: string | null
          reservation_date?: string | null
          status?: string
          total_fees_amount?: number
          type?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          emoji: string | null
          id: string
          name: string
          owner_id: string
          pipeline_id: string
          position: number
          show_in_reports: boolean | null
          sla_days: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          name: string
          owner_id: string
          pipeline_id: string
          position?: number
          show_in_reports?: boolean | null
          sla_days?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          name?: string
          owner_id?: string
          pipeline_id?: string
          position?: number
          show_in_reports?: boolean | null
          sla_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          color_mode: string | null
          created_at: string | null
          deleted_at: string | null
          emoji: string | null
          id: string
          is_archived: boolean | null
          name: string
          owner_id: string
          position: number
          updated_at: string | null
        }
        Insert: {
          color_mode?: string | null
          created_at?: string | null
          deleted_at?: string | null
          emoji?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          owner_id: string
          position?: number
          updated_at?: string | null
        }
        Update: {
          color_mode?: string | null
          created_at?: string | null
          deleted_at?: string | null
          emoji?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          owner_id?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          phone: string | null
          role: string
          tokko_user_id: string | null
          tracker_cafes: number | null
          tracker_contactos: number | null
          tracker_items_valor: number | null
          tracker_valor_masivo: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          is_active?: boolean
          last_synced_at?: string | null
          phone?: string | null
          role?: string
          tokko_user_id?: string | null
          tracker_cafes?: number | null
          tracker_contactos?: number | null
          tracker_items_valor?: number | null
          tracker_valor_masivo?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          phone?: string | null
          role?: string
          tokko_user_id?: string | null
          tracker_cafes?: number | null
          tracker_contactos?: number | null
          tracker_items_valor?: number | null
          tracker_valor_masivo?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_label: string | null
          endpoint: string
          id: string
          owner_id: string
          p256dh_key: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_label?: string | null
          endpoint: string
          id?: string
          owner_id: string
          p256dh_key: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_label?: string | null
          endpoint?: string
          id?: string
          owner_id?: string
          p256dh_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_submissions: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          docuseal_submission_id: string
          id: string
          owner_id: string
          status: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          docuseal_submission_id: string
          id?: string
          owner_id: string
          status?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          docuseal_submission_id?: string
          id?: string
          owner_id?: string
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_submissions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasaciones: {
        Row: {
          contact_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          owner_id: string
          property_address: string | null
          requested_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          property_address?: string | null
          requested_at?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          property_address?: string | null
          requested_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasaciones_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasaciones_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_sections: {
        Row: {
          collapsed: boolean | null
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          owner_id: string
          position: number
        }
        Insert: {
          collapsed?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          owner_id: string
          position?: number
        }
        Update: {
          collapsed?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_sections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          last_synced_at: string | null
          owner_id: string
          parent_id: string | null
          position: number
          priority: number
          recurrence_day_of_month: number | null
          recurrence_day_of_week: number | null
          recurrence_end_date: string | null
          recurrence_freq: string | null
          recurrence_interval: number | null
          recurrence_parent_id: string | null
          reminder: string | null
          reminder_at: string | null
          reminder_sent_at: string | null
          section_id: string | null
          task_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          owner_id: string
          parent_id?: string | null
          position?: number
          priority?: number
          recurrence_day_of_month?: number | null
          recurrence_day_of_week?: number | null
          recurrence_end_date?: string | null
          recurrence_freq?: string | null
          recurrence_interval?: number | null
          recurrence_parent_id?: string | null
          reminder?: string | null
          reminder_at?: string | null
          reminder_sent_at?: string | null
          section_id?: string | null
          task_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          owner_id?: string
          parent_id?: string | null
          position?: number
          priority?: number
          recurrence_day_of_month?: number | null
          recurrence_day_of_week?: number | null
          recurrence_end_date?: string | null
          recurrence_freq?: string | null
          recurrence_interval?: number | null
          recurrence_parent_id?: string | null
          reminder?: string | null
          reminder_at?: string | null
          reminder_sent_at?: string | null
          section_id?: string | null
          task_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "task_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      tokko_panel_session: {
        Row: {
          cookies: Json
          expires_at: string | null
          id: string
          jwt: string | null
          jwt_expires_at: string | null
          last_error: string | null
          last_renewed_at: string | null
          updated_at: string | null
        }
        Insert: {
          cookies: Json
          expires_at?: string | null
          id?: string
          jwt?: string | null
          jwt_expires_at?: string | null
          last_error?: string | null
          last_renewed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          cookies?: Json
          expires_at?: string | null
          id?: string
          jwt?: string | null
          jwt_expires_at?: string | null
          last_error?: string | null
          last_renewed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tokko_sync_failures: {
        Row: {
          created_at: string | null
          endpoint: string
          error: string | null
          id: string
          next_retry_at: string | null
          params: Json | null
          resolved_at: string | null
          retry_count: number | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          error?: string | null
          id?: string
          next_retry_at?: string | null
          params?: Json | null
          resolved_at?: string | null
          retry_count?: number | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error?: string | null
          id?: string
          next_retry_at?: string | null
          params?: Json | null
          resolved_at?: string | null
          retry_count?: number | null
        }
        Relationships: []
      }
      tokko_sync_state: {
        Row: {
          id: string
          last_cursor: string | null
          last_error: string | null
          last_synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          last_cursor?: string | null
          last_error?: string | null
          last_synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          last_cursor?: string | null
          last_error?: string | null
          last_synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_team_week_metrics: {
        Args: { week_start: string }
        Returns: {
          avatar_url: string
          contacts_created: number
          contacts_moved: number
          display_name: string
          email: string
          profile_id: string
          tasks_completed: number
          total_actions: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
