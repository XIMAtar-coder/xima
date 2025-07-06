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
      appointments: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          feedback: Json | null
          id: string
          meeting_link: string | null
          mentor_id: string
          notes: Json | null
          price: number | null
          scheduled_at: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          feedback?: Json | null
          id?: string
          meeting_link?: string | null
          mentor_id: string
          notes?: Json | null
          price?: number | null
          scheduled_at: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          feedback?: Json | null
          id?: string
          meeting_link?: string | null
          mentor_id?: string
          notes?: Json | null
          price?: number | null
          scheduled_at?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type: string
          completed_at: string
          created_at: string
          id: string
          overall_score: number | null
          pillar_scores: Json | null
          recommendations: Json | null
          user_id: string
          xima_scores: Json
        }
        Insert: {
          assessment_type: string
          completed_at?: string
          created_at?: string
          id?: string
          overall_score?: number | null
          pillar_scores?: Json | null
          recommendations?: Json | null
          user_id: string
          xima_scores: Json
        }
        Update: {
          assessment_type?: string
          completed_at?: string
          created_at?: string
          id?: string
          overall_score?: number | null
          pillar_scores?: Json | null
          recommendations?: Json | null
          user_id?: string
          xima_scores?: Json
        }
        Relationships: []
      }
      cv_uploads: {
        Row: {
          analysis_results: Json | null
          analysis_status: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          updated_at: string
          user_id: string
          virus_scan_status: string | null
        }
        Insert: {
          analysis_results?: Json | null
          analysis_status?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          updated_at?: string
          user_id: string
          virus_scan_status?: string | null
        }
        Update: {
          analysis_results?: Json | null
          analysis_status?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          updated_at?: string
          user_id?: string
          virus_scan_status?: string | null
        }
        Relationships: []
      }
      mentors: {
        Row: {
          availability: Json | null
          bio: string | null
          company: string | null
          created_at: string
          experience_years: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          profile_image_url: string | null
          rating: number | null
          specialties: string[]
          title: string | null
          total_sessions: number | null
          updated_at: string
          user_id: string | null
          xima_pillars: string[]
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          company?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          profile_image_url?: string | null
          rating?: number | null
          specialties: string[]
          title?: string | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string | null
          xima_pillars: string[]
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          company?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          profile_image_url?: string | null
          rating?: number | null
          specialties?: string[]
          title?: string | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string | null
          xima_pillars?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: Json | null
          created_at: string
          id: string
          mentor: Json | null
          name: string | null
          pillars: Json | null
          profile_complete: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: Json | null
          created_at?: string
          id?: string
          mentor?: Json | null
          name?: string | null
          pillars?: Json | null
          profile_complete?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: Json | null
          created_at?: string
          id?: string
          mentor?: Json | null
          name?: string | null
          pillars?: Json | null
          profile_complete?: boolean | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
