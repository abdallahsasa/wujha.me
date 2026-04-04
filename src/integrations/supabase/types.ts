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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          auth_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          organizer_id: string | null
          phone: string | null
          role: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          organizer_id?: string | null
          phone?: string | null
          role?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          organizer_id?: string | null
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
          type: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order?: number
          type: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          slug?: string
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          id: string
          subject_ar: string
          template_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_html?: string
          id?: string
          subject_ar?: string
          template_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_html?: string
          id?: string
          subject_ar?: string
          template_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_scanners: {
        Row: {
          admin_user_id: string
          created_at: string
          entry_point: string | null
          event_id: string
          id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          entry_point?: string | null
          event_id: string
          id?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          entry_point?: string | null
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_scanners_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_scanners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          age_restriction: string | null
          category_id: string
          city_id: string
          cover_image: string | null
          created_at: string
          currency: string
          description_ar: string
          description_en: string | null
          doors_open: string | null
          dress_code: string | null
          end_date: string | null
          event_code: string | null
          hero_thumbnail: string | null
          hero_video: string | null
          id: string
          images: Json | null
          is_featured: boolean
          is_free: boolean
          is_invitation_only: boolean
          max_capacity: number | null
          max_price: number | null
          min_price: number | null
          organizer_id: string | null
          share_url: string | null
          short_description_ar: string
          slug: string | null
          start_date: string
          status: string
          terms_ar: string | null
          title_ar: string
          title_en: string | null
          total_tickets_sold: number
          updated_at: string
          venue_id: string | null
          video_url: string | null
        }
        Insert: {
          age_restriction?: string | null
          category_id: string
          city_id: string
          cover_image?: string | null
          created_at?: string
          currency?: string
          description_ar: string
          description_en?: string | null
          doors_open?: string | null
          dress_code?: string | null
          end_date?: string | null
          event_code?: string | null
          hero_thumbnail?: string | null
          hero_video?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean
          is_free?: boolean
          is_invitation_only?: boolean
          max_capacity?: number | null
          max_price?: number | null
          min_price?: number | null
          organizer_id?: string | null
          share_url?: string | null
          short_description_ar: string
          slug?: string | null
          start_date: string
          status?: string
          terms_ar?: string | null
          title_ar: string
          title_en?: string | null
          total_tickets_sold?: number
          updated_at?: string
          venue_id?: string | null
          video_url?: string | null
        }
        Update: {
          age_restriction?: string | null
          category_id?: string
          city_id?: string
          cover_image?: string | null
          created_at?: string
          currency?: string
          description_ar?: string
          description_en?: string | null
          doors_open?: string | null
          dress_code?: string | null
          end_date?: string | null
          event_code?: string | null
          hero_thumbnail?: string | null
          hero_video?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean
          is_free?: boolean
          is_invitation_only?: boolean
          max_capacity?: number | null
          max_price?: number | null
          min_price?: number | null
          organizer_id?: string | null
          share_url?: string | null
          short_description_ar?: string
          slug?: string | null
          start_date?: string
          status?: string
          terms_ar?: string | null
          title_ar?: string
          title_en?: string | null
          total_tickets_sold?: number
          updated_at?: string
          venue_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          place_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          place_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          place_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_admin_id: string
          reference_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_admin_id: string
          reference_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_admin_id?: string
          reference_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_admin_id_fkey"
            columns: ["recipient_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_applications: {
        Row: {
          admin_notes: string | null
          auth_id: string
          created_at: string
          documents: Json
          email: string
          id: string
          name: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          auth_id: string
          created_at?: string
          documents?: Json
          email: string
          id?: string
          name: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          auth_id?: string
          created_at?: string
          documents?: Json
          email?: string
          id?: string
          name?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          created_at: string
          description_ar: string | null
          email: string | null
          id: string
          instagram: string | null
          is_active: boolean
          is_verified: boolean
          logo: string | null
          name_ar: string
          name_en: string | null
          phone: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          is_verified?: boolean
          logo?: string | null
          name_ar: string
          name_en?: string | null
          phone?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          is_verified?: boolean
          logo?: string | null
          name_ar?: string
          name_en?: string | null
          phone?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      page_content: {
        Row: {
          content_ar: string
          content_en: string | null
          id: string
          image: string | null
          metadata: Json | null
          page_key: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content_ar: string
          content_en?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          page_key: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content_ar?: string
          content_en?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          page_key?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address_ar: string
          average_rating: number | null
          category_id: string
          city_id: string
          cover_image: string | null
          created_at: string
          description_ar: string
          description_en: string | null
          id: string
          images: Json | null
          instagram: string | null
          is_active: boolean
          is_featured: boolean
          latitude: number
          longitude: number
          name_ar: string
          name_en: string | null
          opening_hours: Json | null
          phone: string | null
          price_range: string | null
          slug: string | null
          sort_order: number
          tags: Json | null
          total_reviews: number
          updated_at: string
          venue_id: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address_ar: string
          average_rating?: number | null
          category_id: string
          city_id: string
          cover_image?: string | null
          created_at?: string
          description_ar: string
          description_en?: string | null
          id?: string
          images?: Json | null
          instagram?: string | null
          is_active?: boolean
          is_featured?: boolean
          latitude: number
          longitude: number
          name_ar: string
          name_en?: string | null
          opening_hours?: Json | null
          phone?: string | null
          price_range?: string | null
          slug?: string | null
          sort_order?: number
          tags?: Json | null
          total_reviews?: number
          updated_at?: string
          venue_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address_ar?: string
          average_rating?: number | null
          category_id?: string
          city_id?: string
          cover_image?: string | null
          created_at?: string
          description_ar?: string
          description_en?: string | null
          id?: string
          images?: Json | null
          instagram?: string | null
          is_active?: boolean
          is_featured?: boolean
          latitude?: number
          longitude?: number
          name_ar?: string
          name_en?: string | null
          opening_hours?: Json | null
          phone?: string | null
          price_range?: string | null
          slug?: string | null
          sort_order?: number
          tags?: Json | null
          total_reviews?: number
          updated_at?: string
          venue_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          place_id: string
          rating: number
          review_text: string | null
          reviewer_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          place_id: string
          rating: number
          review_text?: string | null
          reviewer_name?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          place_id?: string
          rating?: number
          review_text?: string | null
          reviewer_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          created_at: string
          currency: string
          description_ar: string | null
          event_id: string
          id: string
          is_active: boolean
          max_per_order: number
          name_ar: string
          name_en: string | null
          price: number
          price_new_syp: number | null
          price_old_syp: number | null
          price_usd: number | null
          quantity_sold: number
          quantity_total: number
          sale_end: string | null
          sale_start: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          currency?: string
          description_ar?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          max_per_order?: number
          name_ar: string
          name_en?: string | null
          price?: number
          price_new_syp?: number | null
          price_old_syp?: number | null
          price_usd?: number | null
          quantity_sold?: number
          quantity_total: number
          sale_end?: string | null
          sale_start?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          currency?: string
          description_ar?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          max_per_order?: number
          name_ar?: string
          name_en?: string | null
          price?: number
          price_new_syp?: number | null
          price_old_syp?: number | null
          price_usd?: number | null
          quantity_sold?: number
          quantity_total?: number
          sale_end?: string | null
          sale_start?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          event_id: string
          guest_count: number
          guest_email: string
          guest_name: string
          guest_phone: string
          id: string
          invitation_sent: boolean
          notes: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          qr_code: string | null
          qr_image_url: string | null
          status: string
          ticket_code: string | null
          ticket_type_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id: string
          guest_count?: number
          guest_email: string
          guest_name: string
          guest_phone: string
          id?: string
          invitation_sent?: boolean
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          qr_code?: string | null
          qr_image_url?: string | null
          status?: string
          ticket_code?: string | null
          ticket_type_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id?: string
          guest_count?: number
          guest_email?: string
          guest_name?: string
          guest_phone?: string
          id?: string
          invitation_sent?: boolean
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          qr_code?: string | null
          qr_image_url?: string | null
          status?: string
          ticket_code?: string | null
          ticket_type_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          city_id: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string
          total_events_attended: number
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          city_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone: string
          total_events_attended?: number
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          city_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          total_events_attended?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address_ar: string
          capacity: number | null
          city_id: string
          cover_image: string | null
          created_at: string
          description_ar: string
          description_en: string | null
          id: string
          images: Json | null
          instagram: string | null
          is_active: boolean
          latitude: number
          longitude: number
          name_ar: string
          name_en: string
          phone: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address_ar: string
          capacity?: number | null
          city_id: string
          cover_image?: string | null
          created_at?: string
          description_ar: string
          description_en?: string | null
          id?: string
          images?: Json | null
          instagram?: string | null
          is_active?: boolean
          latitude: number
          longitude: number
          name_ar: string
          name_en: string
          phone?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address_ar?: string
          capacity?: number | null
          city_id?: string
          cover_image?: string | null
          created_at?: string
          description_ar?: string
          description_en?: string | null
          id?: string
          images?: Json | null
          instagram?: string | null
          is_active?: boolean
          latitude?: number
          longitude?: number
          name_ar?: string
          name_en?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_tickets: { Args: { _tickets: Json }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_slug_from_title: { Args: { title: string }; Returns: string }
      get_admin_user_by_auth_id: {
        Args: { _auth_id: string }
        Returns: {
          auth_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          organizer_id: string | null
          phone: string | null
          role: string
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_ticket_by_id: {
        Args: { _ticket_id: string }
        Returns: {
          checked_in_at: string
          created_at: string
          event_id: string
          guest_count: number
          guest_name: string
          guest_phone: string
          id: string
          payment_reference: string
          payment_status: string
          qr_code: string
          status: string
          ticket_code: string
        }[]
      }
      get_tickets_by_guest: {
        Args: { _email?: string; _phone: string }
        Returns: {
          checked_in_at: string
          created_at: string
          event_cover_image: string
          event_id: string
          event_start_date: string
          event_title_ar: string
          guest_count: number
          guest_name: string
          id: string
          qr_code: string
          status: string
          ticket_code: string
          ticket_type_currency: string
          ticket_type_name_ar: string
          ticket_type_price: number
          venue_name_ar: string
        }[]
      }
      get_tickets_for_confirmation: {
        Args: { _ticket_id: string }
        Returns: {
          event_code: string
          event_cover_image: string
          event_end_date: string
          event_id: string
          event_slug: string
          event_start_date: string
          event_title_ar: string
          guest_name: string
          guest_phone: string
          id: string
          payment_reference: string
          payment_status: string
          qr_code: string
          status: string
          ticket_code: string
          venue_address_ar: string
          venue_name_ar: string
        }[]
      }
      increment_ticket_quantity_sold: {
        Args: { _count: number; _ticket_type_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _auth_id: string }; Returns: boolean }
      is_scanner_or_admin: { Args: { _auth_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
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
