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
      ai_prompt_settings: {
        Row: {
          key: string
          prompt: string
          updated_at: string
        }
        Insert: {
          key: string
          prompt: string
          updated_at?: string
        }
        Update: {
          key?: string
          prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      applicants: {
        Row: {
          company_id: string
          created_at: string
          duration: string
          education: string
          email: string
          experience: string
          headline: string
          id: string
          location: string
          name: string
          phone: string
          portfolio: Json
          recent_job: string
          resume_url: string
          role: string
          simulation: Json
          skills: string[]
          status: Database["public"]["Enums"]["applicant_status"]
          submitted_at: string
          tools: string[]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          duration: string
          education: string
          email: string
          experience: string
          headline: string
          id?: string
          location: string
          name: string
          phone: string
          portfolio?: Json
          recent_job: string
          resume_url?: string
          role: string
          simulation?: Json
          skills?: string[]
          status?: Database["public"]["Enums"]["applicant_status"]
          submitted_at?: string
          tools?: string[]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          duration?: string
          education?: string
          email?: string
          experience?: string
          headline?: string
          id?: string
          location?: string
          name?: string
          phone?: string
          portfolio?: Json
          recent_job?: string
          resume_url?: string
          role?: string
          simulation?: Json
          skills?: string[]
          status?: Database["public"]["Enums"]["applicant_status"]
          submitted_at?: string
          tools?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_chat_bookings: {
        Row: {
          company_name: string
          created_at: string
          email: string
          hiring_concern: string | null
          id: string
          name: string
          phone: string
          privacy_consent: boolean
          slot_date: string
          slot_time: string
        }
        Insert: {
          company_name: string
          created_at?: string
          email: string
          hiring_concern?: string | null
          id?: string
          name: string
          phone: string
          privacy_consent?: boolean
          slot_date: string
          slot_time: string
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          hiring_concern?: string | null
          id?: string
          name?: string
          phone?: string
          privacy_consent?: boolean
          slot_date?: string
          slot_time?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          code: string | null
          created_at: string | null
          description: string
          id: string
          logo_url: string | null
          name: string
          role_label: string | null
          unique_code: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string
          id?: string
          logo_url?: string | null
          name: string
          role_label?: string | null
          unique_code: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string
          id?: string
          logo_url?: string | null
          name?: string
          role_label?: string | null
          unique_code?: string
        }
        Relationships: []
      }
      company_applicant_ai_reviews: {
        Row: {
          analysis: Json
          applicant_id: string
          company_id: string
          created_at: string
          id: string
          job_posting_id: string
          updated_at: string
        }
        Insert: {
          analysis: Json
          applicant_id: string
          company_id: string
          created_at?: string
          id?: string
          job_posting_id: string
          updated_at?: string
        }
        Update: {
          analysis?: Json
          applicant_id?: string
          company_id?: string
          created_at?: string
          id?: string
          job_posting_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_applicant_ai_reviews_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "company_visible_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_applicant_ai_reviews_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_applicant_ai_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_applicant_ai_reviews_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "company_job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      company_applicant_review_states: {
        Row: {
          applicant_id: string
          company_id: string
          created_at: string
          decision_status: string
          id: string
          mail_sent_at: string | null
          read_at: string | null
          review_stage: string
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          company_id: string
          created_at?: string
          decision_status?: string
          id?: string
          mail_sent_at?: string | null
          read_at?: string | null
          review_stage?: string
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          company_id?: string
          created_at?: string
          decision_status?: string
          id?: string
          mail_sent_at?: string | null
          read_at?: string | null
          review_stage?: string
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_applicant_review_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_applicant_review_states_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "company_visible_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_applicant_review_states_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      company_job_postings: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          role_label: string
          source_url: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          role_label: string
          source_url: string
          title?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          role_label?: string
          source_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_job_postings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_saved_applicants: {
        Row: {
          applicant_id: string | null
          company_id: string
          created_at: string
          id: string
          submission_id: string | null
        }
        Insert: {
          applicant_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          submission_id?: string | null
        }
        Update: {
          applicant_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_saved_applicants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_saved_applicants_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "company_visible_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_saved_applicants_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      company_simulation_ai_reviews: {
        Row: {
          analysis: Json
          applicant_id: string
          company_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          analysis: Json
          applicant_id: string
          company_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          analysis?: Json
          applicant_id?: string
          company_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_simulation_ai_reviews_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "company_visible_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_simulation_ai_reviews_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_simulation_ai_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_seekers: {
        Row: {
          academic_mark: number | null
          avatar_url: string | null
          company_interests: string[] | null
          created_at: string | null
          discovery_consent: boolean | null
          display_name: string | null
          education_level: string | null
          email: string
          employment_types: string[] | null
          external_links: Json | null
          id: string
          job_interests: string[] | null
          majors: string[] | null
          one_line_intro: string | null
          university_name: string | null
          willing_to_relocate: boolean | null
          work_regions: string[] | null
        }
        Insert: {
          academic_mark?: number | null
          avatar_url?: string | null
          company_interests?: string[] | null
          created_at?: string | null
          discovery_consent?: boolean | null
          display_name?: string | null
          education_level?: string | null
          email: string
          employment_types?: string[] | null
          external_links?: Json | null
          id?: string
          job_interests?: string[] | null
          majors?: string[] | null
          one_line_intro?: string | null
          university_name?: string | null
          willing_to_relocate?: boolean | null
          work_regions?: string[] | null
        }
        Update: {
          academic_mark?: number | null
          avatar_url?: string | null
          company_interests?: string[] | null
          created_at?: string | null
          discovery_consent?: boolean | null
          display_name?: string | null
          education_level?: string | null
          email?: string
          employment_types?: string[] | null
          external_links?: Json | null
          id?: string
          job_interests?: string[] | null
          majors?: string[] | null
          one_line_intro?: string | null
          university_name?: string | null
          willing_to_relocate?: boolean | null
          work_regions?: string[] | null
        }
        Relationships: []
      }
      job_simulations: {
        Row: {
          card_background_color: string
          card_image_url: string | null
          card_text_color: string
          company_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          domain: string | null
          estimated_minutes: number | null
          expert_ai_feedback: string | null
          expert_company_type: string | null
          expert_experience_band: string | null
          expert_job_title: string | null
          expert_model_answer: string | null
          expert_nickname: string | null
          id: string
          is_public: boolean
          job_family: string | null
          role_label: string | null
          selection_mode: string
          shared_materials: string
          shared_situation: string
          simulation_format: string
          simulation_source: string
          single_answer_question: string | null
          steps: Json | null
          task_prompt: string | null
          title: string
        }
        Insert: {
          card_background_color?: string
          card_image_url?: string | null
          card_text_color?: string
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          domain?: string | null
          estimated_minutes?: number | null
          expert_ai_feedback?: string | null
          expert_company_type?: string | null
          expert_experience_band?: string | null
          expert_job_title?: string | null
          expert_model_answer?: string | null
          expert_nickname?: string | null
          id?: string
          is_public?: boolean
          job_family?: string | null
          role_label?: string | null
          selection_mode?: string
          shared_materials?: string
          shared_situation?: string
          simulation_format?: string
          simulation_source?: string
          single_answer_question?: string | null
          steps?: Json | null
          task_prompt?: string | null
          title: string
        }
        Update: {
          card_background_color?: string
          card_image_url?: string | null
          card_text_color?: string
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          domain?: string | null
          estimated_minutes?: number | null
          expert_ai_feedback?: string | null
          expert_company_type?: string | null
          expert_experience_band?: string | null
          expert_job_title?: string | null
          expert_model_answer?: string | null
          expert_nickname?: string | null
          id?: string
          is_public?: boolean
          job_family?: string | null
          role_label?: string | null
          selection_mode?: string
          shared_materials?: string
          shared_situation?: string
          simulation_format?: string
          simulation_source?: string
          single_answer_question?: string | null
          steps?: Json | null
          task_prompt?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_simulations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          basics: Json
          created_at: string
          educations: Json
          experiences: Json
          id: string
          is_default: boolean
          job_conditions: Json
          memo: string | null
          portfolios: Json
          skills: string[]
          source_type: string
          target_role: string | null
          title: string
          tools: string[]
          updated_at: string
          uploaded_file_name: string | null
          uploaded_file_path: string | null
          uploaded_file_size: number | null
          uploaded_file_type: string | null
          user_id: string
        }
        Insert: {
          basics?: Json
          created_at?: string
          educations?: Json
          experiences?: Json
          id?: string
          is_default?: boolean
          job_conditions?: Json
          memo?: string | null
          portfolios?: Json
          skills?: string[]
          source_type?: string
          target_role?: string | null
          title?: string
          tools?: string[]
          updated_at?: string
          uploaded_file_name?: string | null
          uploaded_file_path?: string | null
          uploaded_file_size?: number | null
          uploaded_file_type?: string | null
          user_id: string
        }
        Update: {
          basics?: Json
          created_at?: string
          educations?: Json
          experiences?: Json
          id?: string
          is_default?: boolean
          job_conditions?: Json
          memo?: string | null
          portfolios?: Json
          skills?: string[]
          source_type?: string
          target_role?: string | null
          title?: string
          tools?: string[]
          updated_at?: string
          uploaded_file_name?: string | null
          uploaded_file_path?: string | null
          uploaded_file_size?: number | null
          uploaded_file_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "job_seekers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_applications: {
        Row: {
          company_name: string
          contact_name: string
          contact_title: string | null
          created_at: string
          developer_count: string | null
          email: string
          id: string
          phone: string
          privacy_consent: boolean
          service_link: string | null
          total_employees: string | null
          wants_intro_meeting: boolean
        }
        Insert: {
          company_name: string
          contact_name: string
          contact_title?: string | null
          created_at?: string
          developer_count?: string | null
          email: string
          id?: string
          phone: string
          privacy_consent?: boolean
          service_link?: string | null
          total_employees?: string | null
          wants_intro_meeting?: boolean
        }
        Update: {
          company_name?: string
          contact_name?: string
          contact_title?: string | null
          created_at?: string
          developer_count?: string | null
          email?: string
          id?: string
          phone?: string
          privacy_consent?: boolean
          service_link?: string | null
          total_employees?: string | null
          wants_intro_meeting?: boolean
        }
        Relationships: []
      }
      submissions: {
        Row: {
          ai_chat_log: Json
          answer_transmission_consent: boolean | null
          created_at: string | null
          duration_sec: number | null
          id: string
          job_seeker_id: string
          job_simulation_id: string
          paste_detected: boolean | null
          response_json: Json | null
          response_text: string | null
          score_json: Json | null
          started_at: string | null
          submitted_at: string | null
        }
        Insert: {
          ai_chat_log?: Json
          answer_transmission_consent?: boolean | null
          created_at?: string | null
          duration_sec?: number | null
          id?: string
          job_seeker_id: string
          job_simulation_id: string
          paste_detected?: boolean | null
          response_json?: Json | null
          response_text?: string | null
          score_json?: Json | null
          started_at?: string | null
          submitted_at?: string | null
        }
        Update: {
          ai_chat_log?: Json
          answer_transmission_consent?: boolean | null
          created_at?: string | null
          duration_sec?: number | null
          id?: string
          job_seeker_id?: string
          job_simulation_id?: string
          paste_detected?: boolean | null
          response_json?: Json | null
          response_text?: string | null
          score_json?: Json | null
          started_at?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_job_seeker_id_fkey"
            columns: ["job_seeker_id"]
            isOneToOne: false
            referencedRelation: "job_seekers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_simulation_id_fkey"
            columns: ["job_simulation_id"]
            isOneToOne: false
            referencedRelation: "job_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_visible_submissions: {
        Row: {
          company_id: string | null
          discovery_consent: boolean | null
          duration_sec: number | null
          external_links: Json | null
          id: string | null
          job_interests: string[] | null
          one_line_intro: string | null
          paste_detected: boolean | null
          response_text: string | null
          simulation_title: string | null
          submitted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_simulations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_applicants_by_company_code: {
        Args: { company_code: string }
        Returns: {
          company_id: string
          created_at: string
          desired_salary: string
          duration: string
          education: string
          educations: Json
          email: string
          employment_type: string
          experience: string
          experiences: Json
          headline: string
          id: string
          location: string
          name: string
          phone: string
          photo_path: string
          portfolio: Json
          preferred_region: string
          recent_job: string
          resume_source_type: string
          resume_title: string
          resume_url: string
          role: string
          simulation: Json
          skills: string[]
          status: Database["public"]["Enums"]["applicant_status"]
          submitted_at: string
          tools: string[]
          updated_at: string
        }[]
      }
      get_saved_applicant_ids_by_company_code: {
        Args: { company_code: string }
        Returns: {
          submission_id: string
        }[]
      }
      set_saved_applicant_by_company_code: {
        Args: {
          p_applicant_id: string
          p_company_code: string
          p_is_saved: boolean
        }
        Returns: boolean
      }
    }
    Enums: {
      applicant_status: "submitted" | "in_review" | "completed"
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
      applicant_status: ["submitted", "in_review", "completed"],
    },
  },
} as const
