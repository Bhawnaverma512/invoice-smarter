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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          business_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_member_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_member_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          default_payment_terms: number
          default_tax_rate: number
          email: string | null
          id: string
          invoice_next_number: number
          invoice_notes: string | null
          invoice_prefix: string
          is_demo: boolean
          logo_url: string | null
          name: string
          owner_id: string
          payment_instructions: string | null
          phone: string | null
          tax_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          default_payment_terms?: number
          default_tax_rate?: number
          email?: string | null
          id?: string
          invoice_next_number?: number
          invoice_notes?: string | null
          invoice_prefix?: string
          is_demo?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          payment_instructions?: string | null
          phone?: string | null
          tax_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          default_payment_terms?: number
          default_tax_rate?: number
          email?: string | null
          id?: string
          invoice_next_number?: number
          invoice_notes?: string | null
          invoice_prefix?: string
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          payment_instructions?: string | null
          phone?: string | null
          tax_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          billing_address: string | null
          business_id: string
          company: string | null
          created_at: string
          currency: string | null
          email: string
          id: string
          internal_notes: string | null
          name: string
          payment_terms: number | null
          phone: string | null
          tax_id: string | null
        }
        Insert: {
          billing_address?: string | null
          business_id: string
          company?: string | null
          created_at?: string
          currency?: string | null
          email: string
          id?: string
          internal_notes?: string | null
          name: string
          payment_terms?: number | null
          phone?: string | null
          tax_id?: string | null
        }
        Update: {
          billing_address?: string | null
          business_id?: string
          company?: string | null
          created_at?: string
          currency?: string | null
          email?: string
          id?: string
          internal_notes?: string | null
          name?: string
          payment_terms?: number | null
          phone?: string | null
          tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          business_id: string
          created_at: string
          enabled: boolean
          id: string
          subject: string
          template_key: string
        }
        Insert: {
          body: string
          business_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          subject: string
          template_key: string
        }
        Update: {
          body?: string
          business_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          subject?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_activities: {
        Row: {
          business_id: string
          content: string
          created_at: string
          id: string
          invoice_id: string
          metadata: Json | null
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string | null
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string
          id?: string
          invoice_id: string
          metadata?: Json | null
          type: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string
          id?: string
          invoice_id?: string
          metadata?: Json | null
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_activities_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_tasks: {
        Row: {
          business_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          invoice_id: string
          status: string
          title: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_id: string
          status?: string
          title: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_tasks_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          position: number
          product_id: string | null
          quantity: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          position?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_id: string
          cancelled_at: string | null
          created_at: string
          currency: string
          customer_id: string
          discount_type: string
          discount_value: number
          dispute_reason: string | null
          due_date: string
          followup_hold_until: string | null
          id: string
          invoice_number: string
          is_disputed: boolean
          issue_date: string
          notes: string | null
          paid_amount: number
          payment_instructions: string | null
          payment_terms: number
          promise_to_pay_date: string | null
          reminder_paused: boolean
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          discount_type?: string
          discount_value?: number
          dispute_reason?: string | null
          due_date: string
          followup_hold_until?: string | null
          id?: string
          invoice_number: string
          is_disputed?: boolean
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          payment_instructions?: string | null
          payment_terms?: number
          promise_to_pay_date?: string | null
          reminder_paused?: boolean
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          discount_type?: string
          discount_value?: number
          dispute_reason?: string | null
          due_date?: string
          followup_hold_until?: string | null
          id?: string
          invoice_number?: string
          is_disputed?: boolean
          issue_date?: string
          notes?: string | null
          paid_amount?: number
          payment_instructions?: string | null
          payment_terms?: number
          promise_to_pay_date?: string | null
          reminder_paused?: boolean
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          payment_date: string
          reference: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tax_rate: number
          unit: string
          unit_price: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tax_rate?: number
          unit?: string
          unit_price?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tax_rate?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reminder_logs: {
        Row: {
          business_id: string
          channel: string
          created_at: string
          delivery_status: string | null
          error_details: string | null
          id: string
          invoice_id: string
          rule_id: string | null
          scheduled_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          template_key: string | null
        }
        Insert: {
          business_id: string
          channel?: string
          created_at?: string
          delivery_status?: string | null
          error_details?: string | null
          id?: string
          invoice_id: string
          rule_id?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          template_key?: string | null
        }
        Update: {
          business_id?: string
          channel?: string
          created_at?: string
          delivery_status?: string | null
          error_details?: string | null
          id?: string
          invoice_id?: string
          rule_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "reminder_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_rules: {
        Row: {
          action: Database["public"]["Enums"]["rule_action"]
          business_id: string
          created_at: string
          enabled: boolean
          id: string
          offset_days: number
          template_key: string | null
          trigger_type: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["rule_action"]
          business_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          offset_days?: number
          template_key?: string | null
          trigger_type: string
        }
        Update: {
          action?: Database["public"]["Enums"]["rule_action"]
          business_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          offset_days?: number
          template_key?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          business_id: string | null
          created_at: string
          error_details: string | null
          event_type: string
          id: string
          payload: Json | null
          processed: boolean
          source: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          error_details?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed?: boolean
          source: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          error_details?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed?: boolean
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: {
        Args: { _business_id: string }
        Returns: string
      }
      is_business_admin: { Args: { _business_id: string }; Returns: boolean }
      is_business_member: { Args: { _business_id: string }; Returns: boolean }
      seed_demo_data: { Args: { _business_id: string }; Returns: undefined }
    }
    Enums: {
      activity_type:
        | "email_sent"
        | "email_demo"
        | "call"
        | "note"
        | "status_change"
        | "promise"
        | "snooze"
        | "pause"
        | "resume"
        | "dispute"
        | "payment"
        | "task"
        | "flag"
      app_member_role: "owner" | "admin" | "member"
      invoice_status: "draft" | "sent" | "partially_paid" | "paid" | "cancelled"
      reminder_status:
        | "scheduled"
        | "sent"
        | "failed"
        | "skipped"
        | "demo"
        | "cancelled"
      rule_action: "send_email" | "create_task" | "flag_review"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      activity_type: [
        "email_sent",
        "email_demo",
        "call",
        "note",
        "status_change",
        "promise",
        "snooze",
        "pause",
        "resume",
        "dispute",
        "payment",
        "task",
        "flag",
      ],
      app_member_role: ["owner", "admin", "member"],
      invoice_status: ["draft", "sent", "partially_paid", "paid", "cancelled"],
      reminder_status: [
        "scheduled",
        "sent",
        "failed",
        "skipped",
        "demo",
        "cancelled",
      ],
      rule_action: ["send_email", "create_task", "flag_review"],
    },
  },
} as const
