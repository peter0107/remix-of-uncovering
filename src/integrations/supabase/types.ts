export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      companies: {
        Row: {
          code: string | null;
          created_at: string | null;
          id: string;
          name: string;
          role_label: string | null;
          unique_code: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          role_label?: string | null;
          unique_code: string;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          role_label?: string | null;
          unique_code?: string;
        };
        Relationships: [];
      };
      job_simulation_requests: {
        Row: {
          company_id: string;
          contact_email: string | null;
          created_at: string;
          id: string;
          request_note: string;
          requested_role: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          request_note?: string;
          requested_role: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          request_note?: string;
          requested_role?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_simulation_requests_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      job_seekers: {
        Row: {
          academic_mark: number | null;
          avatar_url: string | null;
          company_interests: string[] | null;
          created_at: string | null;
          discovery_consent: boolean | null;
          education_level: string | null;
          email: string;
          employment_types: string[] | null;
          external_links: Json | null;
          id: string;
          job_interests: string[] | null;
          majors: string[] | null;
          one_line_intro: string | null;
          university_name: string | null;
          willing_to_relocate: boolean | null;
          work_regions: string[] | null;
        };
        Insert: {
          academic_mark?: number | null;
          avatar_url?: string | null;
          company_interests?: string[] | null;
          created_at?: string | null;
          discovery_consent?: boolean | null;
          education_level?: string | null;
          email: string;
          employment_types?: string[] | null;
          external_links?: Json | null;
          id?: string;
          job_interests?: string[] | null;
          majors?: string[] | null;
          one_line_intro?: string | null;
          university_name?: string | null;
          willing_to_relocate?: boolean | null;
          work_regions?: string[] | null;
        };
        Update: {
          academic_mark?: number | null;
          avatar_url?: string | null;
          company_interests?: string[] | null;
          created_at?: string | null;
          discovery_consent?: boolean | null;
          education_level?: string | null;
          email?: string;
          employment_types?: string[] | null;
          external_links?: Json | null;
          id?: string;
          job_interests?: string[] | null;
          majors?: string[] | null;
          one_line_intro?: string | null;
          university_name?: string | null;
          willing_to_relocate?: boolean | null;
          work_regions?: string[] | null;
        };
        Relationships: [];
      };
      job_simulations: {
        Row: {
          company_id: string;
          created_at: string | null;
          description: string | null;
          domain: string | null;
          estimated_minutes: number | null;
          id: string;
          job_family: string | null;
          role_label: string | null;
          task_prompt: string | null;
          title: string;
        };
        Insert: {
          company_id: string;
          created_at?: string | null;
          description?: string | null;
          domain?: string | null;
          estimated_minutes?: number | null;
          id?: string;
          job_family?: string | null;
          role_label?: string | null;
          task_prompt?: string | null;
          title: string;
        };
        Update: {
          company_id?: string;
          created_at?: string | null;
          description?: string | null;
          domain?: string | null;
          estimated_minutes?: number | null;
          id?: string;
          job_family?: string | null;
          role_label?: string | null;
          task_prompt?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_simulations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      resumes: {
        Row: {
          basics: Json;
          created_at: string;
          educations: Json;
          experiences: Json;
          id: string;
          is_default: boolean;
          job_conditions: Json;
          memo: string | null;
          portfolios: Json;
          skills: string[];
          source_type: string;
          target_role: string | null;
          title: string;
          tools: string[];
          updated_at: string;
          uploaded_file_name: string | null;
          uploaded_file_path: string | null;
          uploaded_file_size: number | null;
          uploaded_file_type: string | null;
          user_id: string;
        };
        Insert: {
          basics?: Json;
          created_at?: string;
          educations?: Json;
          experiences?: Json;
          id?: string;
          is_default?: boolean;
          job_conditions?: Json;
          memo?: string | null;
          portfolios?: Json;
          skills?: string[];
          source_type?: string;
          target_role?: string | null;
          title?: string;
          tools?: string[];
          updated_at?: string;
          uploaded_file_name?: string | null;
          uploaded_file_path?: string | null;
          uploaded_file_size?: number | null;
          uploaded_file_type?: string | null;
          user_id: string;
        };
        Update: {
          basics?: Json;
          created_at?: string;
          educations?: Json;
          experiences?: Json;
          id?: string;
          is_default?: boolean;
          job_conditions?: Json;
          memo?: string | null;
          portfolios?: Json;
          skills?: string[];
          source_type?: string;
          target_role?: string | null;
          title?: string;
          tools?: string[];
          updated_at?: string;
          uploaded_file_name?: string | null;
          uploaded_file_path?: string | null;
          uploaded_file_size?: number | null;
          uploaded_file_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "job_seekers";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          answer_transmission_consent: boolean | null;
          created_at: string | null;
          duration_sec: number | null;
          id: string;
          job_seeker_id: string;
          job_simulation_id: string;
          paste_detected: boolean | null;
          response_text: string | null;
          score_json: Json | null;
          started_at: string | null;
          submitted_at: string | null;
        };
        Insert: {
          answer_transmission_consent?: boolean | null;
          created_at?: string | null;
          duration_sec?: number | null;
          id?: string;
          job_seeker_id: string;
          job_simulation_id: string;
          paste_detected?: boolean | null;
          response_text?: string | null;
          score_json?: Json | null;
          started_at?: string | null;
          submitted_at?: string | null;
        };
        Update: {
          answer_transmission_consent?: boolean | null;
          created_at?: string | null;
          duration_sec?: number | null;
          id?: string;
          job_seeker_id?: string;
          job_simulation_id?: string;
          paste_detected?: boolean | null;
          response_text?: string | null;
          score_json?: Json | null;
          started_at?: string | null;
          submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_job_seeker_id_fkey";
            columns: ["job_seeker_id"];
            isOneToOne: false;
            referencedRelation: "job_seekers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_job_simulation_id_fkey";
            columns: ["job_simulation_id"];
            isOneToOne: false;
            referencedRelation: "job_simulations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      company_visible_submissions: {
        Row: {
          company_id: string | null;
          discovery_consent: boolean | null;
          duration_sec: number | null;
          external_links: Json | null;
          id: string | null;
          job_interests: string[] | null;
          one_line_intro: string | null;
          paste_detected: boolean | null;
          response_text: string | null;
          simulation_title: string | null;
          submitted_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_simulations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
