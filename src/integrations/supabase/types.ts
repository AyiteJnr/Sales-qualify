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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      call_records: {
        Row: {
          admin_notes: string | null
          answers: Json | null
          audio_url: string | null
          call_timestamp: string | null
          client_id: string | null
          comments: string | null
          created_at: string | null
          id: string
          next_action: string | null
          qualification_status:
            | Database["public"]["Enums"]["qualification_status"]
            | null
          rep_id: string | null
          score: number | null
          tags: string[] | null
          transcript_text: string | null
          transcript_url: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          answers?: Json | null
          audio_url?: string | null
          call_timestamp?: string | null
          client_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          next_action?: string | null
          qualification_status?:
            | Database["public"]["Enums"]["qualification_status"]
            | null
          rep_id?: string | null
          score?: number | null
          tags?: string[] | null
          transcript_text?: string | null
          transcript_url?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          answers?: Json | null
          audio_url?: string | null
          call_timestamp?: string | null
          client_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          next_action?: string | null
          qualification_status?:
            | Database["public"]["Enums"]["qualification_status"]
            | null
          rep_id?: string | null
          score?: number | null
          tags?: string[] | null
          transcript_text?: string | null
          transcript_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_records_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_rep_id: string | null
          client_id: string
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          location: string | null
          notes: string | null
          phone: string | null
          scheduled_time: string | null
          source: string | null
          status: Database["public"]["Enums"]["call_status"] | null
          updated_at: string | null
        }
        Insert: {
          assigned_rep_id?: string | null
          client_id: string
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          location?: string | null
          notes?: string | null
          phone?: string | null
          scheduled_time?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["call_status"] | null
          updated_at?: string | null
        }
        Update: {
          assigned_rep_id?: string | null
          client_id?: string
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          location?: string | null
          notes?: string | null
          phone?: string | null
          scheduled_time?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["call_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_rep_id_fkey"
            columns: ["assigned_rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          objections: Json | null
          order_index: number
          scoring_weight: number | null
          script_text: string | null
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          objections?: Json | null
          order_index: number
          scoring_weight?: number | null
          script_text?: string | null
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          objections?: Json | null
          order_index?: number
          scoring_weight?: number | null
          script_text?: string | null
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      call_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      qualification_status: "hot" | "warm" | "cold"
      user_role: "admin" | "rep"
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
      call_status: ["scheduled", "in_progress", "completed", "cancelled"],
      qualification_status: ["hot", "warm", "cold"],
      user_role: ["admin", "rep"],
    },
  },
} as const
