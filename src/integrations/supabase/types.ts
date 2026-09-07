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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_api_keys: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          scopes: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          scopes?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          scopes?: Json
        }
        Relationships: []
      }
      ad_click_earnings: {
        Row: {
          ad_slot: string | null
          amount: number
          created_at: string
          id: string
          page_path: string | null
          user_id: string
        }
        Insert: {
          ad_slot?: string | null
          amount: number
          created_at?: string
          id?: string
          page_path?: string | null
          user_id: string
        }
        Update: {
          ad_slot?: string | null
          amount?: number
          created_at?: string
          id?: string
          page_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_events: {
        Row: {
          ad_id: string
          created_at: string
          event_type: string
          id: string
          origin: string | null
          page_path: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          event_type: string
          id?: string
          origin?: string | null
          page_path?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          event_type?: string
          id?: string
          origin?: string | null
          page_path?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "user_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          keywords: string[]
          label: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[]
          label: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[]
          label?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      amazon_products: {
        Row: {
          active: boolean
          asin: string
          category: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          marketplace: string
          price: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          asin: string
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          marketplace?: string
          price?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          asin?: string
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          marketplace?: string
          price?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      autoblog_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          schedule_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          schedule_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autoblog_categories_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "autoblog_schedule"
            referencedColumns: ["id"]
          },
        ]
      }
      autoblog_schedule: {
        Row: {
          auto_approve: boolean
          category_id: string | null
          created_at: string
          enabled: boolean
          id: string
          interval_hours: number
          keywords: string | null
          last_run_at: string | null
          mode: string
          posts_per_run: number
          updated_at: string
        }
        Insert: {
          auto_approve?: boolean
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          interval_hours?: number
          keywords?: string | null
          last_run_at?: string | null
          mode?: string
          posts_per_run?: number
          updated_at?: string
        }
        Update: {
          auto_approve?: boolean
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          interval_hours?: number
          keywords?: string | null
          last_run_at?: string | null
          mode?: string
          posts_per_run?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autoblog_schedule_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          is_featured: boolean
          published: boolean
          published_at: string | null
          push_notified: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean
          published?: boolean
          published_at?: string | null
          push_notified?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_featured?: boolean
          published?: boolean
          published_at?: string | null
          push_notified?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_boosts: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          duration_days: number
          ends_at: string
          id: string
          package_key: string
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          duration_days: number
          ends_at: string
          id?: string
          package_key: string
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          duration_days?: number
          ends_at?: string
          id?: string
          package_key?: string
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_boosts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_events: {
        Row: {
          business_id: string
          created_at: string
          id: string
          referrer: string | null
          type: string
          visitor_hash: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          referrer?: string | null
          type: string
          visitor_hash?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          referrer?: string | null
          type?: string
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_messages: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_email: string | null
          sender_name: string
          sender_phone: string | null
          sender_user_id: string | null
          service_title: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_email?: string | null
          sender_name: string
          sender_phone?: string | null
          sender_user_id?: string | null
          service_title?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_email?: string | null
          sender_name?: string
          sender_phone?: string | null
          sender_user_id?: string | null
          service_title?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_conversations: {
        Row: {
          business_context: Json
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_context?: Json
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_context?: Json
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_tasks: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          notes: string | null
          progress: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          progress?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          progress?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read: boolean
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read?: boolean
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean
          subject?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          amount_paid: number
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          duration_minutes: number | null
          id: string
          instructor_name: string | null
          price_naira: number
          published: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          instructor_name?: string | null
          price_naira?: number
          published?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          instructor_name?: string | null
          price_naira?: number
          published?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      custom_code_injections: {
        Row: {
          active: boolean
          code: string
          created_at: string
          display_order: number
          id: string
          location: string
          name: string
          route_pattern: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          location?: string
          name: string
          route_pattern?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          location?: string
          name?: string
          route_pattern?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_reward_claims: {
        Row: {
          amount: number
          claim_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          claim_date?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          claim_date?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      directory_products: {
        Row: {
          active: boolean | null
          category_id: string | null
          condition: string | null
          cover_image: string | null
          created_at: string
          currency: string | null
          delivery_file_path: string | null
          delivery_method: string | null
          delivery_url: string | null
          description: string | null
          downloads_count: number
          featured: boolean | null
          id: string
          images: Json | null
          location: string | null
          name: string
          phone: string | null
          price: number | null
          product_type: string
          revenue: number
          sales_count: number
          slug: string | null
          status: string
          stock: number | null
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          condition?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string | null
          delivery_file_path?: string | null
          delivery_method?: string | null
          delivery_url?: string | null
          description?: string | null
          downloads_count?: number
          featured?: boolean | null
          id?: string
          images?: Json | null
          location?: string | null
          name: string
          phone?: string | null
          price?: number | null
          product_type?: string
          revenue?: number
          sales_count?: number
          slug?: string | null
          status?: string
          stock?: number | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          views_count?: number | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          condition?: string | null
          cover_image?: string | null
          created_at?: string
          currency?: string | null
          delivery_file_path?: string | null
          delivery_method?: string | null
          delivery_url?: string | null
          description?: string | null
          downloads_count?: number
          featured?: boolean | null
          id?: string
          images?: Json | null
          location?: string | null
          name?: string
          phone?: string | null
          price?: number | null
          product_type?: string
          revenue?: number
          sales_count?: number
          slug?: string | null
          status?: string
          stock?: number | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          views_count?: number | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directory_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          active: boolean
          email: string
          id: string
          subscribed_at: string
          unsubscribe_token: string
        }
        Insert: {
          active?: boolean
          email: string
          id?: string
          subscribed_at?: string
          unsubscribe_token?: string
        }
        Update: {
          active?: boolean
          email?: string
          id?: string
          subscribed_at?: string
          unsubscribe_token?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          kind: string
          likes_count: number
          replies_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          kind: string
          likes_count?: number
          replies_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          likes_count?: number
          replies_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_votes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      guest_blog_submissions: {
        Row: {
          admin_notes: string | null
          banner_url: string | null
          business_name: string
          category_id: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          cost_credits: number
          created_at: string
          description: string
          generated_post_id: string | null
          id: string
          photos: string[] | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          banner_url?: string | null
          business_name: string
          category_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          cost_credits?: number
          created_at?: string
          description: string
          generated_post_id?: string | null
          id?: string
          photos?: string[] | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          banner_url?: string | null
          business_name?: string
          category_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          cost_credits?: number
          created_at?: string
          description?: string
          generated_post_id?: string | null
          id?: string
          photos?: string[] | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      guest_submission_photos: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          submission_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          submission_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_submission_photos_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "guest_blog_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          image_url: string
          link_text: string | null
          link_url: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          link_text?: string | null
          link_url?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          link_text?: string | null
          link_url?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      inventory_expenses: {
        Row: {
          amount: number
          category: string | null
          id: string
          note: string | null
          spent_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          id?: string
          note?: string | null
          spent_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          id?: string
          note?: string | null
          spent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_products: {
        Row: {
          cost_price: number
          created_at: string
          id: string
          low_stock_threshold: number
          name: string
          sell_price: number
          sku: string | null
          stock: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_price?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name: string
          sell_price?: number
          sku?: string | null
          stock?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_price?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name?: string
          sell_price?: number
          sku?: string | null
          stock?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_sales: {
        Row: {
          customer_id: string | null
          id: string
          note: string | null
          product_id: string | null
          qty: number
          sold_at: string
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          customer_id?: string | null
          id?: string
          note?: string | null
          product_id?: string | null
          qty?: number
          sold_at?: string
          total?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          customer_id?: string | null
          id?: string
          note?: string | null
          product_id?: string | null
          qty?: number
          sold_at?: string
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "inventory_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_purchases: {
        Row: {
          amount: number
          buyer_email: string
          buyer_id: string | null
          buyer_name: string | null
          created_at: string
          currency: string
          downloads: number
          id: string
          paid_at: string | null
          product_id: string
          provider: string
          reference: string
          seller_id: string
          status: string
        }
        Insert: {
          amount?: number
          buyer_email: string
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string
          currency?: string
          downloads?: number
          id?: string
          paid_at?: string | null
          product_id: string
          provider?: string
          reference: string
          seller_id: string
          status?: string
        }
        Update: {
          amount?: number
          buyer_email?: string
          buyer_id?: string | null
          buyer_name?: string | null
          created_at?: string
          currency?: string
          downloads?: number
          id?: string
          paid_at?: string | null
          product_id?: string
          provider?: string
          reference?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "directory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          background_template: string | null
          background_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_public: boolean
          onesignal_player_id: string | null
          referral_code: string | null
          referred_by: string | null
          services: Json
          social_links: Json | null
          updated_at: string
          user_id: string
          username: string | null
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          background_template?: string | null
          background_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_public?: boolean
          onesignal_player_id?: string | null
          referral_code?: string | null
          referred_by?: string | null
          services?: Json
          social_links?: Json | null
          updated_at?: string
          user_id: string
          username?: string | null
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          background_template?: string | null
          background_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_public?: boolean
          onesignal_player_id?: string | null
          referral_code?: string | null
          referred_by?: string | null
          services?: Json
          social_links?: Json | null
          updated_at?: string
          user_id?: string
          username?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      promoter_profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_verified: boolean
          niche: string[] | null
          phone_whatsapp: string
          rating: number
          status: string
          total_completed_orders: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_verified?: boolean
          niche?: string[] | null
          phone_whatsapp: string
          rating?: number
          status?: string
          total_completed_orders?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_verified?: boolean
          niche?: string[] | null
          phone_whatsapp?: string
          rating?: number
          status?: string
          total_completed_orders?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_communities: {
        Row: {
          active_daily_views: number
          category_id: string | null
          community_type: string
          country_primary: string
          created_at: string
          demographics_summary: string | null
          id: string
          is_published: boolean
          member_count: number
          name: string
          proof_screenshot_url: string
          promoter_id: string
          rejection_reason: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          active_daily_views?: number
          category_id?: string | null
          community_type: string
          country_primary?: string
          created_at?: string
          demographics_summary?: string | null
          id?: string
          is_published?: boolean
          member_count: number
          name: string
          proof_screenshot_url: string
          promoter_id: string
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          active_daily_views?: number
          category_id?: string | null
          community_type?: string
          country_primary?: string
          created_at?: string
          demographics_summary?: string | null
          id?: string
          is_published?: boolean
          member_count?: number
          name?: string
          proof_screenshot_url?: string
          promoter_id?: string
          rejection_reason?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_communities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_communities_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoter_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      community_verifications: {
        Row: {
          action: string
          admin_id: string
          community_id: string
          created_at: string
          id: string
          verification_notes: string | null
        }
        Insert: {
          action: string
          admin_id: string
          community_id: string
          created_at?: string
          id?: string
          verification_notes?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          community_id?: string
          created_at?: string
          id?: string
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_verifications_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_communities"
            referencedColumns: ["id"]
          }
        ]
      }
      push_notifications: {
        Row: {
          body: string
          id: string
          recipient_count: number | null
          sent_at: string
          sent_by: string | null
          title: string
          url: string | null
        }
        Insert: {
          body: string
          id?: string
          recipient_count?: number | null
          sent_at?: string
          sent_by?: string | null
          title: string
          url?: string | null
        }
        Update: {
          body?: string
          id?: string
          recipient_count?: number | null
          sent_at?: string
          sent_by?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          purchase_bonus_total: number
          purchase_credited: boolean
          referred_user_id: string
          referrer_id: string
          signup_bonus_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          purchase_bonus_total?: number
          purchase_credited?: boolean
          referred_user_id: string
          referrer_id: string
          signup_bonus_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          purchase_bonus_total?: number
          purchase_credited?: boolean
          referred_user_id?: string
          referrer_id?: string
          signup_bonus_amount?: number
        }
        Relationships: []
      }
      sales_page_events: {
        Row: {
          created_at: string
          device: string | null
          id: string
          referrer: string | null
          sales_page_id: string
          source: string | null
          type: string
          visitor_hash: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          referrer?: string | null
          sales_page_id: string
          source?: string | null
          type: string
          visitor_hash?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          referrer?: string | null
          sales_page_id?: string
          source?: string | null
          type?: string
          visitor_hash?: string | null
        }
        Relationships: []
      }
      sales_page_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string
          sales_page_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
          sales_page_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
          sales_page_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_page_templates: {
        Row: {
          accent_color: string | null
          created_at: string
          description: string | null
          display_order: number
          enabled: boolean
          id: string
          is_default: boolean
          is_premium: boolean
          key: string
          name: string
          premium_price: number
          preview_thumbnail: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          is_default?: boolean
          is_premium?: boolean
          key: string
          name: string
          premium_price?: number
          preview_thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          is_default?: boolean
          is_premium?: boolean
          key?: string
          name?: string
          premium_price?: number
          preview_thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sales_pages: {
        Row: {
          active: boolean
          benefits: Json
          business_id: string | null
          clicks_count: number
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          countdown_ends_at: string | null
          created_at: string
          cta_text: string | null
          currency: string
          gallery_image_urls: Json
          headline: string | null
          id: string
          image_source: string | null
          lead_capture_enabled: boolean
          og_image_url: string | null
          price: number
          problem: string | null
          product_description: string | null
          product_image_url: string | null
          product_name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          social_proof: Json
          solution: string | null
          status: string
          subheadline: string | null
          template_key: string
          updated_at: string
          urgency: string | null
          user_id: string
          views_count: number
          youtube_video_url: string | null
        }
        Insert: {
          active?: boolean
          benefits?: Json
          business_id?: string | null
          clicks_count?: number
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          countdown_ends_at?: string | null
          created_at?: string
          cta_text?: string | null
          currency?: string
          gallery_image_urls?: Json
          headline?: string | null
          id?: string
          image_source?: string | null
          lead_capture_enabled?: boolean
          og_image_url?: string | null
          price?: number
          problem?: string | null
          product_description?: string | null
          product_image_url?: string | null
          product_name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          social_proof?: Json
          solution?: string | null
          status?: string
          subheadline?: string | null
          template_key?: string
          updated_at?: string
          urgency?: string | null
          user_id: string
          views_count?: number
          youtube_video_url?: string | null
        }
        Update: {
          active?: boolean
          benefits?: Json
          business_id?: string | null
          clicks_count?: number
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          countdown_ends_at?: string | null
          created_at?: string
          cta_text?: string | null
          currency?: string
          gallery_image_urls?: Json
          headline?: string | null
          id?: string
          image_source?: string | null
          lead_capture_enabled?: boolean
          og_image_url?: string | null
          price?: number
          problem?: string | null
          product_description?: string | null
          product_image_url?: string | null
          product_name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          social_proof?: Json
          solution?: string | null
          status?: string
          subheadline?: string | null
          template_key?: string
          updated_at?: string
          urgency?: string | null
          user_id?: string
          views_count?: number
          youtube_video_url?: string | null
        }
        Relationships: []
      }
      seller_payment_accounts: {
        Row: {
          business_name: string | null
          created_at: string
          id: string
          last_verified_at: string | null
          merchant_id: string | null
          provider: string
          public_key: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          merchant_id?: string | null
          provider?: string
          public_key?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          merchant_id?: string | null
          provider?: string
          public_key?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_payment_secrets: {
        Row: {
          created_at: string
          secret_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          secret_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          secret_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_jingles: {
        Row: {
          active: boolean
          audio_url: string
          created_at: string
          id: string
          title: string
          updated_at: string
          volume: number
        }
        Insert: {
          active?: boolean
          audio_url: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          volume?: number
        }
        Update: {
          active?: boolean
          audio_url?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          volume?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      supplier_images: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          supplier_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          supplier_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_images_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          boost_warning_sent: boolean
          boosted_until: string | null
          category_id: string | null
          cover_template: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          rejection_reason: string | null
          services: Json
          slug: string
          social_links: Json | null
          status: string
          submitted_by: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          boost_warning_sent?: boolean
          boosted_until?: string | null
          category_id?: string | null
          cover_template?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          rejection_reason?: string | null
          services?: Json
          slug: string
          social_links?: Json | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          boost_warning_sent?: boolean
          boosted_until?: string | null
          category_id?: string | null
          cover_template?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          rejection_reason?: string | null
          services?: Json
          slug?: string
          social_links?: Json | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_videos: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          placement: string
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          placement?: string
          title: string
          updated_at?: string
          youtube_url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          placement?: string
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: []
      }
      user_ads: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          clicks: number
          cost_amount: number
          created_at: string
          description: string | null
          duration_days: number
          ends_at: string | null
          external_origin: string | null
          ggd_ad_id: string | null
          ggd_response: Json | null
          id: string
          image_url: string
          impressions: number
          placement: string
          rejection_reason: string | null
          source: string
          starts_at: string | null
          status: string
          target_url: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          clicks?: number
          cost_amount: number
          created_at?: string
          description?: string | null
          duration_days: number
          ends_at?: string | null
          external_origin?: string | null
          ggd_ad_id?: string | null
          ggd_response?: Json | null
          id?: string
          image_url: string
          impressions?: number
          placement?: string
          rejection_reason?: string | null
          source?: string
          starts_at?: string | null
          status?: string
          target_url: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          clicks?: number
          cost_amount?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          ends_at?: string | null
          external_origin?: string | null
          ggd_ad_id?: string | null
          ggd_response?: Json | null
          id?: string
          image_url?: string
          impressions?: number
          placement?: string
          rejection_reason?: string | null
          source?: string
          starts_at?: string | null
          status?: string
          target_url?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          type?: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_business_boost: {
        Args: {
          _amount: number
          _business_id: string
          _duration_days: number
          _package_key: string
        }
        Returns: Json
      }
      admin_adjust_wallet: {
        Args: { _amount: number; _description: string; _user_id: string }
        Returns: boolean
      }
      approve_user_ad: { Args: { _ad_id: string }; Returns: boolean }
      broadcast_notification: {
        Args: { _body: string; _title: string; _url: string }
        Returns: number
      }
      claim_daily_reward: { Args: { _user_id: string }; Returns: Json }
      create_sales_page: { Args: { _payload: Json }; Returns: Json }
      credit_ad_click: {
        Args: { _ad_slot?: string; _page_path?: string }
        Returns: Json
      }
      credit_referral_purchase: {
        Args: { _amount: number; _user_id: string }
        Returns: Json
      }
      deduct_wallet: {
        Args: {
          _amount: number
          _description: string
          _reference_id?: string
          _user_id: string
        }
        Returns: boolean
      }
      enroll_in_course: { Args: { _course_id: string }; Returns: Json }
      expire_business_boosts: { Args: never; Returns: undefined }
      generate_username:
        | { Args: { _email: string }; Returns: string }
        | { Args: { _display_name?: string; _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_feature_enabled: { Args: { _key: string }; Returns: boolean }
      lookup_user_by_email: {
        Args: { _email: string }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          user_id: string
          username: string
        }[]
      }
      record_ad_click: { Args: { _ad_id: string }; Returns: string }
      reject_user_ad: {
        Args: { _ad_id: string; _reason: string }
        Returns: boolean
      }
      send_push_to_user_via_onesignal: {
        Args: { _body: string; _title: string; _url: string; _user_id: string }
        Returns: undefined
      }
      send_push_via_onesignal: {
        Args: { _body: string; _title: string; _url: string }
        Returns: undefined
      }
      serve_random_ad: {
        Args: { _placement?: string }
        Returns: {
          description: string
          id: string
          image_url: string
          target_url: string
          title: string
        }[]
      }
      topup_wallet: {
        Args: { _amount: number; _description: string; _user_id: string }
        Returns: boolean
      }
      transfer_wallet: {
        Args: { _amount: number; _note?: string; _recipient_email: string }
        Returns: Json
      }
      verify_ad_api_key: {
        Args: { _key: string }
        Returns: {
          id: string
          scopes: Json
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
