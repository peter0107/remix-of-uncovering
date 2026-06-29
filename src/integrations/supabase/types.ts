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
      admin_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      custom_jobs: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          required_competencies: string[]
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          required_competencies?: string[]
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          required_competencies?: string[]
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mission_requests: {
        Row: {
          category_name: string | null
          created_at: string
          id: string
          job_name: string
          status: string
        }
        Insert: {
          category_name?: string | null
          created_at?: string
          id?: string
          job_name: string
          status?: string
        }
        Update: {
          category_name?: string | null
          created_at?: string
          id?: string
          job_name?: string
          status?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: string | null
          company_name: string | null
          company_size: string | null
          content_mode: string
          created_at: string
          data_points: Json | null
          description: string | null
          difficulty: string
          duration_min: number
          expert_comment_html: string | null
          frequent_tasks: string | null
          id: string
          included_results: string[]
          industries: string[] | null
          industry: string | null
          industry_categories: string[] | null
          is_expert_authored: boolean
          job_category: string | null
          job_slug: string
          locked_preview_text: string | null
          material_blocks: Json
          mission_steps: string[]
          offline_activity_html: string | null
          preview_notice: string | null
          questions: Json | null
          recommended_for: string | null
          reviewed_by: string | null
          sample_answer: string | null
          situation: string | null
          status: string
          submitted_competencies: string[] | null
          summary_description: string | null
          summary_title: string | null
          title: string
          updated_at: string
          verification_file_url: string | null
          wizard_intro_blocks: Json
          wizard_intro_html: string | null
          wizard_steps: Json
          years_experience: number | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          author_role?: string | null
          company_name?: string | null
          company_size?: string | null
          content_mode?: string
          created_at?: string
          data_points?: Json | null
          description?: string | null
          difficulty?: string
          duration_min?: number
          expert_comment_html?: string | null
          frequent_tasks?: string | null
          id?: string
          included_results?: string[]
          industries?: string[] | null
          industry?: string | null
          industry_categories?: string[] | null
          is_expert_authored?: boolean
          job_category?: string | null
          job_slug: string
          locked_preview_text?: string | null
          material_blocks?: Json
          mission_steps?: string[]
          offline_activity_html?: string | null
          preview_notice?: string | null
          questions?: Json | null
          recommended_for?: string | null
          reviewed_by?: string | null
          sample_answer?: string | null
          situation?: string | null
          status?: string
          submitted_competencies?: string[] | null
          summary_description?: string | null
          summary_title?: string | null
          title: string
          updated_at?: string
          verification_file_url?: string | null
          wizard_intro_blocks?: Json
          wizard_intro_html?: string | null
          wizard_steps?: Json
          years_experience?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: string | null
          company_name?: string | null
          company_size?: string | null
          content_mode?: string
          created_at?: string
          data_points?: Json | null
          description?: string | null
          difficulty?: string
          duration_min?: number
          expert_comment_html?: string | null
          frequent_tasks?: string | null
          id?: string
          included_results?: string[]
          industries?: string[] | null
          industry?: string | null
          industry_categories?: string[] | null
          is_expert_authored?: boolean
          job_category?: string | null
          job_slug?: string
          locked_preview_text?: string | null
          material_blocks?: Json
          mission_steps?: string[]
          offline_activity_html?: string | null
          preview_notice?: string | null
          questions?: Json | null
          recommended_for?: string | null
          reviewed_by?: string | null
          sample_answer?: string | null
          situation?: string | null
          status?: string
          submitted_competencies?: string[] | null
          summary_description?: string | null
          summary_title?: string | null
          title?: string
          updated_at?: string
          verification_file_url?: string | null
          wizard_intro_blocks?: Json
          wizard_intro_html?: string | null
          wizard_steps?: Json
          years_experience?: number | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          answers: Json | null
          competency_scores: Json
          created_at: string
          email: string
          expert_comment: string | null
          feedback_requested: boolean
          fit_narrative: string | null
          fit_points: string[]
          id: string
          improvements: string[]
          job_slug: string
          mission_id: string | null
          mission_intro: string | null
          next_actions: string[]
          product_id: string
          share_verification_image_name: string | null
          share_verification_image_path: string | null
          share_verification_rejection_note: string | null
          share_verification_reviewed_at: string | null
          share_verification_status: string
          share_verification_submitted_at: string | null
          status: string
          strengths: string[]
          submitted_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          competency_scores?: Json
          created_at?: string
          email?: string
          expert_comment?: string | null
          feedback_requested?: boolean
          fit_narrative?: string | null
          fit_points?: string[]
          id: string
          improvements?: string[]
          job_slug: string
          mission_id?: string | null
          mission_intro?: string | null
          next_actions?: string[]
          product_id: string
          share_verification_image_name?: string | null
          share_verification_image_path?: string | null
          share_verification_rejection_note?: string | null
          share_verification_reviewed_at?: string | null
          share_verification_status?: string
          share_verification_submitted_at?: string | null
          status?: string
          strengths?: string[]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          competency_scores?: Json
          created_at?: string
          email?: string
          expert_comment?: string | null
          feedback_requested?: boolean
          fit_narrative?: string | null
          fit_points?: string[]
          id?: string
          improvements?: string[]
          job_slug?: string
          mission_id?: string | null
          mission_intro?: string | null
          next_actions?: string[]
          product_id?: string
          share_verification_image_name?: string | null
          share_verification_image_path?: string | null
          share_verification_rejection_note?: string | null
          share_verification_reviewed_at?: string | null
          share_verification_status?: string
          share_verification_submitted_at?: string | null
          status?: string
          strengths?: string[]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nickname: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nickname?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nickname?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "expert" | "user"
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
      app_role: ["admin", "expert", "user"],
    },
  },
} as const
