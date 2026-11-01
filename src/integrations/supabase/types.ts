export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_actions_log: {
        Row: {
          id: string
          action: string
          target_member_id: string | null
          target_member_snapshot: Json
          actor_user_id: string
          ip_address: string | null
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          target_member_id?: string | null
          target_member_snapshot: Json
          actor_user_id: string
          ip_address?: string | null
          reason: string
          created_at?: string
        }
        Update: {
          id?: string | null
          action?: string
          target_member_id?: string | null
          target_member_snapshot?: Json
          actor_user_id?: string
          ip_address?: string | null
          reason?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_log_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          id: string
          title: string
          body: string | null
          starts_at: string
          ends_at: string | null
          created_by: string | null
          created_at: string
          chapter_id: string | null
        }
        Insert: {
          id?: string
          title: string
          body?: string | null
          starts_at?: string
          ends_at?: string | null
          created_by?: string | null
          created_at?: string
          chapter_id?: string | null
        }
        Update: {
          id?: string | null
          title?: string
          body?: string | null
          starts_at?: string | null
          ends_at?: string | null
          created_by?: string | null
          created_at?: string | null
          chapter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          id: string
          actor_user_id: string | null
          entity_type: string
          entity_id: string
          field: string | null
          old_value: Json | null
          new_value: Json | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          entity_type: string
          entity_id: string
          field?: string | null
          old_value?: Json | null
          new_value?: Json | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          actor_user_id?: string | null
          entity_type?: string
          entity_id?: string
          field?: string | null
          old_value?: Json | null
          new_value?: Json | null
          reason?: string | null
          created_at?: string | null
        }
        Relationships: [
        ]
      }
      banned_keywords: {
        Row: {
          id: string
          keyword: string
          severity: string
          added_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          keyword: string
          severity?: string
          added_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          keyword?: string
          severity?: string | null
          added_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banned_keywords_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      book_pages: {
        Row: {
          id: string
          book_key: string
          page_number: number
          image_url: string | null
          ocr_text: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          book_key: string
          page_number: number
          image_url?: string | null
          ocr_text?: string | null
          metadata?: Json
        }
        Update: {
          id?: string | null
          book_key?: string
          page_number?: number
          image_url?: string | null
          ocr_text?: string | null
          metadata?: Json | null
        }
        Relationships: [
        ]
      }
      businesses: {
        Row: {
          id: string
          owner_member_id: string
          chapter_id: string | null
          name: string
          sector: string | null
          city_id: string | null
          website: string | null
          description: string | null
          verified: boolean
          created_at: string
          updated_at: string
          phone: string | null
          email: string | null
          address_line1: string | null
          address_line2: string | null
          postal_code: string | null
          country_id: string | null
          state_id: string | null
          logo_url: string | null
          cover_image_url: string | null
          founded_year: number | null
          employee_count: string | null
          revenue_range: string | null
          tags: string[] | null
          social_links: Json | null
          operating_hours: Json | null
          license_number: string | null
          gst_number: string | null
          suspended: boolean
          suspended_at: string | null
        }
        Insert: {
          id?: string
          owner_member_id: string
          chapter_id?: string | null
          name: string
          sector?: string | null
          city_id?: string | null
          website?: string | null
          description?: string | null
          verified?: boolean
          created_at?: string
          updated_at?: string
          phone?: string | null
          email?: string | null
          address_line1?: string | null
          address_line2?: string | null
          postal_code?: string | null
          country_id?: string | null
          state_id?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          founded_year?: number | null
          employee_count?: string | null
          revenue_range?: string | null
          tags?: string[] | null
          social_links?: Json | null
          operating_hours?: Json | null
          license_number?: string | null
          gst_number?: string | null
          suspended?: boolean
          suspended_at?: string | null
        }
        Update: {
          id?: string | null
          owner_member_id?: string
          chapter_id?: string | null
          name?: string
          sector?: string | null
          city_id?: string | null
          website?: string | null
          description?: string | null
          verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          phone?: string | null
          email?: string | null
          address_line1?: string | null
          address_line2?: string | null
          postal_code?: string | null
          country_id?: string | null
          state_id?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          founded_year?: number | null
          employee_count?: string | null
          revenue_range?: string | null
          tags?: string[] | null
          social_links?: Json | null
          operating_hours?: Json | null
          license_number?: string | null
          gst_number?: string | null
          suspended?: boolean | null
          suspended_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_donations: {
        Row: {
          id: string
          campaign_id: string
          donation_id: string
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          donation_id: string
          created_at?: string
        }
        Update: {
          id?: string | null
          campaign_id?: string
          donation_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "fundraising_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_donations_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_messages: {
        Row: {
          id: string
          from_member_id: string
          to_member_id: string
          chapter_id: string
          subject: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          from_member_id: string
          to_member_id: string
          chapter_id: string
          subject: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string | null
          from_member_id?: string
          to_member_id?: string
          chapter_id?: string
          subject?: string
          body?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_messages_from_member_id_fkey"
            columns: ["from_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_messages_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_messages_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_transfer_history: {
        Row: {
          id: string
          member_id: string
          from_chapter_id: string | null
          to_chapter_id: string | null
          from_chapter_name: string | null
          to_chapter_name: string | null
          transfer_type: string
          reason: string | null
          initiated_by: string | null
          approved_by: string | null
          related_transfer_id: string | null
          effective_at: string
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          from_chapter_id?: string | null
          to_chapter_id?: string | null
          from_chapter_name?: string | null
          to_chapter_name?: string | null
          transfer_type?: string
          reason?: string | null
          initiated_by?: string | null
          approved_by?: string | null
          related_transfer_id?: string | null
          effective_at?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          member_id?: string
          from_chapter_id?: string | null
          to_chapter_id?: string | null
          from_chapter_name?: string | null
          to_chapter_name?: string | null
          transfer_type?: string | null
          reason?: string | null
          initiated_by?: string | null
          approved_by?: string | null
          related_transfer_id?: string | null
          effective_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_transfer_history_to_chapter_id_fkey"
            columns: ["to_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_transfer_history_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_transfer_history_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_transfer_history_related_transfer_id_fkey"
            columns: ["related_transfer_id"]
            isOneToOne: false
            referencedRelation: "chapter_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_transfer_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_transfer_history_from_chapter_id_fkey"
            columns: ["from_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_transfers: {
        Row: {
          id: string
          member_id: string
          from_chapter_id: string | null
          to_chapter_id: string | null
          reason: string | null
          status: string
          approved_by: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          member_id: string
          from_chapter_id?: string | null
          to_chapter_id?: string | null
          reason?: string | null
          status?: string
          approved_by?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string | null
          member_id?: string
          from_chapter_id?: string | null
          to_chapter_id?: string | null
          reason?: string | null
          status?: string | null
          approved_by?: string | null
          created_at?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_transfers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_transfers_from_chapter_id_fkey"
            columns: ["from_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_transfers_to_chapter_id_fkey"
            columns: ["to_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          id: string
          country_id: string | null
          state_id: string | null
          city_id: string | null
          name: string
          slug: string
          subdomain: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          country_id?: string | null
          state_id?: string | null
          city_id?: string | null
          name: string
          slug: string
          subdomain: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          country_id?: string | null
          state_id?: string | null
          city_id?: string | null
          name?: string
          slug?: string
          subdomain?: string
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          id: string
          state_id: string
          code: string
          name: string
        }
        Insert: {
          id?: string
          state_id: string
          code: string
          name: string
        }
        Update: {
          id?: string | null
          state_id?: string
          code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      city_codes: {
        Row: {
          id: string
          city_name: string
          city_code: string
          state_code: string
          country_code: string
        }
        Insert: {
          id?: string
          city_name: string
          city_code: string
          state_code: string
          country_code: string
        }
        Update: {
          id?: string | null
          city_name?: string
          city_code?: string
          state_code?: string
          country_code?: string
        }
        Relationships: [
        ]
      }
      consents: {
        Row: {
          id: string
          member_id: string | null
          context: string
          policy_version: string
          region: string
          captured_at: string
          payload: Json
        }
        Insert: {
          id?: string
          member_id?: string | null
          context: string
          policy_version: string
          region: string
          captured_at?: string
          payload?: Json
        }
        Update: {
          id?: string | null
          member_id?: string | null
          context?: string
          policy_version?: string
          region?: string
          captured_at?: string | null
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      content_news: {
        Row: {
          id: string
          chapter_id: string | null
          title: string
          summary: string | null
          body: string | null
          tags: string[]
          images: Json
          status: string
          schedule: Json
          created_by: string | null
          reviewed_by: string | null
          published_at: string | null
          created_at: string
          updated_at: string
          category: string | null
          author_name: string | null
          cover_image_url: string | null
          source_url: string | null
          city_id: string | null
          state_id: string | null
          country_id: string | null
          featured: boolean | null
          views_count: number | null
          suspended: boolean
          article_type: string
          pinned: boolean
          pinned_until: string | null
          image_alt: string | null
          scope: string
          read_time_minutes: number | null
          video_url: string | null
          video_title: string | null
        }
        Insert: {
          id?: string
          chapter_id?: string | null
          title: string
          summary?: string | null
          body?: string | null
          tags?: string[]
          images?: Json
          status?: string
          schedule?: Json
          created_by?: string | null
          reviewed_by?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
          category?: string | null
          author_name?: string | null
          cover_image_url?: string | null
          source_url?: string | null
          city_id?: string | null
          state_id?: string | null
          country_id?: string | null
          featured?: boolean | null
          views_count?: number | null
          suspended?: boolean
          article_type?: string
          pinned?: boolean
          pinned_until?: string | null
          image_alt?: string | null
          scope?: string
          read_time_minutes?: number | null
          video_url?: string | null
          video_title?: string | null
        }
        Update: {
          id?: string | null
          chapter_id?: string | null
          title?: string
          summary?: string | null
          body?: string | null
          tags?: string[] | null
          images?: Json | null
          status?: string | null
          schedule?: Json | null
          created_by?: string | null
          reviewed_by?: string | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          category?: string | null
          author_name?: string | null
          cover_image_url?: string | null
          source_url?: string | null
          city_id?: string | null
          state_id?: string | null
          country_id?: string | null
          featured?: boolean | null
          views_count?: number | null
          suspended?: boolean | null
          article_type?: string | null
          pinned?: boolean | null
          pinned_until?: string | null
          image_alt?: string | null
          scope?: string | null
          read_time_minutes?: number | null
          video_url?: string | null
          video_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_news_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_news_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_news_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_news_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      council_replies: {
        Row: {
          id: string
          thread_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          author_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string | null
          thread_id?: string
          author_id?: string
          body?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "council_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "council_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      council_threads: {
        Row: {
          id: string
          author_id: string
          chapter_id: string | null
          title: string
          body: string
          category: string
          poll_options: Json | null
          closed: boolean
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          chapter_id?: string | null
          title: string
          body: string
          category?: string
          poll_options?: Json | null
          closed?: boolean
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          author_id?: string
          chapter_id?: string | null
          title?: string
          body?: string
          category?: string | null
          poll_options?: Json | null
          closed?: boolean | null
          pinned?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "council_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_threads_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      council_votes: {
        Row: {
          id: string
          thread_id: string
          member_id: string
          vote: number
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          member_id: string
          vote: number
          created_at?: string
        }
        Update: {
          id?: string | null
          thread_id?: string
          member_id?: string
          vote?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "council_votes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "council_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_votes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          id: string
          iso2: string
          name: string
        }
        Insert: {
          id?: string
          iso2: string
          name: string
        }
        Update: {
          id?: string | null
          iso2?: string
          name?: string
        }
        Relationships: [
        ]
      }
      data_requests: {
        Row: {
          id: string
          member_id: string
          type: string
          status: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          type: string
          status?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          member_id?: string
          type?: string
          status?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          id: string
          fund_id: string
          member_id: string | null
          amount: number
          currency: string
          type: string
          provider: string
          provider_ref: string | null
          status: string
          donor_wall_opt_in: boolean
          created_at: string
          donor_name: string | null
          donor_email: string | null
          donor_phone: string | null
          donor_address: string | null
          pan_number: string | null
          notes: string | null
          payment_method: string | null
          recurring_interval: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          fund_id: string
          member_id?: string | null
          amount: number
          currency?: string
          type?: string
          provider?: string
          provider_ref?: string | null
          status?: string
          donor_wall_opt_in?: boolean
          created_at?: string
          donor_name?: string | null
          donor_email?: string | null
          donor_phone?: string | null
          donor_address?: string | null
          pan_number?: string | null
          notes?: string | null
          payment_method?: string | null
          recurring_interval?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          fund_id?: string
          member_id?: string | null
          amount?: number
          currency?: string | null
          type?: string | null
          provider?: string | null
          provider_ref?: string | null
          status?: string | null
          donor_wall_opt_in?: boolean | null
          created_at?: string | null
          donor_name?: string | null
          donor_email?: string | null
          donor_phone?: string | null
          donor_address?: string | null
          pan_number?: string | null
          notes?: string | null
          payment_method?: string | null
          recurring_interval?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_wall: {
        Row: {
          id: string
          member_id: string | null
          display_name: string
          tier: string
          amount_donated: number | null
          currency: string | null
          dedication: string | null
          anonymous: boolean | null
          chapter_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          member_id?: string | null
          display_name: string
          tier?: string
          amount_donated?: number | null
          currency?: string | null
          dedication?: string | null
          anonymous?: boolean | null
          chapter_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          member_id?: string | null
          display_name?: string
          tier?: string | null
          amount_donated?: number | null
          currency?: string | null
          dedication?: string | null
          anonymous?: boolean | null
          chapter_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donor_wall_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_wall_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          id: string
          member_id: string
          degree: string | null
          institution: string | null
          year: number | null
        }
        Insert: {
          id?: string
          member_id: string
          degree?: string | null
          institution?: string | null
          year?: number | null
        }
        Update: {
          id?: string | null
          member_id?: string
          degree?: string | null
          institution?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "education_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          id: string
          city_id: string | null
          name: string
          phone: string
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          city_id?: string | null
          name: string
          phone: string
          type: string
          created_at?: string
        }
        Update: {
          id?: string | null
          city_id?: string | null
          name?: string
          phone?: string
          type?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      employment: {
        Row: {
          id: string
          member_id: string
          job_title: string | null
          company: string | null
          sector: string | null
          start_date: string | null
          end_date: string | null
        }
        Insert: {
          id?: string
          member_id: string
          job_title?: string | null
          company?: string | null
          sector?: string | null
          start_date?: string | null
          end_date?: string | null
        }
        Update: {
          id?: string | null
          member_id?: string
          job_title?: string | null
          company?: string | null
          sector?: string | null
          start_date?: string | null
          end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checkins: {
        Row: {
          id: string
          event_id: string
          member_id: string
          scanned_by: string | null
          scanned_at: string
        }
        Insert: {
          id?: string
          event_id: string
          member_id: string
          scanned_by?: string | null
          scanned_at?: string
        }
        Update: {
          id?: string | null
          event_id?: string
          member_id?: string
          scanned_by?: string | null
          scanned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checkins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          id: string
          event_id: string
          uploaded_by: string | null
          url: string
          caption: string | null
          consent: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          uploaded_by?: string | null
          url: string
          caption?: string | null
          consent?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          event_id?: string
          uploaded_by?: string | null
          url?: string
          caption?: string | null
          consent?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          id: string
          event_id: string
          member_id: string
          status: string
          guests: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          member_id: string
          status?: string
          guests?: number
          created_at?: string
        }
        Update: {
          id?: string | null
          event_id?: string
          member_id?: string
          status?: string | null
          guests?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          id: string
          chapter_id: string | null
          name: string
          description: string | null
          starts_at: string
          ends_at: string
          venue: string | null
          virtual_url: string | null
          consent_required: boolean
          ticketing: Json
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
          category: string | null
          event_type: string | null
          max_capacity: number | null
          registration_deadline: string | null
          fee_amount: number | null
          fee_currency: string | null
          contact_email: string | null
          contact_phone: string | null
          address_line1: string | null
          city_id: string | null
          state_id: string | null
          country_id: string | null
          tags: string[] | null
          cover_image_url: string | null
          organizer_name: string | null
          recurring: Json | null
          suspended: boolean
        }
        Insert: {
          id?: string
          chapter_id?: string | null
          name: string
          description?: string | null
          starts_at: string
          ends_at: string
          venue?: string | null
          virtual_url?: string | null
          consent_required?: boolean
          ticketing?: Json
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          category?: string | null
          event_type?: string | null
          max_capacity?: number | null
          registration_deadline?: string | null
          fee_amount?: number | null
          fee_currency?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address_line1?: string | null
          city_id?: string | null
          state_id?: string | null
          country_id?: string | null
          tags?: string[] | null
          cover_image_url?: string | null
          organizer_name?: string | null
          recurring?: Json | null
          suspended?: boolean
        }
        Update: {
          id?: string | null
          chapter_id?: string | null
          name?: string
          description?: string | null
          starts_at?: string
          ends_at?: string
          venue?: string | null
          virtual_url?: string | null
          consent_required?: boolean | null
          ticketing?: Json | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          category?: string | null
          event_type?: string | null
          max_capacity?: number | null
          registration_deadline?: string | null
          fee_amount?: number | null
          fee_currency?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address_line1?: string | null
          city_id?: string | null
          state_id?: string | null
          country_id?: string | null
          tags?: string[] | null
          cover_image_url?: string | null
          organizer_name?: string | null
          recurring?: Json | null
          suspended?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "events_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          id: string
          name: string | null
        }
        Insert: {
          id?: string
          name?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
        }
        Relationships: [
        ]
      }
      family_connections: {
        Row: {
          id: string
          member_id: string | null
          related_member_id: string | null
          relation_type: string
          verified: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          member_id?: string | null
          related_member_id?: string | null
          relation_type: string
          verified?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          member_id?: string | null
          related_member_id?: string | null
          relation_type?: string
          verified?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_connections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_connections_related_member_id_fkey"
            columns: ["related_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_invitations: {
        Row: {
          id: string
          inviter_member_id: string
          relation: string
          invitee_name: string
          invitee_email: string | null
          invitee_phone: string | null
          invitee_phone_country_code: string | null
          status: string
          created_at: string
          accepted_at: string | null
          accepted_by_member_id: string | null
          acceptance_token: string
        }
        Insert: {
          id?: string
          inviter_member_id: string
          relation: string
          invitee_name: string
          invitee_email?: string | null
          invitee_phone?: string | null
          invitee_phone_country_code?: string | null
          status?: string
          created_at?: string
          accepted_at?: string | null
          accepted_by_member_id?: string | null
          acceptance_token?: string
        }
        Update: {
          id?: string | null
          inviter_member_id?: string
          relation?: string
          invitee_name?: string
          invitee_email?: string | null
          invitee_phone?: string | null
          invitee_phone_country_code?: string | null
          status?: string | null
          created_at?: string | null
          accepted_at?: string | null
          accepted_by_member_id?: string | null
          acceptance_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_inviter_member_id_fkey"
            columns: ["inviter_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_accepted_by_member_id_fkey"
            columns: ["accepted_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_links: {
        Row: {
          id: string
          family_id: string | null
          member_id: string
          relation: string
          related_member_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id?: string | null
          member_id: string
          relation: string
          related_member_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          family_id?: string | null
          member_id?: string
          relation?: string
          related_member_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_links_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_links_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_links_related_member_id_fkey"
            columns: ["related_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraising_campaigns: {
        Row: {
          id: string
          title: string
          description: string
          goal_amount: number
          currency: string
          start_date: string
          end_date: string
          status: string
          campaign_type: string
          chapter_id: string | null
          created_by: string
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          goal_amount: number
          currency?: string
          start_date: string
          end_date: string
          status?: string
          campaign_type?: string
          chapter_id?: string | null
          created_by: string
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          title?: string
          description?: string | null
          goal_amount?: number
          currency?: string | null
          start_date?: string
          end_date?: string
          status?: string | null
          campaign_type?: string | null
          chapter_id?: string | null
          created_by?: string
          cover_image_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fundraising_campaigns_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fundraising_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          id: string
          scope: string
          chapter_id: string | null
          name: string
          currency: string
          active: boolean
        }
        Insert: {
          id?: string
          scope: string
          chapter_id?: string | null
          name: string
          currency?: string
          active?: boolean
        }
        Update: {
          id?: string | null
          scope?: string
          chapter_id?: string | null
          name?: string
          currency?: string | null
          active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "funds_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      global_id_sequences: {
        Row: {
          id: string
          country_code: string
          state_code: string
          city_code: string
          year_code: string
          last_sequence: number
        }
        Insert: {
          id?: string
          country_code: string
          state_code: string
          city_code: string
          year_code: string
          last_sequence?: number
        }
        Update: {
          id?: string | null
          country_code?: string
          state_code?: string
          city_code?: string
          year_code?: string
          last_sequence?: number | null
        }
        Relationships: [
        ]
      }
      hall_bookings: {
        Row: {
          id: string
          chapter_id: string | null
          member_id: string
          hall_name: string
          purpose: string | null
          booking_date: string
          start_time: string
          end_time: string
          guests: number | null
          status: string
          notes: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chapter_id?: string | null
          member_id: string
          hall_name: string
          purpose?: string | null
          booking_date: string
          start_time: string
          end_time: string
          guests?: number | null
          status?: string
          notes?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          chapter_id?: string | null
          member_id?: string
          hall_name?: string
          purpose?: string | null
          booking_date?: string
          start_time?: string
          end_time?: string
          guests?: number | null
          status?: string | null
          notes?: string | null
          approved_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hall_bookings_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hall_bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      heritage_tags: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          tag: string
          tagged_by: string | null
          approved: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          tag: string
          tagged_by?: string | null
          approved?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string | null
          entity_type?: string
          entity_id?: string
          tag?: string
          tagged_by?: string | null
          approved?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heritage_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_reminders: {
        Row: {
          id: string
          invitation_type: string
          family_invitation_id: string | null
          days_since_invite: number
          recipient_email: string
          recipient_name: string
          sent_at: string
          email_status: string
          created_at: string
        }
        Insert: {
          id?: string
          invitation_type: string
          family_invitation_id?: string | null
          days_since_invite: number
          recipient_email: string
          recipient_name: string
          sent_at?: string
          email_status?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          invitation_type?: string
          family_invitation_id?: string | null
          days_since_invite?: number
          recipient_email?: string
          recipient_name?: string
          sent_at?: string | null
          email_status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_reminders_family_invitation_id_fkey"
            columns: ["family_invitation_id"]
            isOneToOne: false
            referencedRelation: "family_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          id: string
          job_id: string
          member_id: string
          resume_url: string | null
          cover_letter: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          member_id: string
          resume_url?: string | null
          cover_letter?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          job_id?: string
          member_id?: string
          resume_url?: string | null
          cover_letter?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          id: string
          chapter_id: string | null
          employer_business_id: string | null
          employer_member_id: string | null
          title: string
          description: string | null
          location: string | null
          remote: boolean
          tags: string[]
          status: string
          created_at: string
          expires_at: string | null
          salary_min: number | null
          salary_max: number | null
          salary_currency: string | null
          salary_period: string | null
          employment_type: string | null
          experience_min: number | null
          experience_max: number | null
          education_required: string | null
          skills_required: string[] | null
          benefits: string[] | null
          application_url: string | null
          contact_email: string | null
          contact_phone: string | null
          city_id: string | null
          state_id: string | null
          country_id: string | null
          updated_at: string | null
          positions_available: number | null
          suspended: boolean
        }
        Insert: {
          id?: string
          chapter_id?: string | null
          employer_business_id?: string | null
          employer_member_id?: string | null
          title: string
          description?: string | null
          location?: string | null
          remote?: boolean
          tags?: string[]
          status?: string
          created_at?: string
          expires_at?: string | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string | null
          salary_period?: string | null
          employment_type?: string | null
          experience_min?: number | null
          experience_max?: number | null
          education_required?: string | null
          skills_required?: string[] | null
          benefits?: string[] | null
          application_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          city_id?: string | null
          state_id?: string | null
          country_id?: string | null
          updated_at?: string | null
          positions_available?: number | null
          suspended?: boolean
        }
        Update: {
          id?: string | null
          chapter_id?: string | null
          employer_business_id?: string | null
          employer_member_id?: string | null
          title?: string
          description?: string | null
          location?: string | null
          remote?: boolean | null
          tags?: string[] | null
          status?: string | null
          created_at?: string | null
          expires_at?: string | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string | null
          salary_period?: string | null
          employment_type?: string | null
          experience_min?: number | null
          experience_max?: number | null
          education_required?: string | null
          skills_required?: string[] | null
          benefits?: string[] | null
          application_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          city_id?: string | null
          state_id?: string | null
          country_id?: string | null
          updated_at?: string | null
          positions_available?: number | null
          suspended?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_employer_business_id_fkey"
            columns: ["employer_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_employer_member_id_fkey"
            columns: ["employer_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      magazine_issues: {
        Row: {
          id: string
          title: string
          issue_date: string | null
          volume: string | null
          pdf_url: string | null
          ocr_text: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          issue_date?: string | null
          volume?: string | null
          pdf_url?: string | null
          ocr_text?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string | null
          title?: string
          issue_date?: string | null
          volume?: string | null
          pdf_url?: string | null
          ocr_text?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
        ]
      }
      matrimonial_introductions: {
        Row: {
          id: string
          from_member_id: string
          to_member_id: string
          message: string | null
          status: string
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          from_member_id: string
          to_member_id: string
          message?: string | null
          status?: string
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string | null
          from_member_id?: string
          to_member_id?: string
          message?: string | null
          status?: string | null
          created_at?: string | null
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matrimonial_introductions_from_member_id_fkey"
            columns: ["from_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matrimonial_introductions_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      matrimonial_profiles: {
        Row: {
          id: string
          member_id: string
          guardian_member_id: string | null
          preferences: Json
          visibility: string
          verified: boolean
          created_at: string
          updated_at: string
          about: string | null
          height_cm: number | null
          weight_kg: number | null
          complexion: string | null
          blood_group: string | null
          diet: string | null
          marital_status: string | null
          manglik: string | null
          gotra: string | null
          nakshatra: string | null
          rashi: string | null
          native_place: string | null
          family_type: string | null
          family_status: string | null
          father_occupation: string | null
          mother_occupation: string | null
          siblings: string | null
          hobbies: string[] | null
          photos: string[] | null
          glasses: string | null
          driving: string | null
          citizenship: string | null
          current_city: string | null
          current_state: string | null
          education_level: string | null
          education_field: string | null
          father_name: string | null
          mother_name: string | null
          parents_marital_status: string | null
          position_title: string | null
          business_name: string | null
          visa_type: string | null
          income: number | null
          income_currency: string | null
          linkedin_url: string | null
          contact_number: string | null
          parent_contact: string | null
          ekda: string | null
          kuldevi: string | null
          country: string | null
          suspended: boolean
        }
        Insert: {
          id?: string
          member_id: string
          guardian_member_id?: string | null
          preferences?: Json
          visibility?: string
          verified?: boolean
          created_at?: string
          updated_at?: string
          about?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          complexion?: string | null
          blood_group?: string | null
          diet?: string | null
          marital_status?: string | null
          manglik?: string | null
          gotra?: string | null
          nakshatra?: string | null
          rashi?: string | null
          native_place?: string | null
          family_type?: string | null
          family_status?: string | null
          father_occupation?: string | null
          mother_occupation?: string | null
          siblings?: string | null
          hobbies?: string[] | null
          photos?: string[] | null
          glasses?: string | null
          driving?: string | null
          citizenship?: string | null
          current_city?: string | null
          current_state?: string | null
          education_level?: string | null
          education_field?: string | null
          father_name?: string | null
          mother_name?: string | null
          parents_marital_status?: string | null
          position_title?: string | null
          business_name?: string | null
          visa_type?: string | null
          income?: number | null
          income_currency?: string | null
          linkedin_url?: string | null
          contact_number?: string | null
          parent_contact?: string | null
          ekda?: string | null
          kuldevi?: string | null
          country?: string | null
          suspended?: boolean
        }
        Update: {
          id?: string | null
          member_id?: string
          guardian_member_id?: string | null
          preferences?: Json | null
          visibility?: string | null
          verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          about?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          complexion?: string | null
          blood_group?: string | null
          diet?: string | null
          marital_status?: string | null
          manglik?: string | null
          gotra?: string | null
          nakshatra?: string | null
          rashi?: string | null
          native_place?: string | null
          family_type?: string | null
          family_status?: string | null
          father_occupation?: string | null
          mother_occupation?: string | null
          siblings?: string | null
          hobbies?: string[] | null
          photos?: string[] | null
          glasses?: string | null
          driving?: string | null
          citizenship?: string | null
          current_city?: string | null
          current_state?: string | null
          education_level?: string | null
          education_field?: string | null
          father_name?: string | null
          mother_name?: string | null
          parents_marital_status?: string | null
          position_title?: string | null
          business_name?: string | null
          visa_type?: string | null
          income?: number | null
          income_currency?: string | null
          linkedin_url?: string | null
          contact_number?: string | null
          parent_contact?: string | null
          ekda?: string | null
          kuldevi?: string | null
          country?: string | null
          suspended?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "matrimonial_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matrimonial_profiles_guardian_member_id_fkey"
            columns: ["guardian_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          id: string
          owner_user_id: string | null
          url: string
          mime_type: string
          size_bytes: number
          consent: string
          entity_type: string | null
          entity_id: string | null
          scanned: boolean
          scan_result: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_user_id?: string | null
          url: string
          mime_type: string
          size_bytes?: number
          consent?: string
          entity_type?: string | null
          entity_id?: string | null
          scanned?: boolean
          scan_result?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          owner_user_id?: string | null
          url?: string
          mime_type?: string
          size_bytes?: number | null
          consent?: string | null
          entity_type?: string | null
          entity_id?: string | null
          scanned?: boolean | null
          scan_result?: string | null
          created_at?: string | null
        }
        Relationships: [
        ]
      }
      medical_aid_requests: {
        Row: {
          id: string
          member_id: string
          chapter_id: string | null
          patient_name: string
          relation: string
          condition_summary: string | null
          amount_needed: number | null
          currency: string
          documents: Json | null
          status: string
          approved_by: string | null
          approved_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          chapter_id?: string | null
          patient_name: string
          relation?: string
          condition_summary?: string | null
          amount_needed?: number | null
          currency?: string
          documents?: Json | null
          status?: string
          approved_by?: string | null
          approved_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          member_id?: string
          chapter_id?: string | null
          patient_name?: string
          relation?: string | null
          condition_summary?: string | null
          amount_needed?: number | null
          currency?: string | null
          documents?: Json | null
          status?: string | null
          approved_by?: string | null
          approved_amount?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_aid_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_aid_requests_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      member_contacts: {
        Row: {
          id: string
          member_id: string
          type: string
          value: string
          verified: boolean
          primary_flag: boolean
        }
        Insert: {
          id?: string
          member_id: string
          type: string
          value: string
          verified?: boolean
          primary_flag?: boolean
        }
        Update: {
          id?: string | null
          member_id?: string
          type?: string
          value?: string
          verified?: boolean | null
          primary_flag?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "member_contacts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_languages: {
        Row: {
          id: string
          member_id: string
          language: string
        }
        Insert: {
          id?: string
          member_id: string
          language: string
        }
        Update: {
          id?: string | null
          member_id?: string
          language?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_languages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_skills: {
        Row: {
          id: string
          member_id: string
          skill: string
        }
        Insert: {
          id?: string
          member_id: string
          skill: string
        }
        Update: {
          id?: string | null
          member_id?: string
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_skills_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          id: string
          user_id: string
          chapter_id: string | null
          global_id: string | null
          verification_level: number
          first_name: string
          middle_names: string | null
          last_name: string
          gender: string | null
          dob: string | null
          birth_place: string | null
          photo_url: string | null
          deceased: boolean
          deceased_date: string | null
          privacy: Json
          onboarding_completed: boolean
          created_at: string
          updated_at: string
          ekda: string | null
          suspended: boolean
          suspended_at: string | null
          suspended_reason: string | null
          blocked: boolean
          blocked_at: string | null
          kuldevi: string | null
          overseas_verified: boolean | null
          is_locked: boolean
          locked_reason: string | null
          is_deleted: boolean
        }
        Insert: {
          id?: string
          user_id: string
          chapter_id?: string | null
          global_id?: string | null
          verification_level?: number
          first_name?: string
          middle_names?: string | null
          last_name?: string
          gender?: string | null
          dob?: string | null
          birth_place?: string | null
          photo_url?: string | null
          deceased?: boolean
          deceased_date?: string | null
          privacy?: Json
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
          ekda?: string | null
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          blocked?: boolean
          blocked_at?: string | null
          kuldevi?: string | null
          overseas_verified?: boolean | null
          is_locked?: boolean
          locked_reason?: string | null
          is_deleted?: boolean
        }
        Update: {
          id?: string | null
          user_id?: string
          chapter_id?: string | null
          global_id?: string | null
          verification_level?: number | null
          first_name?: string | null
          middle_names?: string | null
          last_name?: string | null
          gender?: string | null
          dob?: string | null
          birth_place?: string | null
          photo_url?: string | null
          deceased?: boolean | null
          deceased_date?: string | null
          privacy?: Json | null
          onboarding_completed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          ekda?: string | null
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_reason?: string | null
          blocked?: boolean | null
          blocked_at?: string | null
          kuldevi?: string | null
          overseas_verified?: boolean | null
          is_locked?: boolean | null
          locked_reason?: string | null
          is_deleted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "members_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_sessions: {
        Row: {
          id: string
          mentorship_id: string
          notes: string | null
          session_date: string
          created_at: string
        }
        Insert: {
          id?: string
          mentorship_id: string
          notes?: string | null
          session_date?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          mentorship_id?: string
          notes?: string | null
          session_date?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "mentorships"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorships: {
        Row: {
          id: string
          mentor_member_id: string
          mentee_member_id: string | null
          skills: string[]
          status: string
          created_at: string
          description: string | null
          max_mentees: number | null
          availability: string | null
          mode: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          mentor_member_id: string
          mentee_member_id?: string | null
          skills?: string[]
          status?: string
          created_at?: string
          description?: string | null
          max_mentees?: number | null
          availability?: string | null
          mode?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          mentor_member_id?: string
          mentee_member_id?: string | null
          skills?: string[] | null
          status?: string | null
          created_at?: string | null
          description?: string | null
          max_mentees?: number | null
          availability?: string | null
          mode?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorships_mentor_member_id_fkey"
            columns: ["mentor_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorships_mentee_member_id_fkey"
            columns: ["mentee_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          id: string
          member_id: string
          email_enabled: boolean
          whatsapp_enabled: boolean
          push_enabled: boolean
          categories: Json
          updated_at: string
          chapter_notifications_enabled: boolean
        }
        Insert: {
          id?: string
          member_id: string
          email_enabled?: boolean
          whatsapp_enabled?: boolean
          push_enabled?: boolean
          categories?: Json
          updated_at?: string
          chapter_notifications_enabled?: boolean
        }
        Update: {
          id?: string | null
          member_id?: string
          email_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
          push_enabled?: boolean | null
          categories?: Json | null
          updated_at?: string | null
          chapter_notifications_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          member_id: string
          type: string
          title: string
          description: string
          entity_id: string | null
          entity_type: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          type: string
          title: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string | null
          member_id?: string
          type?: string
          title?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          read?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      obituaries: {
        Row: {
          id: string
          full_name: string
          also_known_as: string | null
          dob: string | null
          dod: string
          city_of_origin: string | null
          city_of_passing: string | null
          chapter_id: string | null
          photo_url: string | null
          tribute: string | null
          family_message: string | null
          status: string
          posted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          also_known_as?: string | null
          dob?: string | null
          dod: string
          city_of_origin?: string | null
          city_of_passing?: string | null
          chapter_id?: string | null
          photo_url?: string | null
          tribute?: string | null
          family_message?: string | null
          status?: string
          posted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          full_name?: string
          also_known_as?: string | null
          dob?: string | null
          dod?: string
          city_of_origin?: string | null
          city_of_passing?: string | null
          chapter_id?: string | null
          photo_url?: string | null
          tribute?: string | null
          family_message?: string | null
          status?: string | null
          posted_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obituaries_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obituaries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      oral_histories: {
        Row: {
          id: string
          title: string
          description: string | null
          narrator_name: string | null
          narrator_member_id: string | null
          recorded_date: string | null
          media_url: string | null
          media_type: string
          duration_seconds: number | null
          transcript: string | null
          tags: string[] | null
          status: string
          uploaded_by: string | null
          created_at: string
          elder_priority: boolean | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          narrator_name?: string | null
          narrator_member_id?: string | null
          recorded_date?: string | null
          media_url?: string | null
          media_type?: string
          duration_seconds?: number | null
          transcript?: string | null
          tags?: string[] | null
          status?: string
          uploaded_by?: string | null
          created_at?: string
          elder_priority?: boolean | null
        }
        Update: {
          id?: string | null
          title?: string
          description?: string | null
          narrator_name?: string | null
          narrator_member_id?: string | null
          recorded_date?: string | null
          media_url?: string | null
          media_type?: string | null
          duration_seconds?: number | null
          transcript?: string | null
          tags?: string[] | null
          status?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          elder_priority?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "oral_histories_narrator_member_id_fkey"
            columns: ["narrator_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oral_histories_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_tags: {
        Row: {
          id: string
          photo_id: string
          member_id: string
          tagged_by: string | null
          consent_status: string
          created_at: string
        }
        Insert: {
          id?: string
          photo_id: string
          member_id: string
          tagged_by?: string | null
          consent_status?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          photo_id?: string
          member_id?: string
          tagged_by?: string | null
          consent_status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_tags_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "event_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_tags_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          id: string
          donation_id: string
          number: string
          payload: Json
          issued_at: string
        }
        Insert: {
          id?: string
          donation_id: string
          number: string
          payload?: Json
          issued_at?: string
        }
        Update: {
          id?: string | null
          donation_id?: string
          number?: string
          payload?: Json | null
          issued_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_pledges: {
        Row: {
          id: string
          member_id: string
          fund_id: string
          amount: number
          currency: string
          interval: string
          start_date: string
          end_date: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          fund_id: string
          amount: number
          currency?: string
          interval?: string
          start_date?: string
          end_date?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          member_id?: string
          fund_id?: string
          amount?: number
          currency?: string | null
          interval?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_pledges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_pledges_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_execution_log: {
        Row: {
          id: string
          execution_type: string
          day_interval: number
          reminders_sent: number | null
          reminders_failed: number | null
          executed_at: string
          completed_at: string | null
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          execution_type: string
          day_interval: number
          reminders_sent?: number | null
          reminders_failed?: number | null
          executed_at?: string
          completed_at?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          execution_type?: string
          day_interval?: number
          reminders_sent?: number | null
          reminders_failed?: number | null
          executed_at?: string | null
          completed_at?: string | null
          status?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Relationships: [
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_member_id: string | null
          entity_type: string
          entity_id: string
          category: string
          reason: string | null
          status: string
          admin_action: string | null
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_member_id?: string | null
          entity_type: string
          entity_id: string
          category: string
          reason?: string | null
          status?: string
          admin_action?: string | null
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          reporter_member_id?: string | null
          entity_type?: string
          entity_id?: string
          category?: string
          reason?: string | null
          status?: string | null
          admin_action?: string | null
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_member_id_fkey"
            columns: ["reporter_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      rishta_requests: {
        Row: {
          id: string
          from_profile_id: string | null
          to_profile_id: string | null
          family_contact_name: string | null
          family_contact_phone: string | null
          message: string | null
          status: string | null
          created_at: string | null
          responded_at: string | null
          intro_message: string | null
          from_family_ok: boolean | null
          to_family_ok: boolean | null
          admin_notes: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          from_profile_id?: string | null
          to_profile_id?: string | null
          family_contact_name?: string | null
          family_contact_phone?: string | null
          message?: string | null
          status?: string | null
          created_at?: string | null
          responded_at?: string | null
          intro_message?: string | null
          from_family_ok?: boolean | null
          to_family_ok?: boolean | null
          admin_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          from_profile_id?: string | null
          to_profile_id?: string | null
          family_contact_name?: string | null
          family_contact_phone?: string | null
          message?: string | null
          status?: string | null
          created_at?: string | null
          responded_at?: string | null
          intro_message?: string | null
          from_family_ok?: boolean | null
          to_family_ok?: boolean | null
          admin_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rishta_requests_from_profile_id_fkey"
            columns: ["from_profile_id"]
            isOneToOne: false
            referencedRelation: "matrimonial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rishta_requests_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "matrimonial_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments: {
        Row: {
          id: string
          role_id: string
          member_id: string
          start_date: string
          end_date: string | null
          created_by: string | null
          created_at: string
          chapter_id: string | null
        }
        Insert: {
          id?: string
          role_id: string
          member_id: string
          start_date?: string
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          chapter_id?: string | null
        }
        Update: {
          id?: string | null
          role_id?: string
          member_id?: string
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string | null
          chapter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          chapter_id: string | null
          name: string
          scope: string
        }
        Insert: {
          id?: string
          chapter_id?: string | null
          name: string
          scope?: string
        }
        Update: {
          id?: string | null
          chapter_id?: string | null
          name?: string
          scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      samiti_groups: {
        Row: {
          id: string
          chapter_id: string | null
          name: string
          type: string | null
          description: string | null
          contact_member_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          chapter_id?: string | null
          name: string
          type?: string | null
          description?: string | null
          contact_member_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          chapter_id?: string | null
          name?: string
          type?: string | null
          description?: string | null
          contact_member_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "samiti_groups_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samiti_groups_contact_member_id_fkey"
            columns: ["contact_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      samiti_members: {
        Row: {
          id: string
          samiti_id: string | null
          member_id: string | null
          role: string | null
          joined_at: string | null
        }
        Insert: {
          id?: string
          samiti_id?: string | null
          member_id?: string | null
          role?: string | null
          joined_at?: string | null
        }
        Update: {
          id?: string | null
          samiti_id?: string | null
          member_id?: string | null
          role?: string | null
          joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "samiti_members_samiti_id_fkey"
            columns: ["samiti_id"]
            isOneToOne: false
            referencedRelation: "samiti_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samiti_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_applications: {
        Row: {
          id: string
          scholarship_id: string
          member_id: string
          essay: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          scholarship_id: string
          member_id: string
          essay?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          scholarship_id?: string
          member_id?: string
          essay?: string | null
          status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_applications_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_applications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarships: {
        Row: {
          id: string
          chapter_id: string | null
          name: string
          description: string | null
          amount: number | null
          currency: string
          deadline: string | null
          status: string
          created_at: string
          eligibility: string | null
          required_documents: string[] | null
          contact_email: string | null
          contact_phone: string | null
          max_recipients: number | null
          city_id: string | null
          state_id: string | null
          country_id: string | null
          category: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          chapter_id?: string | null
          name: string
          description?: string | null
          amount?: number | null
          currency?: string
          deadline?: string | null
          status?: string
          created_at?: string
          eligibility?: string | null
          required_documents?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          max_recipients?: number | null
          city_id?: string | null
          state_id?: string | null
          country_id?: string | null
          category?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          chapter_id?: string | null
          name?: string
          description?: string | null
          amount?: number | null
          currency?: string | null
          deadline?: string | null
          status?: string | null
          created_at?: string | null
          eligibility?: string | null
          required_documents?: string[] | null
          contact_email?: string | null
          contact_phone?: string | null
          max_recipients?: number | null
          city_id?: string | null
          state_id?: string | null
          country_id?: string | null
          category?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarships_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarships_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarships_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value?: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json | null
          updated_at?: string | null
        }
        Relationships: [
        ]
      }
      sms_messages: {
        Row: {
          id: string
          recipient_phone: string
          recipient_member_id: string | null
          body: string
          status: string
          provider: string | null
          provider_sid: string | null
          error: string | null
          sent_by: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipient_phone: string
          recipient_member_id?: string | null
          body: string
          status?: string
          provider?: string | null
          provider_sid?: string | null
          error?: string | null
          sent_by?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          recipient_phone?: string
          recipient_member_id?: string | null
          body?: string
          status?: string | null
          provider?: string | null
          provider_sid?: string | null
          error?: string | null
          sent_by?: string | null
          sent_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          id: string
          country_id: string
          code: string
          name: string
        }
        Insert: {
          id?: string
          country_id: string
          code: string
          name: string
        }
        Update: {
          id?: string | null
          country_id?: string
          code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "states_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_requests: {
        Row: {
          id: string
          requester_user_id: string | null
          type: string
          term: string
          reason: string | null
          status: string
          decided_by: string | null
          decided_at: string | null
        }
        Insert: {
          id?: string
          requester_user_id?: string | null
          type: string
          term: string
          reason?: string | null
          status?: string
          decided_by?: string | null
          decided_at?: string | null
        }
        Update: {
          id?: string | null
          requester_user_id?: string | null
          type?: string
          term?: string
          reason?: string | null
          status?: string | null
          decided_by?: string | null
          decided_at?: string | null
        }
        Relationships: [
        ]
      }
      taxonomies: {
        Row: {
          id: string
          type: string
          term: string
          normalized: string
        }
        Insert: {
          id?: string
          type: string
          term: string
          normalized: string
        }
        Update: {
          id?: string | null
          type?: string
          term?: string
          normalized?: string
        }
        Relationships: [
        ]
      }
      verification_requests: {
        Row: {
          id: string
          member_id: string
          requested_level: number
          status: string
          document_type: string | null
          document_url: string | null
          reviewer_user_id: string | null
          reviewed_at: string | null
          notes: string | null
          created_at: string
          document_files: Json | null
        }
        Insert: {
          id?: string
          member_id: string
          requested_level?: number
          status?: string
          document_type?: string | null
          document_url?: string | null
          reviewer_user_id?: string | null
          reviewed_at?: string | null
          notes?: string | null
          created_at?: string
          document_files?: Json | null
        }
        Update: {
          id?: string | null
          member_id?: string
          requested_level?: number | null
          status?: string | null
          document_type?: string | null
          document_url?: string | null
          reviewer_user_id?: string | null
          reviewed_at?: string | null
          notes?: string | null
          created_at?: string | null
          document_files?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      vouch_requests: {
        Row: {
          id: string
          requester_member_id: string
          target_member_id: string
          message: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          requester_member_id: string
          target_member_id: string
          message?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          requester_member_id?: string
          target_member_id?: string
          message?: string | null
          status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouch_requests_requester_member_id_fkey"
            columns: ["requester_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouch_requests_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      vouches: {
        Row: {
          id: string
          member_id: string
          voucher_member_id: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          voucher_member_id: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          member_id?: string
          voucher_member_id?: string
          note?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouches_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouches_voucher_member_id_fkey"
            columns: ["voucher_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          id: string
          template_id: string | null
          recipient_phone: string
          recipient_member_id: string | null
          parameters: Json | null
          meta_message_id: string | null
          status: string
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          recipient_phone: string
          recipient_member_id?: string | null
          parameters?: Json | null
          meta_message_id?: string | null
          status?: string
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string | null
          template_id?: string | null
          recipient_phone?: string
          recipient_member_id?: string | null
          parameters?: Json | null
          meta_message_id?: string | null
          status?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          id: string
          name: string
          language: string
          category: string
          header_text: string | null
          body_text: string
          footer_text: string | null
          buttons: Json | null
          meta_template_id: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          language?: string
          category?: string
          header_text?: string | null
          body_text: string
          footer_text?: string | null
          buttons?: Json | null
          meta_template_id?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          name?: string
          language?: string | null
          category?: string | null
          header_text?: string | null
          body_text?: string
          footer_text?: string | null
          buttons?: Json | null
          meta_template_id?: string | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_family_invitation: {
        Args: { p_token: string; p_acceptee_member_id: string }
        Returns: Json
      }
      assign_role: {
        Args: { p_member_id: string; p_role_id: string; p_chapter_id?: string }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_member_id: string
          p_type: string
          p_title: string
          p_description?: string
          p_entity_id?: string
          p_entity_type?: string
        }
        Returns: string
      }
      create_notifications_batch: {
        Args: {
          p_member_ids: string[]
          p_type: string
          p_title: string
          p_description?: string
          p_entity_id?: string
          p_entity_type?: string
        }
        Returns: number
      }
      generate_global_id: {
        Args: {
          p_city_code: string
          p_country_code: string
          p_state_code: string
        }
        Returns: string
      }
      get_member_emails: {
        Args: Record<string, never>
        Returns: {
          member_id: string
          email: string
          email_confirmed_at: string
        }[]
      }
      get_member_phones: {
        Args: Record<string, never>
        Returns: {
          member_id: string
          phone: string
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_direct_family_relation: {
        Args: { member_a: string; member_b: string }
        Returns: boolean
      }
      revoke_role: {
        Args: { p_assignment_id: string }
        Returns: Json
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



