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
      announcements: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          starts_at: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      audits: {
        Row: {
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          field: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          field?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          field?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      book_pages: {
        Row: {
          book_key: string
          id: string
          image_url: string | null
          metadata: Json
          ocr_text: string | null
          page_number: number
        }
        Insert: {
          book_key: string
          id?: string
          image_url?: string | null
          metadata?: Json
          ocr_text?: string | null
          page_number: number
        }
        Update: {
          book_key?: string
          id?: string
          image_url?: string | null
          metadata?: Json
          ocr_text?: string | null
          page_number?: number
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          chapter_id: string | null
          city_id: string | null
          country_id: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          employee_count: string | null
          founded_year: number | null
          gst_number: string | null
          id: string
          license_number: string | null
          logo_url: string | null
          name: string
          operating_hours: Json | null
          owner_member_id: string
          phone: string | null
          postal_code: string | null
          revenue_range: string | null
          sector: string | null
          social_links: Json | null
          state_id: string | null
          suspended: boolean
          suspended_at: string | null
          tags: string[] | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          chapter_id?: string | null
          city_id?: string | null
          country_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          employee_count?: string | null
          founded_year?: number | null
          gst_number?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name: string
          operating_hours?: Json | null
          owner_member_id: string
          phone?: string | null
          postal_code?: string | null
          revenue_range?: string | null
          sector?: string | null
          social_links?: Json | null
          state_id?: string | null
          suspended?: boolean
          suspended_at?: string | null
          tags?: string[] | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          chapter_id?: string | null
          city_id?: string | null
          country_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          employee_count?: string | null
          founded_year?: number | null
          gst_number?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name?: string
          operating_hours?: Json | null
          owner_member_id?: string
          phone?: string | null
          postal_code?: string | null
          revenue_range?: string | null
          sector?: string | null
          social_links?: Json | null
          state_id?: string | null
          suspended?: boolean
          suspended_at?: string | null
          tags?: string[] | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: [
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
            foreignKeyName: "businesses_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
      chapter_transfers: {
        Row: {
          approved_by: string | null
          created_at: string
          from_chapter_id: string | null
          id: string
          member_id: string
          reason: string | null
          status: string
          to_chapter_id: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          from_chapter_id?: string | null
          id?: string
          member_id: string
          reason?: string | null
          status?: string
          to_chapter_id?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          from_chapter_id?: string | null
          id?: string
          member_id?: string
          reason?: string | null
          status?: string
          to_chapter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_transfers_from_chapter_id_fkey"
            columns: ["from_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_transfers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
          city_id: string | null
          country_id: string | null
          created_at: string
          id: string
          name: string
          settings: Json
          slug: string
          state_id: string | null
          subdomain: string
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          state_id?: string | null
          subdomain: string
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          state_id?: string | null
          subdomain?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
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
        ]
      }
      cities: {
        Row: {
          code: string
          id: string
          name: string
          state_id: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          state_id: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          state_id?: string
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
          city_code: string
          city_name: string
          country_code: string
          id: string
          state_code: string
        }
        Insert: {
          city_code: string
          city_name: string
          country_code: string
          id?: string
          state_code: string
        }
        Update: {
          city_code?: string
          city_name?: string
          country_code?: string
          id?: string
          state_code?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          captured_at: string
          context: string
          id: string
          member_id: string | null
          payload: Json
          policy_version: string
          region: string
        }
        Insert: {
          captured_at?: string
          context: string
          id?: string
          member_id?: string | null
          payload?: Json
          policy_version: string
          region: string
        }
        Update: {
          captured_at?: string
          context?: string
          id?: string
          member_id?: string | null
          payload?: Json
          policy_version?: string
          region?: string
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
          author_name: string | null
          body: string | null
          category: string | null
          chapter_id: string | null
          city_id: string | null
          country_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          featured: boolean | null
          id: string
          images: Json
          published_at: string | null
          reviewed_by: string | null
          schedule: Json
          source_url: string | null
          state_id: string | null
          status: string
          summary: string | null
          suspended: boolean
          tags: string[]
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          author_name?: string | null
          body?: string | null
          category?: string | null
          chapter_id?: string | null
          city_id?: string | null
          country_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean | null
          id?: string
          images?: Json
          published_at?: string | null
          reviewed_by?: string | null
          schedule?: Json
          source_url?: string | null
          state_id?: string | null
          status?: string
          summary?: string | null
          suspended?: boolean
          tags?: string[]
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          author_name?: string | null
          body?: string | null
          category?: string | null
          chapter_id?: string | null
          city_id?: string | null
          country_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean | null
          id?: string
          images?: Json
          published_at?: string | null
          reviewed_by?: string | null
          schedule?: Json
          source_url?: string | null
          state_id?: string | null
          status?: string
          summary?: string | null
          suspended?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          views_count?: number | null
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
            foreignKeyName: "content_news_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_news_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
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
          id?: string
          iso2?: string
          name?: string
        }
        Relationships: []
      }
      data_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          member_id: string
          status: string
          type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          member_id: string
          status?: string
          type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          member_id?: string
          status?: string
          type?: string
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
          amount: number
          created_at: string
          currency: string
          donor_address: string | null
          donor_email: string | null
          donor_name: string | null
          donor_phone: string | null
          donor_wall_opt_in: boolean
          fund_id: string
          id: string
          member_id: string | null
          notes: string | null
          pan_number: string | null
          payment_method: string | null
          provider: string
          provider_ref: string | null
          recurring_interval: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          donor_address?: string | null
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          donor_wall_opt_in?: boolean
          fund_id: string
          id?: string
          member_id?: string | null
          notes?: string | null
          pan_number?: string | null
          payment_method?: string | null
          provider?: string
          provider_ref?: string | null
          recurring_interval?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          donor_address?: string | null
          donor_email?: string | null
          donor_name?: string | null
          donor_phone?: string | null
          donor_wall_opt_in?: boolean
          fund_id?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          pan_number?: string | null
          payment_method?: string | null
          provider?: string
          provider_ref?: string | null
          recurring_interval?: string | null
          status?: string
          type?: string
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
      education: {
        Row: {
          degree: string | null
          id: string
          institution: string | null
          member_id: string
          year: number | null
        }
        Insert: {
          degree?: string | null
          id?: string
          institution?: string | null
          member_id: string
          year?: number | null
        }
        Update: {
          degree?: string | null
          id?: string
          institution?: string | null
          member_id?: string
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
          city_id: string | null
          created_at: string
          id: string
          name: string
          phone: string
          type: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          id?: string
          name: string
          phone: string
          type: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string
          type?: string
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
          company: string | null
          end_date: string | null
          id: string
          job_title: string | null
          member_id: string
          sector: string | null
          start_date: string | null
        }
        Insert: {
          company?: string | null
          end_date?: string | null
          id?: string
          job_title?: string | null
          member_id: string
          sector?: string | null
          start_date?: string | null
        }
        Update: {
          company?: string | null
          end_date?: string | null
          id?: string
          job_title?: string | null
          member_id?: string
          sector?: string | null
          start_date?: string | null
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
          event_id: string
          id: string
          member_id: string
          scanned_at: string
          scanned_by: string | null
        }
        Insert: {
          event_id: string
          id?: string
          member_id: string
          scanned_at?: string
          scanned_by?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          member_id?: string
          scanned_at?: string
          scanned_by?: string | null
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
          caption: string | null
          consent: string
          created_at: string
          event_id: string
          id: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          consent?: string
          created_at?: string
          event_id: string
          id?: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          consent?: string
          created_at?: string
          event_id?: string
          id?: string
          uploaded_by?: string | null
          url?: string
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
          created_at: string
          event_id: string
          guests: number
          id: string
          member_id: string
          status: string
        }
        Insert: {
          created_at?: string
          event_id: string
          guests?: number
          id?: string
          member_id: string
          status?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          guests?: number
          id?: string
          member_id?: string
          status?: string
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
          address_line1: string | null
          category: string | null
          chapter_id: string | null
          city_id: string | null
          consent_required: boolean
          contact_email: string | null
          contact_phone: string | null
          country_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          event_type: string | null
          fee_amount: number | null
          fee_currency: string | null
          id: string
          max_capacity: number | null
          name: string
          organizer_name: string | null
          recurring: Json | null
          registration_deadline: string | null
          starts_at: string
          state_id: string | null
          status: string
          suspended: boolean
          tags: string[] | null
          ticketing: Json
          updated_at: string
          venue: string | null
          virtual_url: string | null
        }
        Insert: {
          address_line1?: string | null
          category?: string | null
          chapter_id?: string | null
          city_id?: string | null
          consent_required?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          country_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          event_type?: string | null
          fee_amount?: number | null
          fee_currency?: string | null
          id?: string
          max_capacity?: number | null
          name: string
          organizer_name?: string | null
          recurring?: Json | null
          registration_deadline?: string | null
          starts_at: string
          state_id?: string | null
          status?: string
          suspended?: boolean
          tags?: string[] | null
          ticketing?: Json
          updated_at?: string
          venue?: string | null
          virtual_url?: string | null
        }
        Update: {
          address_line1?: string | null
          category?: string | null
          chapter_id?: string | null
          city_id?: string | null
          consent_required?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          country_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          event_type?: string | null
          fee_amount?: number | null
          fee_currency?: string | null
          id?: string
          max_capacity?: number | null
          name?: string
          organizer_name?: string | null
          recurring?: Json | null
          registration_deadline?: string | null
          starts_at?: string
          state_id?: string | null
          status?: string
          suspended?: boolean
          tags?: string[] | null
          ticketing?: Json
          updated_at?: string
          venue?: string | null
          virtual_url?: string | null
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
            foreignKeyName: "events_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
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
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      family_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_member_id: string | null
          created_at: string
          id: string
          invitee_email: string | null
          invitee_name: string
          invitee_phone: string | null
          invitee_phone_country_code: string | null
          inviter_member_id: string
          relation: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_member_id?: string | null
          created_at?: string
          id?: string
          invitee_email?: string | null
          invitee_name: string
          invitee_phone?: string | null
          invitee_phone_country_code?: string | null
          inviter_member_id: string
          relation: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_member_id?: string | null
          created_at?: string
          id?: string
          invitee_email?: string | null
          invitee_name?: string
          invitee_phone?: string | null
          invitee_phone_country_code?: string | null
          inviter_member_id?: string
          relation?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_accepted_by_member_id_fkey"
            columns: ["accepted_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_inviter_member_id_fkey"
            columns: ["inviter_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_links: {
        Row: {
          created_at: string
          family_id: string | null
          id: string
          member_id: string
          related_member_id: string | null
          relation: string
        }
        Insert: {
          created_at?: string
          family_id?: string | null
          id?: string
          member_id: string
          related_member_id?: string | null
          relation: string
        }
        Update: {
          created_at?: string
          family_id?: string | null
          id?: string
          member_id?: string
          related_member_id?: string | null
          relation?: string
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
      funds: {
        Row: {
          active: boolean
          chapter_id: string | null
          currency: string
          id: string
          name: string
          scope: string
        }
        Insert: {
          active?: boolean
          chapter_id?: string | null
          currency?: string
          id?: string
          name: string
          scope: string
        }
        Update: {
          active?: boolean
          chapter_id?: string | null
          currency?: string
          id?: string
          name?: string
          scope?: string
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
          city_code: string
          country_code: string
          id: string
          last_sequence: number
          state_code: string
          year_code: string
        }
        Insert: {
          city_code: string
          country_code: string
          id?: string
          last_sequence?: number
          state_code: string
          year_code: string
        }
        Update: {
          city_code?: string
          country_code?: string
          id?: string
          last_sequence?: number
          state_code?: string
          year_code?: string
        }
        Relationships: []
      }
      hall_bookings: {
        Row: {
          approved_by: string | null
          booking_date: string
          chapter_id: string | null
          created_at: string
          end_time: string
          guests: number | null
          hall_name: string
          id: string
          member_id: string
          notes: string | null
          purpose: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          booking_date: string
          chapter_id?: string | null
          created_at?: string
          end_time: string
          guests?: number | null
          hall_name: string
          id?: string
          member_id: string
          notes?: string | null
          purpose?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          booking_date?: string
          chapter_id?: string | null
          created_at?: string
          end_time?: string
          guests?: number | null
          hall_name?: string
          id?: string
          member_id?: string
          notes?: string | null
          purpose?: string | null
          start_time?: string
          status?: string
          updated_at?: string
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
          approved: boolean | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tag: string
          tagged_by: string | null
        }
        Insert: {
          approved?: boolean | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tag: string
          tagged_by?: string | null
        }
        Update: {
          approved?: boolean | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tag?: string
          tagged_by?: string | null
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
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          member_id: string
          resume_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          member_id: string
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          member_id?: string
          resume_url?: string | null
          status?: string
          updated_at?: string
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
          application_url: string | null
          benefits: string[] | null
          chapter_id: string | null
          city_id: string | null
          contact_email: string | null
          contact_phone: string | null
          country_id: string | null
          created_at: string
          description: string | null
          education_required: string | null
          employer_business_id: string | null
          employer_member_id: string | null
          employment_type: string | null
          experience_max: number | null
          experience_min: number | null
          expires_at: string | null
          id: string
          location: string | null
          positions_available: number | null
          remote: boolean
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          skills_required: string[] | null
          state_id: string | null
          status: string
          suspended: boolean
          tags: string[]
          title: string
          updated_at: string | null
        }
        Insert: {
          application_url?: string | null
          benefits?: string[] | null
          chapter_id?: string | null
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string
          description?: string | null
          education_required?: string | null
          employer_business_id?: string | null
          employer_member_id?: string | null
          employment_type?: string | null
          experience_max?: number | null
          experience_min?: number | null
          expires_at?: string | null
          id?: string
          location?: string | null
          positions_available?: number | null
          remote?: boolean
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          skills_required?: string[] | null
          state_id?: string | null
          status?: string
          suspended?: boolean
          tags?: string[]
          title: string
          updated_at?: string | null
        }
        Update: {
          application_url?: string | null
          benefits?: string[] | null
          chapter_id?: string | null
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string
          description?: string | null
          education_required?: string | null
          employer_business_id?: string | null
          employer_member_id?: string | null
          employment_type?: string | null
          experience_max?: number | null
          experience_min?: number | null
          expires_at?: string | null
          id?: string
          location?: string | null
          positions_available?: number | null
          remote?: boolean
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          skills_required?: string[] | null
          state_id?: string | null
          status?: string
          suspended?: boolean
          tags?: string[]
          title?: string
          updated_at?: string | null
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
            foreignKeyName: "jobs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
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
            foreignKeyName: "jobs_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      magazine_issues: {
        Row: {
          created_at: string
          id: string
          issue_date: string | null
          metadata: Json
          ocr_text: string | null
          pdf_url: string | null
          title: string
          volume: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issue_date?: string | null
          metadata?: Json
          ocr_text?: string | null
          pdf_url?: string | null
          title: string
          volume?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issue_date?: string | null
          metadata?: Json
          ocr_text?: string | null
          pdf_url?: string | null
          title?: string
          volume?: string | null
        }
        Relationships: []
      }
      matrimonial_introductions: {
        Row: {
          created_at: string
          from_member_id: string
          id: string
          message: string | null
          responded_at: string | null
          status: string
          to_member_id: string
        }
        Insert: {
          created_at?: string
          from_member_id: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          to_member_id: string
        }
        Update: {
          created_at?: string
          from_member_id?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          to_member_id?: string
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
          about: string | null
          blood_group: string | null
          business_name: string | null
          citizenship: string | null
          complexion: string | null
          contact_number: string | null
          country: string | null
          created_at: string
          current_city: string | null
          current_state: string | null
          diet: string | null
          driving: string | null
          education_field: string | null
          education_level: string | null
          ekda: string | null
          family_status: string | null
          family_type: string | null
          father_name: string | null
          father_occupation: string | null
          glasses: string | null
          gotra: string | null
          guardian_member_id: string | null
          height_cm: number | null
          hobbies: string[] | null
          id: string
          income: number | null
          income_currency: string | null
          kuldevi: string | null
          linkedin_url: string | null
          manglik: string | null
          marital_status: string | null
          member_id: string
          mother_name: string | null
          mother_occupation: string | null
          nakshatra: string | null
          native_place: string | null
          parent_contact: string | null
          parents_marital_status: string | null
          photos: string[] | null
          position_title: string | null
          preferences: Json
          rashi: string | null
          siblings: string | null
          suspended: boolean
          updated_at: string
          verified: boolean
          visa_type: string | null
          visibility: string
          weight_kg: number | null
        }
        Insert: {
          about?: string | null
          blood_group?: string | null
          business_name?: string | null
          citizenship?: string | null
          complexion?: string | null
          contact_number?: string | null
          country?: string | null
          created_at?: string
          current_city?: string | null
          current_state?: string | null
          diet?: string | null
          driving?: string | null
          education_field?: string | null
          education_level?: string | null
          ekda?: string | null
          family_status?: string | null
          family_type?: string | null
          father_name?: string | null
          father_occupation?: string | null
          glasses?: string | null
          gotra?: string | null
          guardian_member_id?: string | null
          height_cm?: number | null
          hobbies?: string[] | null
          id?: string
          income?: number | null
          income_currency?: string | null
          kuldevi?: string | null
          linkedin_url?: string | null
          manglik?: string | null
          marital_status?: string | null
          member_id: string
          mother_name?: string | null
          mother_occupation?: string | null
          nakshatra?: string | null
          native_place?: string | null
          parent_contact?: string | null
          parents_marital_status?: string | null
          photos?: string[] | null
          position_title?: string | null
          preferences?: Json
          rashi?: string | null
          siblings?: string | null
          suspended?: boolean
          updated_at?: string
          verified?: boolean
          visa_type?: string | null
          visibility?: string
          weight_kg?: number | null
        }
        Update: {
          about?: string | null
          blood_group?: string | null
          business_name?: string | null
          citizenship?: string | null
          complexion?: string | null
          contact_number?: string | null
          country?: string | null
          created_at?: string
          current_city?: string | null
          current_state?: string | null
          diet?: string | null
          driving?: string | null
          education_field?: string | null
          education_level?: string | null
          ekda?: string | null
          family_status?: string | null
          family_type?: string | null
          father_name?: string | null
          father_occupation?: string | null
          glasses?: string | null
          gotra?: string | null
          guardian_member_id?: string | null
          height_cm?: number | null
          hobbies?: string[] | null
          id?: string
          income?: number | null
          income_currency?: string | null
          kuldevi?: string | null
          linkedin_url?: string | null
          manglik?: string | null
          marital_status?: string | null
          member_id?: string
          mother_name?: string | null
          mother_occupation?: string | null
          nakshatra?: string | null
          native_place?: string | null
          parent_contact?: string | null
          parents_marital_status?: string | null
          photos?: string[] | null
          position_title?: string | null
          preferences?: Json
          rashi?: string | null
          siblings?: string | null
          suspended?: boolean
          updated_at?: string
          verified?: boolean
          visa_type?: string | null
          visibility?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matrimonial_profiles_guardian_member_id_fkey"
            columns: ["guardian_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matrimonial_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          consent: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          mime_type: string
          owner_user_id: string | null
          scan_result: string | null
          scanned: boolean
          size_bytes: number
          url: string
        }
        Insert: {
          consent?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          mime_type: string
          owner_user_id?: string | null
          scan_result?: string | null
          scanned?: boolean
          size_bytes?: number
          url: string
        }
        Update: {
          consent?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          mime_type?: string
          owner_user_id?: string | null
          scan_result?: string | null
          scanned?: boolean
          size_bytes?: number
          url?: string
        }
        Relationships: []
      }
      medical_aid_requests: {
        Row: {
          amount_needed: number | null
          approved_amount: number | null
          approved_by: string | null
          chapter_id: string | null
          condition_summary: string | null
          created_at: string
          currency: string
          documents: Json | null
          id: string
          member_id: string
          patient_name: string
          relation: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_needed?: number | null
          approved_amount?: number | null
          approved_by?: string | null
          chapter_id?: string | null
          condition_summary?: string | null
          created_at?: string
          currency?: string
          documents?: Json | null
          id?: string
          member_id: string
          patient_name: string
          relation?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_needed?: number | null
          approved_amount?: number | null
          approved_by?: string | null
          chapter_id?: string | null
          condition_summary?: string | null
          created_at?: string
          currency?: string
          documents?: Json | null
          id?: string
          member_id?: string
          patient_name?: string
          relation?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_aid_requests_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_aid_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_contacts: {
        Row: {
          id: string
          member_id: string
          primary_flag: boolean
          type: string
          value: string
          verified: boolean
        }
        Insert: {
          id?: string
          member_id: string
          primary_flag?: boolean
          type: string
          value: string
          verified?: boolean
        }
        Update: {
          id?: string
          member_id?: string
          primary_flag?: boolean
          type?: string
          value?: string
          verified?: boolean
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
          language: string
          member_id: string
        }
        Insert: {
          id?: string
          language: string
          member_id: string
        }
        Update: {
          id?: string
          language?: string
          member_id?: string
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
          id?: string
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
          birth_place: string | null
          blocked: boolean
          blocked_at: string | null
          chapter_id: string | null
          created_at: string
          deceased: boolean
          deceased_date: string | null
          dob: string | null
          ekda: string | null
          first_name: string
          gender: string | null
          global_id: string | null
          id: string
          last_name: string
          middle_names: string | null
          onboarding_completed: boolean
          photo_url: string | null
          privacy: Json
          suspended: boolean
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          user_id: string
          verification_level: number
        }
        Insert: {
          birth_place?: string | null
          blocked?: boolean
          blocked_at?: string | null
          chapter_id?: string | null
          created_at?: string
          deceased?: boolean
          deceased_date?: string | null
          dob?: string | null
          ekda?: string | null
          first_name?: string
          gender?: string | null
          global_id?: string | null
          id?: string
          last_name?: string
          middle_names?: string | null
          onboarding_completed?: boolean
          photo_url?: string | null
          privacy?: Json
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id: string
          verification_level?: number
        }
        Update: {
          birth_place?: string | null
          blocked?: boolean
          blocked_at?: string | null
          chapter_id?: string | null
          created_at?: string
          deceased?: boolean
          deceased_date?: string | null
          dob?: string | null
          ekda?: string | null
          first_name?: string
          gender?: string | null
          global_id?: string | null
          id?: string
          last_name?: string
          middle_names?: string | null
          onboarding_completed?: boolean
          photo_url?: string | null
          privacy?: Json
          suspended?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id?: string
          verification_level?: number
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
          created_at: string
          id: string
          mentorship_id: string
          notes: string | null
          session_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentorship_id: string
          notes?: string | null
          session_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentorship_id?: string
          notes?: string | null
          session_date?: string
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
          availability: string | null
          created_at: string
          description: string | null
          id: string
          max_mentees: number | null
          mentee_member_id: string | null
          mentor_member_id: string
          mode: string | null
          skills: string[]
          status: string
          updated_at: string | null
        }
        Insert: {
          availability?: string | null
          created_at?: string
          description?: string | null
          id?: string
          max_mentees?: number | null
          mentee_member_id?: string | null
          mentor_member_id: string
          mode?: string | null
          skills?: string[]
          status?: string
          updated_at?: string | null
        }
        Update: {
          availability?: string | null
          created_at?: string
          description?: string | null
          id?: string
          max_mentees?: number | null
          mentee_member_id?: string | null
          mentor_member_id?: string
          mode?: string | null
          skills?: string[]
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorships_mentee_member_id_fkey"
            columns: ["mentee_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorships_mentor_member_id_fkey"
            columns: ["mentor_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          categories: Json
          email_enabled: boolean
          id: string
          member_id: string
          push_enabled: boolean
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          categories?: Json
          email_enabled?: boolean
          id?: string
          member_id: string
          push_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          categories?: Json
          email_enabled?: boolean
          id?: string
          member_id?: string
          push_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      oral_histories: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          media_type: string
          media_url: string | null
          narrator_member_id: string | null
          narrator_name: string | null
          recorded_date: string | null
          status: string
          tags: string[] | null
          title: string
          transcript: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          media_type?: string
          media_url?: string | null
          narrator_member_id?: string | null
          narrator_name?: string | null
          recorded_date?: string | null
          status?: string
          tags?: string[] | null
          title: string
          transcript?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          media_type?: string
          media_url?: string | null
          narrator_member_id?: string | null
          narrator_name?: string | null
          recorded_date?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          transcript?: string | null
          uploaded_by?: string | null
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
          consent_status: string
          created_at: string
          id: string
          member_id: string
          photo_id: string
          tagged_by: string | null
        }
        Insert: {
          consent_status?: string
          created_at?: string
          id?: string
          member_id: string
          photo_id: string
          tagged_by?: string | null
        }
        Update: {
          consent_status?: string
          created_at?: string
          id?: string
          member_id?: string
          photo_id?: string
          tagged_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_tags_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_tags_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "event_photos"
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
          donation_id: string
          id: string
          issued_at: string
          number: string
          payload: Json
        }
        Insert: {
          donation_id: string
          id?: string
          issued_at?: string
          number: string
          payload?: Json
        }
        Update: {
          donation_id?: string
          id?: string
          issued_at?: string
          number?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "receipts_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: true
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_action: string | null
          admin_notes: string | null
          category: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string | null
          reporter_member_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_action?: string | null
          admin_notes?: string | null
          category: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reason?: string | null
          reporter_member_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_action?: string | null
          admin_notes?: string | null
          category?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string | null
          reporter_member_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
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
      role_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          member_id: string
          role_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          member_id: string
          role_id: string
          start_date?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          member_id?: string
          role_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          chapter_id: string | null
          id: string
          name: string
          scope: string
        }
        Insert: {
          chapter_id?: string | null
          id?: string
          name: string
          scope?: string
        }
        Update: {
          chapter_id?: string | null
          id?: string
          name?: string
          scope?: string
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
      scholarship_applications: {
        Row: {
          created_at: string
          essay: string | null
          id: string
          member_id: string
          scholarship_id: string
          status: string
        }
        Insert: {
          created_at?: string
          essay?: string | null
          id?: string
          member_id: string
          scholarship_id: string
          status?: string
        }
        Update: {
          created_at?: string
          essay?: string | null
          id?: string
          member_id?: string
          scholarship_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_applications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_applications_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarships: {
        Row: {
          amount: number | null
          category: string | null
          chapter_id: string | null
          city_id: string | null
          contact_email: string | null
          contact_phone: string | null
          country_id: string | null
          created_at: string
          currency: string
          deadline: string | null
          description: string | null
          eligibility: string | null
          id: string
          max_recipients: number | null
          name: string
          required_documents: string[] | null
          state_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          chapter_id?: string | null
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          id?: string
          max_recipients?: number | null
          name: string
          required_documents?: string[] | null
          state_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          chapter_id?: string | null
          city_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          id?: string
          max_recipients?: number | null
          name?: string
          required_documents?: string[] | null
          state_id?: string | null
          status?: string
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
            foreignKeyName: "scholarships_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarships_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      states: {
        Row: {
          code: string
          country_id: string
          id: string
          name: string
        }
        Insert: {
          code: string
          country_id: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          country_id?: string
          id?: string
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
          decided_at: string | null
          decided_by: string | null
          id: string
          reason: string | null
          requester_user_id: string | null
          status: string
          term: string
          type: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason?: string | null
          requester_user_id?: string | null
          status?: string
          term: string
          type: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          reason?: string | null
          requester_user_id?: string | null
          status?: string
          term?: string
          type?: string
        }
        Relationships: []
      }
      taxonomies: {
        Row: {
          id: string
          normalized: string
          term: string
          type: string
        }
        Insert: {
          id?: string
          normalized: string
          term: string
          type: string
        }
        Update: {
          id?: string
          normalized?: string
          term?: string
          type?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          created_at: string
          document_type: string | null
          document_url: string | null
          id: string
          member_id: string
          notes: string | null
          requested_level: number
          reviewed_at: string | null
          reviewer_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          document_url?: string | null
          id?: string
          member_id: string
          notes?: string | null
          requested_level?: number
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          document_url?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          requested_level?: number
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          status?: string
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
      vouches: {
        Row: {
          created_at: string
          id: string
          member_id: string
          note: string | null
          voucher_member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          note?: string | null
          voucher_member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          note?: string | null
          voucher_member_id?: string
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
          created_at: string
          delivered_at: string | null
          error: string | null
          id: string
          meta_message_id: string | null
          parameters: Json | null
          read_at: string | null
          recipient_member_id: string | null
          recipient_phone: string
          sent_at: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          meta_message_id?: string | null
          parameters?: Json | null
          read_at?: string | null
          recipient_member_id?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          id?: string
          meta_message_id?: string | null
          parameters?: Json | null
          read_at?: string | null
          recipient_member_id?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          category: string
          created_at: string
          created_by: string | null
          footer_text: string | null
          header_text: string | null
          id: string
          language: string
          meta_template_id: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          category?: string
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          meta_template_id?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          category?: string
          created_at?: string
          created_by?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          language?: string
          meta_template_id?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_global_id: {
        Args: {
          p_city_code: string
          p_country_code: string
          p_state_code: string
        }
        Returns: string
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
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
