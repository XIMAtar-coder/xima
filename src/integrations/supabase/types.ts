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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          context: Json | null
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          context?: Json | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          cleared_at: string | null
          created_at: string
          id: string
          language: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cleared_at?: string | null
          created_at?: string
          id?: string
          language?: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cleared_at?: string | null
          created_at?: string
          id?: string
          language?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_invocation_log: {
        Row: {
          correlation_id: string
          error_code: string | null
          function_name: string
          id: string
          input_summary: string | null
          invoked_at: string
          latency_ms: number | null
          max_tokens: number | null
          model_name: string
          model_version: string
          output_summary: string | null
          prompt_hash: string
          prompt_template_version: string
          provider: string
          request_id: string
          scoring_schema_version: string
          status: string
          temperature: number | null
        }
        Insert: {
          correlation_id: string
          error_code?: string | null
          function_name: string
          id?: string
          input_summary?: string | null
          invoked_at?: string
          latency_ms?: number | null
          max_tokens?: number | null
          model_name: string
          model_version?: string
          output_summary?: string | null
          prompt_hash: string
          prompt_template_version?: string
          provider?: string
          request_id: string
          scoring_schema_version?: string
          status: string
          temperature?: number | null
        }
        Update: {
          correlation_id?: string
          error_code?: string | null
          function_name?: string
          id?: string
          input_summary?: string | null
          invoked_at?: string
          latency_ms?: number | null
          max_tokens?: number | null
          model_name?: string
          model_version?: string
          output_summary?: string | null
          prompt_hash?: string
          prompt_template_version?: string
          provider?: string
          request_id?: string
          scoring_schema_version?: string
          status?: string
          temperature?: number | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["ai_message_role"]
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["ai_message_role"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["ai_message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_options: {
        Row: {
          id: string
          next_question_code: string | null
          option_index: number
          question_id: string
          value_label: string
          weight: number | null
        }
        Insert: {
          id: string
          next_question_code?: string | null
          option_index: number
          question_id: string
          value_label: string
          weight?: number | null
        }
        Update: {
          id?: string
          next_question_code?: string | null
          option_index?: number
          question_id?: string
          value_label?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
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
          {
            foreignKeyName: "appointments_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_answers: {
        Row: {
          answer_value: number
          created_at: string | null
          id: string
          pillar: string
          question_id: number
          result_id: string
          weight: number | null
        }
        Insert: {
          answer_value: number
          created_at?: string | null
          id?: string
          pillar: string
          question_id: number
          result_id: string
          weight?: number | null
        }
        Update: {
          answer_value?: number
          created_at?: string | null
          id?: string
          pillar?: string
          question_id?: number
          result_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_cv_analysis: {
        Row: {
          created_at: string | null
          cv_text: string | null
          id: string
          pillar_vector: Json | null
          soft_skills: string[] | null
          strengths: string[] | null
          summary: string | null
          user_id: string | null
          ximatar_suggestions: string[] | null
        }
        Insert: {
          created_at?: string | null
          cv_text?: string | null
          id?: string
          pillar_vector?: Json | null
          soft_skills?: string[] | null
          strengths?: string[] | null
          summary?: string | null
          user_id?: string | null
          ximatar_suggestions?: string[] | null
        }
        Update: {
          created_at?: string | null
          cv_text?: string | null
          id?: string
          pillar_vector?: Json | null
          soft_skills?: string[] | null
          strengths?: string[] | null
          summary?: string | null
          user_id?: string | null
          ximatar_suggestions?: string[] | null
        }
        Relationships: []
      }
      assessment_evidence_ledger: {
        Row: {
          ai_request_id: string
          attempt_id: string
          content_hash: string
          content_language: string
          content_length: number
          created_at: string
          detected_red_flags: string[]
          expires_at: string | null
          field_key: string
          final_score: number
          id: string
          key_reasons: string[]
          open_key: string
          open_response_id: string | null
          prompt_template_version: string
          quality_label: string
          retention_days: number
          rubric_version: string
          score_breakdown: Json | null
          scoring_schema_version: string
          subject_profile_id: string | null
        }
        Insert: {
          ai_request_id: string
          attempt_id: string
          content_hash: string
          content_language?: string
          content_length: number
          created_at?: string
          detected_red_flags?: string[]
          expires_at?: string | null
          field_key: string
          final_score: number
          id?: string
          key_reasons?: string[]
          open_key: string
          open_response_id?: string | null
          prompt_template_version?: string
          quality_label: string
          retention_days?: number
          rubric_version?: string
          score_breakdown?: Json | null
          scoring_schema_version?: string
          subject_profile_id?: string | null
        }
        Update: {
          ai_request_id?: string
          attempt_id?: string
          content_hash?: string
          content_language?: string
          content_length?: number
          created_at?: string
          detected_red_flags?: string[]
          expires_at?: string | null
          field_key?: string
          final_score?: number
          id?: string
          key_reasons?: string[]
          open_key?: string
          open_response_id?: string | null
          prompt_template_version?: string
          quality_label?: string
          retention_days?: number
          rubric_version?: string
          score_breakdown?: Json | null
          scoring_schema_version?: string
          subject_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_evidence_ledger_ai_request_id_fkey"
            columns: ["ai_request_id"]
            isOneToOne: false
            referencedRelation: "ai_invocation_log"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "assessment_evidence_ledger_open_response_id_fkey"
            columns: ["open_response_id"]
            isOneToOne: false
            referencedRelation: "assessment_open_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_evidence_ledger_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_evidence_ledger_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      assessment_flows: {
        Row: {
          active: boolean
          code: string
          created_at: string
          default: boolean
          id: string
          title_key: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          default?: boolean
          id: string
          title_key?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          default?: boolean
          id?: string
          title_key?: string | null
        }
        Relationships: []
      }
      assessment_open_responses: {
        Row: {
          answer: string
          attempt_id: string
          created_at: string
          field_key: string
          id: string
          language: string
          open_key: string
          rubric: Json
          score: number
          user_id: string
        }
        Insert: {
          answer: string
          attempt_id: string
          created_at?: string
          field_key: string
          id?: string
          language?: string
          open_key: string
          rubric: Json
          score: number
          user_id: string
        }
        Update: {
          answer?: string
          attempt_id?: string
          created_at?: string
          field_key?: string
          id?: string
          language?: string
          open_key?: string
          rubric?: Json
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          assessment_id: string | null
          attempt_id: string | null
          completed: boolean | null
          computed_at: string
          field_key: string | null
          id: string
          language: string
          pillars: Json | null
          rationale: Json | null
          sentiment: number | null
          top3: Json | null
          total_score: number | null
          user_id: string
          ximatar_id: string | null
        }
        Insert: {
          assessment_id?: string | null
          attempt_id?: string | null
          completed?: boolean | null
          computed_at?: string
          field_key?: string | null
          id?: string
          language?: string
          pillars?: Json | null
          rationale?: Json | null
          sentiment?: number | null
          top3?: Json | null
          total_score?: number | null
          user_id: string
          ximatar_id?: string | null
        }
        Update: {
          assessment_id?: string | null
          attempt_id?: string | null
          completed?: boolean | null
          computed_at?: string
          field_key?: string | null
          id?: string
          language?: string
          pillars?: Json | null
          rationale?: Json | null
          sentiment?: number | null
          top3?: Json | null
          total_score?: number | null
          user_id?: string
          ximatar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assessment_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "assessment_results_ximatar_id_fkey"
            columns: ["ximatar_id"]
            isOneToOne: false
            referencedRelation: "ximatars"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_scores: {
        Row: {
          assessment_id: string
          pillar: string
          score: number
        }
        Insert: {
          assessment_id: string
          pillar: string
          score: number
        }
        Update: {
          assessment_id?: string
          pillar?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
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
          level: string | null
          meta: Json | null
          overall_score: number | null
          pillar_scores: Json | null
          recommendations: Json | null
          source: string | null
          started_at: string | null
          user_id: string
          xima_scores: Json
        }
        Insert: {
          assessment_type: string
          completed_at?: string
          created_at?: string
          id?: string
          level?: string | null
          meta?: Json | null
          overall_score?: number | null
          pillar_scores?: Json | null
          recommendations?: Json | null
          source?: string | null
          started_at?: string | null
          user_id: string
          xima_scores: Json
        }
        Update: {
          assessment_type?: string
          completed_at?: string
          created_at?: string
          id?: string
          level?: string | null
          meta?: Json | null
          overall_score?: number | null
          pillar_scores?: Json | null
          recommendations?: Json | null
          source?: string | null
          started_at?: string | null
          user_id?: string
          xima_scores?: Json
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          attempt_id: string | null
          correlation_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_hash: string | null
          metadata: Json
          occurred_at: string
          user_agent_hash: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          attempt_id?: string | null
          correlation_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          occurred_at?: string
          user_agent_hash?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          attempt_id?: string | null
          correlation_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          occurred_at?: string
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          professional_id: string
          seeker_user_id: string
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          professional_id: string
          seeker_user_id: string
          starts_at: string
          status?: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          professional_id?: string
          seeker_user_id?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_seeker_user_id_fkey"
            columns: ["seeker_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_seeker_user_id_fkey"
            columns: ["seeker_user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bot_events: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          lang: Database["public"]["Enums"]["lang_code"] | null
          payload: Json | null
          route: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          lang?: Database["public"]["Enums"]["lang_code"] | null
          payload?: Json | null
          route?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          lang?: Database["public"]["Enums"]["lang_code"] | null
          payload?: Json | null
          route?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      business_challenges: {
        Row: {
          attachment_url: string | null
          business_id: string
          config_json: Json | null
          context_snapshot: Json | null
          created_at: string | null
          created_from_job_post: boolean | null
          deadline: string | null
          description: string | null
          difficulty: number | null
          end_at: string | null
          generation_error: string | null
          generation_status: string | null
          hiring_goal_id: string | null
          id: string
          is_public: boolean | null
          job_post_id: string | null
          level: number
          rubric: Json | null
          start_at: string | null
          status: string
          success_criteria: string[] | null
          target_skills: string[] | null
          time_estimate_minutes: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          business_id: string
          config_json?: Json | null
          context_snapshot?: Json | null
          created_at?: string | null
          created_from_job_post?: boolean | null
          deadline?: string | null
          description?: string | null
          difficulty?: number | null
          end_at?: string | null
          generation_error?: string | null
          generation_status?: string | null
          hiring_goal_id?: string | null
          id?: string
          is_public?: boolean | null
          job_post_id?: string | null
          level?: number
          rubric?: Json | null
          start_at?: string | null
          status?: string
          success_criteria?: string[] | null
          target_skills?: string[] | null
          time_estimate_minutes?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          business_id?: string
          config_json?: Json | null
          context_snapshot?: Json | null
          created_at?: string | null
          created_from_job_post?: boolean | null
          deadline?: string | null
          description?: string | null
          difficulty?: number | null
          end_at?: string | null
          generation_error?: string | null
          generation_status?: string | null
          hiring_goal_id?: string | null
          id?: string
          is_public?: boolean | null
          job_post_id?: string | null
          level?: number
          rubric?: Json | null
          start_at?: string | null
          status?: string
          success_criteria?: string[] | null
          target_skills?: string[] | null
          time_estimate_minutes?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_challenges_hiring_goal_id_fkey"
            columns: ["hiring_goal_id"]
            isOneToOne: false
            referencedRelation: "hiring_goal_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_challenges_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_entitlements: {
        Row: {
          business_id: string
          contract_end: string | null
          contract_start: string | null
          created_at: string
          features: Json
          id: string
          max_seats: number
          notes: string | null
          plan_tier: string
          renewal_date: string | null
          seats_used: number
          updated_at: string
        }
        Insert: {
          business_id: string
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          features?: Json
          id?: string
          max_seats?: number
          notes?: string | null
          plan_tier?: string
          renewal_date?: string | null
          seats_used?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          features?: Json
          id?: string
          max_seats?: number
          notes?: string | null
          plan_tier?: string
          renewal_date?: string | null
          seats_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_entitlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_job_post_imports: {
        Row: {
          business_id: string
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          id: string
          job_post_id: string | null
          new_job_post_id: string | null
          pdf_path: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          job_post_id?: string | null
          new_job_post_id?: string | null
          pdf_path: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          job_post_id?: string | null
          new_job_post_id?: string | null
          pdf_path?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_job_post_imports_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_job_post_imports_new_job_post_id_fkey"
            columns: ["new_job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          company_logo: string | null
          company_name: string
          created_at: string | null
          default_challenge_difficulty: number | null
          default_challenge_duration: number | null
          hr_contact_email: string | null
          id: string
          manual_employees_count: number | null
          manual_founded_year: number | null
          manual_hq_city: string | null
          manual_hq_country: string | null
          manual_industry: string | null
          manual_revenue_range: string | null
          manual_website: string | null
          snapshot_employees_count: number | null
          snapshot_founded_year: number | null
          snapshot_hq_city: string | null
          snapshot_hq_country: string | null
          snapshot_industry: string | null
          snapshot_last_enriched_at: string | null
          snapshot_manual_override: boolean | null
          snapshot_revenue_range: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          company_logo?: string | null
          company_name: string
          created_at?: string | null
          default_challenge_difficulty?: number | null
          default_challenge_duration?: number | null
          hr_contact_email?: string | null
          id?: string
          manual_employees_count?: number | null
          manual_founded_year?: number | null
          manual_hq_city?: string | null
          manual_hq_country?: string | null
          manual_industry?: string | null
          manual_revenue_range?: string | null
          manual_website?: string | null
          snapshot_employees_count?: number | null
          snapshot_founded_year?: number | null
          snapshot_hq_city?: string | null
          snapshot_hq_country?: string | null
          snapshot_industry?: string | null
          snapshot_last_enriched_at?: string | null
          snapshot_manual_override?: boolean | null
          snapshot_revenue_range?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          company_logo?: string | null
          company_name?: string
          created_at?: string | null
          default_challenge_difficulty?: number | null
          default_challenge_duration?: number | null
          hr_contact_email?: string | null
          id?: string
          manual_employees_count?: number | null
          manual_founded_year?: number | null
          manual_hq_city?: string | null
          manual_hq_country?: string | null
          manual_industry?: string | null
          manual_revenue_range?: string | null
          manual_website?: string | null
          snapshot_employees_count?: number | null
          snapshot_founded_year?: number | null
          snapshot_hq_city?: string | null
          snapshot_hq_country?: string | null
          snapshot_industry?: string | null
          snapshot_last_enriched_at?: string | null
          snapshot_manual_override?: boolean | null
          snapshot_revenue_range?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      business_shortlists: {
        Row: {
          business_id: string
          candidate_profile_id: string
          created_at: string
          hiring_goal_id: string
          id: string
        }
        Insert: {
          business_id: string
          candidate_profile_id: string
          created_at?: string
          hiring_goal_id: string
          id?: string
        }
        Update: {
          business_id?: string
          candidate_profile_id?: string
          created_at?: string
          hiring_goal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_shortlists_hiring_goal_id_fkey"
            columns: ["hiring_goal_id"]
            isOneToOne: false
            referencedRelation: "hiring_goal_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_challenges: {
        Row: {
          candidate_id: string
          challenge_id: string
          completed_at: string | null
          created_at: string | null
          feedback: string | null
          id: string
          score: number | null
          status: string | null
        }
        Insert: {
          candidate_id: string
          challenge_id: string
          completed_at?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string | null
        }
        Update: {
          candidate_id?: string
          challenge_id?: string
          completed_at?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          score?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "business_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_eligibility: {
        Row: {
          business_id: string
          candidate_profile_id: string
          certificates_list: string[] | null
          created_at: string | null
          education_field: string | null
          education_level: string | null
          hiring_goal_id: string
          id: string
          language_level: string | null
          language_notes: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          candidate_profile_id: string
          certificates_list?: string[] | null
          created_at?: string | null
          education_field?: string | null
          education_level?: string | null
          hiring_goal_id: string
          id?: string
          language_level?: string | null
          language_notes?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          candidate_profile_id?: string
          certificates_list?: string[] | null
          created_at?: string | null
          education_field?: string | null
          education_level?: string | null
          hiring_goal_id?: string
          id?: string
          language_level?: string | null
          language_notes?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_eligibility_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_eligibility_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "candidate_eligibility_hiring_goal_id_fkey"
            columns: ["hiring_goal_id"]
            isOneToOne: false
            referencedRelation: "hiring_goal_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_shortlist: {
        Row: {
          business_id: string
          candidate_id: string
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          candidate_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          candidate_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      challenge_followups: {
        Row: {
          answer: string | null
          answered_at: string | null
          asked_at: string | null
          business_id: string
          candidate_profile_id: string
          id: string
          invitation_id: string
          question: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          asked_at?: string | null
          business_id: string
          candidate_profile_id: string
          id?: string
          invitation_id: string
          question: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          asked_at?: string | null
          business_id?: string
          candidate_profile_id?: string
          id?: string
          invitation_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_followups_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "challenge_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_invitations: {
        Row: {
          business_id: string
          candidate_profile_id: string
          challenge_id: string | null
          created_at: string
          hiring_goal_id: string
          id: string
          invite_token: string
          responded_at: string | null
          sent_via: string[]
          status: string
        }
        Insert: {
          business_id: string
          candidate_profile_id: string
          challenge_id?: string | null
          created_at?: string
          hiring_goal_id: string
          id?: string
          invite_token?: string
          responded_at?: string | null
          sent_via?: string[]
          status?: string
        }
        Update: {
          business_id?: string
          candidate_profile_id?: string
          challenge_id?: string | null
          created_at?: string
          hiring_goal_id?: string
          id?: string
          invite_token?: string
          responded_at?: string | null
          sent_via?: string[]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_invitations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "business_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_invitations_hiring_goal_id_fkey"
            columns: ["hiring_goal_id"]
            isOneToOne: false
            referencedRelation: "hiring_goal_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_reviews: {
        Row: {
          business_id: string
          candidate_profile_id: string
          challenge_id: string
          created_at: string | null
          decision: string
          followup_question: string | null
          id: string
          invitation_id: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          candidate_profile_id: string
          challenge_id: string
          created_at?: string | null
          decision: string
          followup_question?: string | null
          id?: string
          invitation_id: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          candidate_profile_id?: string
          challenge_id?: string
          created_at?: string | null
          decision?: string
          followup_question?: string | null
          id?: string
          invitation_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_reviews_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "business_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_reviews_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "challenge_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          business_id: string
          candidate_profile_id: string
          challenge_id: string
          created_at: string
          draft_payload: Json | null
          hiring_goal_id: string
          id: string
          invitation_id: string
          signals_payload: Json | null
          signals_version: string
          status: string
          submitted_at: string | null
          submitted_payload: Json | null
          updated_at: string
        }
        Insert: {
          business_id: string
          candidate_profile_id: string
          challenge_id: string
          created_at?: string
          draft_payload?: Json | null
          hiring_goal_id: string
          id?: string
          invitation_id: string
          signals_payload?: Json | null
          signals_version?: string
          status?: string
          submitted_at?: string | null
          submitted_payload?: Json | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          candidate_profile_id?: string
          challenge_id?: string
          created_at?: string
          draft_payload?: Json | null
          hiring_goal_id?: string
          id?: string
          invitation_id?: string
          signals_payload?: Json | null
          signals_version?: string
          status?: string
          submitted_at?: string | null
          submitted_payload?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "business_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "challenge_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string | null
          edited_at: string | null
          id: string
          lang: Database["public"]["Enums"]["lang_code"] | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          lang?: Database["public"]["Enums"]["lang_code"] | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          lang?: Database["public"]["Enums"]["lang_code"] | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          role: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          role?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          role?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          business_id: string | null
          candidate_profile_id: string | null
          created_at: string | null
          created_by: string
          id: string
          is_group: boolean
          mentor_profile_id: string | null
          thread_type: Database["public"]["Enums"]["thread_type_enum"] | null
          topic: string | null
        }
        Insert: {
          business_id?: string | null
          candidate_profile_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          is_group?: boolean
          mentor_profile_id?: string | null
          thread_type?: Database["public"]["Enums"]["thread_type_enum"] | null
          topic?: string | null
        }
        Update: {
          business_id?: string | null
          candidate_profile_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          is_group?: boolean
          mentor_profile_id?: string | null
          thread_type?: Database["public"]["Enums"]["thread_type_enum"] | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      company_legal: {
        Row: {
          business_id: string
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          id: string
          legal_name: string | null
          postal_code: string | null
          registration_number: string | null
          street_address: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          business_id: string
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          postal_code?: string | null
          registration_number?: string | null
          street_address?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          business_id?: string
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          postal_code?: string | null
          registration_number?: string | null
          street_address?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_business_legal"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          communication_style: string | null
          company_id: string
          created_at: string | null
          id: string
          ideal_traits: string[] | null
          ideal_ximatar_profile_ids: string[] | null
          ideal_ximatar_profile_reasoning: string | null
          operating_style: string | null
          pillar_vector: Json
          recommended_ximatars: string[] | null
          risk_areas: string[] | null
          summary: string | null
          updated_at: string | null
          values: string[] | null
          website: string
        }
        Insert: {
          communication_style?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          ideal_traits?: string[] | null
          ideal_ximatar_profile_ids?: string[] | null
          ideal_ximatar_profile_reasoning?: string | null
          operating_style?: string | null
          pillar_vector?: Json
          recommended_ximatars?: string[] | null
          risk_areas?: string[] | null
          summary?: string | null
          updated_at?: string | null
          values?: string[] | null
          website: string
        }
        Update: {
          communication_style?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          ideal_traits?: string[] | null
          ideal_ximatar_profile_ids?: string[] | null
          ideal_ximatar_profile_reasoning?: string | null
          operating_style?: string | null
          pillar_vector?: Json
          recommended_ximatars?: string[] | null
          risk_areas?: string[] | null
          summary?: string | null
          updated_at?: string | null
          values?: string[] | null
          website?: string
        }
        Relationships: []
      }
      company_sentiment: {
        Row: {
          company: string
          cons: string[] | null
          highlights: string[] | null
          id: string
          overall_score: number | null
          pros: string[] | null
          sources: Json | null
          updated_at: string | null
        }
        Insert: {
          company: string
          cons?: string[] | null
          highlights?: string[] | null
          id?: string
          overall_score?: number | null
          pros?: string[] | null
          sources?: Json | null
          updated_at?: string | null
        }
        Update: {
          company?: string
          cons?: string[] | null
          highlights?: string[] | null
          id?: string
          overall_score?: number | null
          pros?: string[] | null
          sources?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_sales_requests: {
        Row: {
          business_id: string | null
          company_name: string | null
          correlation_id: string | null
          created_at: string
          desired_seats: number | null
          desired_tier: string | null
          id: string
          message: string | null
          requester_email: string
          requester_name: string
          status: string
        }
        Insert: {
          business_id?: string | null
          company_name?: string | null
          correlation_id?: string | null
          created_at?: string
          desired_seats?: number | null
          desired_tier?: string | null
          id?: string
          message?: string | null
          requester_email: string
          requester_name: string
          status?: string
        }
        Update: {
          business_id?: string | null
          company_name?: string | null
          correlation_id?: string | null
          created_at?: string
          desired_seats?: number | null
          desired_tier?: string | null
          id?: string
          message?: string | null
          requester_email?: string
          requester_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_sales_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      devplan_items: {
        Row: {
          description_i18n_key: string | null
          difficulty: string | null
          id: string
          key: string
          pillar: string
          title_i18n_key: string
        }
        Insert: {
          description_i18n_key?: string | null
          difficulty?: string | null
          id?: string
          key: string
          pillar: string
          title_i18n_key: string
        }
        Update: {
          description_i18n_key?: string | null
          difficulty?: string | null
          id?: string
          key?: string
          pillar?: string
          title_i18n_key?: string
        }
        Relationships: []
      }
      devplan_user_items: {
        Row: {
          created_at: string | null
          devplan_item_id: string
          id: string
          last_result: Json | null
          progress: number
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          devplan_item_id: string
          id?: string
          last_result?: Json | null
          progress?: number
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          devplan_item_id?: string
          id?: string
          last_result?: Json | null
          progress?: number
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devplan_user_items_devplan_item_id_fkey"
            columns: ["devplan_item_id"]
            isOneToOne: false
            referencedRelation: "devplan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devplan_user_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devplan_user_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      eligibility_documents: {
        Row: {
          created_at: string | null
          doc_type: string
          eligibility_id: string
          id: string
          label: string | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          doc_type: string
          eligibility_id: string
          id?: string
          label?: string | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          doc_type?: string
          eligibility_id?: string
          id?: string
          label?: string | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_documents_eligibility_id_fkey"
            columns: ["eligibility_id"]
            isOneToOne: false
            referencedRelation: "candidate_eligibility"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          email_type: string
          error_message: string | null
          html_body: string
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          max_attempts: number
          metadata: Json
          next_retry_at: string | null
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email_type: string
          error_message?: string | null
          html_body: string
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          max_attempts?: number
          metadata?: Json
          next_retry_at?: string | null
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email_type?: string
          error_message?: string | null
          html_body?: string
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          max_attempts?: number
          metadata?: Json
          next_retry_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      entitlement_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          meta: Json
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          meta?: Json
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          meta?: Json
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_consumption: {
        Row: {
          created_at: string | null
          last_seen_at: string | null
          last_seen_feed_item_id: string | null
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          last_seen_at?: string | null
          last_seen_feed_item_id?: string | null
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          last_seen_at?: string | null
          last_seen_feed_item_id?: string | null
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_consumption_last_seen_feed_item_id_fkey"
            columns: ["last_seen_feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_consumption_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_consumption_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feed_items: {
        Row: {
          audience_type:
            | Database["public"]["Enums"]["audience_type_enum"]
            | null
          business_id: string | null
          candidate_profile_id: string | null
          created_at: string
          id: string
          mentor_profile_id: string | null
          payload: Json
          priority: number | null
          source: string
          subject_ximatar_id: string
          type: string
          visibility: Json
        }
        Insert: {
          audience_type?:
            | Database["public"]["Enums"]["audience_type_enum"]
            | null
          business_id?: string | null
          candidate_profile_id?: string | null
          created_at?: string
          id?: string
          mentor_profile_id?: string | null
          payload?: Json
          priority?: number | null
          source: string
          subject_ximatar_id: string
          type: string
          visibility?: Json
        }
        Update: {
          audience_type?:
            | Database["public"]["Enums"]["audience_type_enum"]
            | null
          business_id?: string | null
          candidate_profile_id?: string | null
          created_at?: string
          id?: string
          mentor_profile_id?: string | null
          payload?: Json
          priority?: number | null
          source?: string
          subject_ximatar_id?: string
          type?: string
          visibility?: Json
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_items_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feed_items_subject_ximatar_id_fkey"
            columns: ["subject_ximatar_id"]
            isOneToOne: false
            referencedRelation: "ximatars"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_reactions: {
        Row: {
          created_at: string
          feed_item_id: string
          id: string
          reaction_type: string
          reactor_hash: string
          reactor_type: string
        }
        Insert: {
          created_at?: string
          feed_item_id: string
          id?: string
          reaction_type: string
          reactor_hash: string
          reactor_type: string
        }
        Update: {
          created_at?: string
          feed_item_id?: string
          id?: string
          reaction_type?: string
          reactor_hash?: string
          reactor_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_seen_items: {
        Row: {
          feed_item_id: string
          profile_id: string
          seen_at: string | null
        }
        Insert: {
          feed_item_id: string
          profile_id: string
          seen_at?: string | null
        }
        Update: {
          feed_item_id?: string
          profile_id?: string
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_seen_items_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_seen_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_seen_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      flow_questions: {
        Row: {
          flow_id: string
          id: string
          position: number
          question_id: string
          section_id: string | null
        }
        Insert: {
          flow_id: string
          id?: string
          position: number
          question_id: string
          section_id?: string | null
        }
        Update: {
          flow_id?: string
          id?: string
          position?: number
          question_id?: string
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_questions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "assessment_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "flow_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_sections: {
        Row: {
          description_key: string | null
          flow_id: string
          id: string
          section_index: number
          title_key: string | null
        }
        Insert: {
          description_key?: string | null
          flow_id: string
          id: string
          section_index: number
          title_key?: string | null
        }
        Update: {
          description_key?: string | null
          flow_id?: string
          id?: string
          section_index?: number
          title_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_sections_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "assessment_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_goal_drafts: {
        Row: {
          business_id: string
          candidate_count: number | null
          challenge_count: number | null
          city_region: string | null
          country: string | null
          created_at: string | null
          experience_level: string | null
          function_area: string | null
          id: string
          role_title: string | null
          salary_benchmark_json: Json | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          status: string | null
          task_description: string | null
          updated_at: string | null
          work_model: string | null
        }
        Insert: {
          business_id: string
          candidate_count?: number | null
          challenge_count?: number | null
          city_region?: string | null
          country?: string | null
          created_at?: string | null
          experience_level?: string | null
          function_area?: string | null
          id?: string
          role_title?: string | null
          salary_benchmark_json?: Json | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          status?: string | null
          task_description?: string | null
          updated_at?: string | null
          work_model?: string | null
        }
        Update: {
          business_id?: string
          candidate_count?: number | null
          challenge_count?: number | null
          city_region?: string | null
          country?: string | null
          created_at?: string | null
          experience_level?: string | null
          function_area?: string | null
          id?: string
          role_title?: string | null
          salary_benchmark_json?: Json | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          status?: string | null
          task_description?: string | null
          updated_at?: string | null
          work_model?: string | null
        }
        Relationships: []
      }
      hiring_goal_requirements: {
        Row: {
          allow_override: boolean | null
          business_id: string
          certificates_required: boolean | null
          created_at: string | null
          education_field: string | null
          education_required: boolean | null
          hiring_goal_id: string
          id: string
          language: string | null
          language_level: string | null
          language_required: boolean | null
          min_education_level: string | null
          override_reason_required: boolean | null
          required_certificates: string[] | null
          updated_at: string | null
        }
        Insert: {
          allow_override?: boolean | null
          business_id: string
          certificates_required?: boolean | null
          created_at?: string | null
          education_field?: string | null
          education_required?: boolean | null
          hiring_goal_id: string
          id?: string
          language?: string | null
          language_level?: string | null
          language_required?: boolean | null
          min_education_level?: string | null
          override_reason_required?: boolean | null
          required_certificates?: string[] | null
          updated_at?: string | null
        }
        Update: {
          allow_override?: boolean | null
          business_id?: string
          certificates_required?: boolean | null
          created_at?: string | null
          education_field?: string | null
          education_required?: boolean | null
          hiring_goal_id?: string
          id?: string
          language?: string | null
          language_level?: string | null
          language_required?: boolean | null
          min_education_level?: string | null
          override_reason_required?: boolean | null
          required_certificates?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hiring_goal_requirements_hiring_goal_id_fkey"
            columns: ["hiring_goal_id"]
            isOneToOne: true
            referencedRelation: "hiring_goal_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      i18n_keys: {
        Row: {
          created_at: string | null
          key: string
        }
        Insert: {
          created_at?: string | null
          key: string
        }
        Update: {
          created_at?: string | null
          key?: string
        }
        Relationships: []
      }
      i18n_translations: {
        Row: {
          key: string
          lang: Database["public"]["Enums"]["lang_code"]
          text_value: string
        }
        Insert: {
          key: string
          lang: Database["public"]["Enums"]["lang_code"]
          text_value: string
        }
        Update: {
          key?: string
          lang?: Database["public"]["Enums"]["lang_code"]
          text_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "i18n_translations_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "i18n_keys"
            referencedColumns: ["key"]
          },
        ]
      }
      job_posts: {
        Row: {
          benefits: string | null
          business_id: string
          content_html: string | null
          content_json: Json | null
          created_at: string
          department: string | null
          description: string | null
          employment_type: string | null
          id: string
          locale: string | null
          location: string | null
          requirements_must: string | null
          requirements_nice: string | null
          responsibilities: string | null
          salary_range: string | null
          seniority: string | null
          source_pdf_path: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          benefits?: string | null
          business_id: string
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          locale?: string | null
          location?: string | null
          requirements_must?: string | null
          requirements_nice?: string | null
          responsibilities?: string | null
          salary_range?: string | null
          seniority?: string | null
          source_pdf_path?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          benefits?: string | null
          business_id?: string
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          department?: string | null
          description?: string | null
          employment_type?: string | null
          id?: string
          locale?: string | null
          location?: string | null
          requirements_must?: string | null
          requirements_nice?: string | null
          responsibilities?: string | null
          salary_range?: string | null
          seniority?: string | null
          source_pdf_path?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentor_access_audit_logs: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string
          candidate_profile_id: string
          created_at: string
          id: string
          mentor_id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id: string
          candidate_profile_id: string
          created_at?: string
          id?: string
          mentor_id: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string
          candidate_profile_id?: string
          created_at?: string
          id?: string
          mentor_id?: string
          metadata?: Json
        }
        Relationships: []
      }
      mentor_availability_slots: {
        Row: {
          booked_by: string | null
          booking_id: string | null
          created_at: string | null
          end_time: string
          id: string
          is_booked: boolean | null
          is_recurring: boolean
          mentor_id: string
          rrule: string | null
          start_time: string
          status: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          booked_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          is_booked?: boolean | null
          is_recurring?: boolean
          mentor_id: string
          rrule?: string | null
          start_time: string
          status?: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          booked_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          is_booked?: boolean | null
          is_recurring?: boolean
          mentor_id?: string
          rrule?: string | null
          start_time?: string
          status?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_slots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_availability_slots_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_availability_slots_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_coaching_relationships: {
        Row: {
          candidate_profile_id: string
          created_at: string
          ended_at: string | null
          id: string
          mentor_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          candidate_profile_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          mentor_id: string
          started_at?: string
          status: string
          updated_at?: string
        }
        Update: {
          candidate_profile_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          mentor_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_coaching_relationships_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_coaching_relationships_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mentor_coaching_relationships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_coaching_relationships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_credit_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          related_referral_id: string | null
          related_session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          related_referral_id?: string | null
          related_session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          related_referral_id?: string | null
          related_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentor_credits: {
        Row: {
          free_session_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          free_session_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          free_session_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_cv_access: {
        Row: {
          allowed_at: string | null
          candidate_profile_id: string
          created_at: string
          id: string
          is_allowed: boolean
          mentor_id: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          allowed_at?: string | null
          candidate_profile_id: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          mentor_id: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          allowed_at?: string | null
          candidate_profile_id?: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          mentor_id?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_cv_access_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_cv_access_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mentor_cv_access_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_cv_access_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_matches: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          mentee_user_id: string
          mentor_user_id: string
          reason: Json | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          mentee_user_id: string
          mentor_user_id: string
          reason?: Json | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          mentee_user_id?: string
          mentor_user_id?: string
          reason?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_matches_mentee_user_id_fkey"
            columns: ["mentee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_matches_mentee_user_id_fkey"
            columns: ["mentee_user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mentor_session_audit_logs: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string | null
          created_at: string
          id: string
          meta: Json
          session_id: string
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          session_id: string
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_session_audit_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_sessions: {
        Row: {
          availability_slot_id: string | null
          billing_source: string | null
          candidate_profile_id: string
          created_at: string
          created_by: string
          duration_minutes: number | null
          ends_at: string
          id: string
          included_by_tier:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          mentor_id: string
          notes_private: string | null
          notes_shared: string | null
          price_cents: number | null
          proposed_availability_slot_id: string | null
          proposed_end_at: string | null
          proposed_start_at: string | null
          requires_reschedule: boolean
          reschedule_proposed_at: string | null
          reschedule_responded_at: string | null
          reschedule_status: string
          session_type: string | null
          starts_at: string
          status: string
          title: string | null
          updated_at: string
          video_provider: string | null
          video_room_created_at: string | null
          video_room_name: string | null
          video_room_url: string | null
        }
        Insert: {
          availability_slot_id?: string | null
          billing_source?: string | null
          candidate_profile_id: string
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          ends_at: string
          id?: string
          included_by_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          mentor_id: string
          notes_private?: string | null
          notes_shared?: string | null
          price_cents?: number | null
          proposed_availability_slot_id?: string | null
          proposed_end_at?: string | null
          proposed_start_at?: string | null
          requires_reschedule?: boolean
          reschedule_proposed_at?: string | null
          reschedule_responded_at?: string | null
          reschedule_status?: string
          session_type?: string | null
          starts_at: string
          status?: string
          title?: string | null
          updated_at?: string
          video_provider?: string | null
          video_room_created_at?: string | null
          video_room_name?: string | null
          video_room_url?: string | null
        }
        Update: {
          availability_slot_id?: string | null
          billing_source?: string | null
          candidate_profile_id?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          ends_at?: string
          id?: string
          included_by_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          mentor_id?: string
          notes_private?: string | null
          notes_shared?: string | null
          price_cents?: number | null
          proposed_availability_slot_id?: string | null
          proposed_end_at?: string | null
          proposed_start_at?: string | null
          requires_reschedule?: boolean
          reschedule_proposed_at?: string | null
          reschedule_responded_at?: string | null
          reschedule_status?: string
          session_type?: string | null
          starts_at?: string
          status?: string
          title?: string | null
          updated_at?: string
          video_provider?: string | null
          video_room_created_at?: string | null
          video_room_name?: string | null
          video_room_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_sessions_availability_slot_id_fkey"
            columns: ["availability_slot_id"]
            isOneToOne: false
            referencedRelation: "mentor_availability_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_candidate_profile_id_fkey"
            columns: ["candidate_profile_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mentor_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_sessions_proposed_availability_slot_id_fkey"
            columns: ["proposed_availability_slot_id"]
            isOneToOne: false
            referencedRelation: "mentor_availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          active_coached_profiles_count: number
          availability: Json | null
          badges: string[] | null
          bio: string | null
          can_host_video_sessions: boolean | null
          can_reschedule_sessions: boolean | null
          can_view_candidate_cv: boolean | null
          company: string | null
          created_at: string
          email: string | null
          experience_years: number | null
          first_session_expectations: string | null
          free_intro_duration_minutes: number | null
          free_intro_enabled: boolean | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          languages: string[] | null
          linkedin_url: string | null
          location: string | null
          name: string
          paid_sessions_enabled: boolean | null
          profile_image_url: string | null
          rating: number | null
          requires_candidate_cv_consent: boolean | null
          specialties: string[]
          title: string | null
          total_coached_profiles_count: number
          total_sessions: number | null
          updated_at: string
          user_id: string | null
          xima_pillars: string[]
        }
        Insert: {
          active_coached_profiles_count?: number
          availability?: Json | null
          badges?: string[] | null
          bio?: string | null
          can_host_video_sessions?: boolean | null
          can_reschedule_sessions?: boolean | null
          can_view_candidate_cv?: boolean | null
          company?: string | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          first_session_expectations?: string | null
          free_intro_duration_minutes?: number | null
          free_intro_enabled?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          paid_sessions_enabled?: boolean | null
          profile_image_url?: string | null
          rating?: number | null
          requires_candidate_cv_consent?: boolean | null
          specialties: string[]
          title?: string | null
          total_coached_profiles_count?: number
          total_sessions?: number | null
          updated_at?: string
          user_id?: string | null
          xima_pillars: string[]
        }
        Update: {
          active_coached_profiles_count?: number
          availability?: Json | null
          badges?: string[] | null
          bio?: string | null
          can_host_video_sessions?: boolean | null
          can_reschedule_sessions?: boolean | null
          can_view_candidate_cv?: boolean | null
          company?: string | null
          created_at?: string
          email?: string | null
          experience_years?: number | null
          first_session_expectations?: string | null
          free_intro_duration_minutes?: number | null
          free_intro_enabled?: boolean | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          paid_sessions_enabled?: boolean | null
          profile_image_url?: string | null
          rating?: number | null
          requires_candidate_cv_consent?: boolean | null
          specialties?: string[]
          title?: string | null
          total_coached_profiles_count?: number
          total_sessions?: number | null
          updated_at?: string
          user_id?: string | null
          xima_pillars?: string[]
        }
        Relationships: []
      }
      metrics_daily: {
        Row: {
          id: string
          metadata: Json
          metric_date: string
          metric_name: string
          metric_value: number
          updated_at: string
        }
        Insert: {
          id?: string
          metadata?: Json
          metric_date: string
          metric_name: string
          metric_value?: number
          updated_at?: string
        }
        Update: {
          id?: string
          metadata?: Json
          metric_date?: string
          metric_name?: string
          metric_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      mutual_interest: {
        Row: {
          business_id: string
          business_interested_at: string | null
          candidate_accepted_at: string | null
          candidate_ximatar_id: string
          chat_thread_id: string | null
          created_at: string | null
          feed_item_id: string | null
          hiring_goal_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          business_interested_at?: string | null
          candidate_accepted_at?: string | null
          candidate_ximatar_id: string
          chat_thread_id?: string | null
          created_at?: string | null
          feed_item_id?: string | null
          hiring_goal_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          business_interested_at?: string | null
          candidate_accepted_at?: string | null
          candidate_ximatar_id?: string
          chat_thread_id?: string | null
          created_at?: string | null
          feed_item_id?: string | null
          hiring_goal_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mutual_interest_candidate_ximatar_id_fkey"
            columns: ["candidate_ximatar_id"]
            isOneToOne: false
            referencedRelation: "ximatars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutual_interest_chat_thread_id_fkey"
            columns: ["chat_thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutual_interest_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutual_interest_hiring_goal_id_fkey"
            columns: ["hiring_goal_id"]
            isOneToOne: false
            referencedRelation: "hiring_goal_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          recipient_id: string
          related_id: string | null
          sender_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id: string
          related_id?: string | null
          sender_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string
          related_id?: string | null
          sender_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          location: string | null
          skills: string[] | null
          source_url: string | null
          title: string
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          skills?: string[] | null
          source_url?: string | null
          title: string
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          skills?: string[] | null
          source_url?: string | null
          title?: string
        }
        Relationships: []
      }
      pillar_progress_snapshots: {
        Row: {
          id: string
          metadata: Json | null
          occurred_at: string
          pillar_scores: Json
          source: string
          user_id: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          occurred_at?: string
          pillar_scores: Json
          source: string
          user_id: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          occurred_at?: string
          pillar_scores?: Json
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      pillar_scores: {
        Row: {
          assessment_result_id: string
          created_at: string
          id: string
          pillar: string
          score: number
        }
        Insert: {
          assessment_result_id: string
          created_at?: string
          id?: string
          pillar: string
          score: number
        }
        Update: {
          assessment_result_id?: string
          created_at?: string
          id?: string
          pillar?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "pillar_scores_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          avatar_path: string | null
          calendar_url: string | null
          compatibility_score: number | null
          created_at: string | null
          expertise_tags: string[] | null
          field_keys: string[] | null
          full_name: string | null
          id: string
          linkedin_url: string | null
          locale_bio: Json | null
          specialties: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          xima_pillars: string[] | null
        }
        Insert: {
          avatar_path?: string | null
          calendar_url?: string | null
          compatibility_score?: number | null
          created_at?: string | null
          expertise_tags?: string[] | null
          field_keys?: string[] | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          locale_bio?: Json | null
          specialties?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          xima_pillars?: string[] | null
        }
        Update: {
          avatar_path?: string | null
          calendar_url?: string | null
          compatibility_score?: number | null
          created_at?: string | null
          expertise_tags?: string[] | null
          field_keys?: string[] | null
          full_name?: string | null
          id?: string
          linkedin_url?: string | null
          locale_bio?: Json | null
          specialties?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          xima_pillars?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar: Json | null
          created_at: string
          creation_source: string | null
          cv_comments: Json | null
          cv_scores: Json | null
          drive_level: string | null
          drive_score: number | null
          drive_updated_at: string | null
          email: string | null
          email_verified_at: string | null
          first_name: string | null
          free_intro_session_used_at: string | null
          full_name: string | null
          id: string
          last_name: string | null
          membership_renewal_at: string | null
          membership_started_at: string | null
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          mentor: Json | null
          name: string | null
          pillar_scores: Json | null
          pillars: Json | null
          preferred_lang: Database["public"]["Enums"]["lang_code"] | null
          profile_complete: boolean | null
          profiling_opt_out: boolean
          referral_code: string | null
          referred_by_code: string | null
          strongest_pillar: string | null
          updated_at: string
          user_id: string
          verification_required_until: string
          weakest_pillar: string | null
          welcome_email_sent_at: string | null
          ximatar: Database["public"]["Enums"]["ximatar_type"] | null
          ximatar_assigned_at: string | null
          ximatar_growth_path: string | null
          ximatar_id: string | null
          ximatar_image: string | null
          ximatar_name: string | null
          ximatar_storytelling: string | null
        }
        Insert: {
          account_status?: string
          avatar?: Json | null
          created_at?: string
          creation_source?: string | null
          cv_comments?: Json | null
          cv_scores?: Json | null
          drive_level?: string | null
          drive_score?: number | null
          drive_updated_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          free_intro_session_used_at?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          membership_renewal_at?: string | null
          membership_started_at?: string | null
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          mentor?: Json | null
          name?: string | null
          pillar_scores?: Json | null
          pillars?: Json | null
          preferred_lang?: Database["public"]["Enums"]["lang_code"] | null
          profile_complete?: boolean | null
          profiling_opt_out?: boolean
          referral_code?: string | null
          referred_by_code?: string | null
          strongest_pillar?: string | null
          updated_at?: string
          user_id: string
          verification_required_until?: string
          weakest_pillar?: string | null
          welcome_email_sent_at?: string | null
          ximatar?: Database["public"]["Enums"]["ximatar_type"] | null
          ximatar_assigned_at?: string | null
          ximatar_growth_path?: string | null
          ximatar_id?: string | null
          ximatar_image?: string | null
          ximatar_name?: string | null
          ximatar_storytelling?: string | null
        }
        Update: {
          account_status?: string
          avatar?: Json | null
          created_at?: string
          creation_source?: string | null
          cv_comments?: Json | null
          cv_scores?: Json | null
          drive_level?: string | null
          drive_score?: number | null
          drive_updated_at?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          free_intro_session_used_at?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          membership_renewal_at?: string | null
          membership_started_at?: string | null
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          mentor?: Json | null
          name?: string | null
          pillar_scores?: Json | null
          pillars?: Json | null
          preferred_lang?: Database["public"]["Enums"]["lang_code"] | null
          profile_complete?: boolean | null
          profiling_opt_out?: boolean
          referral_code?: string | null
          referred_by_code?: string | null
          strongest_pillar?: string | null
          updated_at?: string
          user_id?: string
          verification_required_until?: string
          weakest_pillar?: string | null
          welcome_email_sent_at?: string | null
          ximatar?: Database["public"]["Enums"]["ximatar_type"] | null
          ximatar_assigned_at?: string | null
          ximatar_growth_path?: string | null
          ximatar_id?: string | null
          ximatar_image?: string | null
          ximatar_name?: string | null
          ximatar_storytelling?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_ximatar_id_fkey"
            columns: ["ximatar_id"]
            isOneToOne: false
            referencedRelation: "ximatars"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          level: string | null
          pillar: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id: string
          level?: string | null
          pillar: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          level?: string | null
          pillar?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      question_localizations: {
        Row: {
          helper: string | null
          lang: string
          prompt: string
          question_id: string
        }
        Insert: {
          helper?: string | null
          lang: string
          prompt: string
          question_id: string
        }
        Update: {
          helper?: string | null
          lang?: string
          prompt?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_localizations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          invited_user_id: string
          inviter_user_id: string
          qualified_at: string | null
          referred_email: string | null
          rewarded_at: string | null
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          invited_user_id: string
          inviter_user_id: string
          qualified_at?: string | null
          referred_email?: string | null
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          invited_user_id?: string
          inviter_user_id?: string
          qualified_at?: string | null
          referred_email?: string | null
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      saved_opportunities: {
        Row: {
          company: string | null
          created_at: string
          id: string
          job_id: string
          location: string | null
          skills: string[] | null
          source_url: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          id?: string
          job_id: string
          location?: string | null
          skills?: string[] | null
          source_url?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: string
          job_id?: string
          location?: string | null
          skills?: string[] | null
          source_url?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          completed_at: string | null
          detail: Json | null
          id: string
          score_pct: number | null
          started_at: string | null
          test_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          detail?: Json | null
          id?: string
          score_pct?: number | null
          started_at?: string | null
          test_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          detail?: Json | null
          id?: string
          score_pct?: number | null
          started_at?: string | null
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tests: {
        Row: {
          devplan_item_id: string | null
          id: string
          level: string | null
          questions: Json
          time_limit_seconds: number | null
          title: string
        }
        Insert: {
          devplan_item_id?: string | null
          id?: string
          level?: string | null
          questions: Json
          time_limit_seconds?: number | null
          title: string
        }
        Update: {
          devplan_item_id?: string | null
          id?: string
          level?: string | null
          questions?: Json
          time_limit_seconds?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_devplan_item_id_fkey"
            columns: ["devplan_item_id"]
            isOneToOne: false
            referencedRelation: "devplan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: string
          consent_version: string
          consented_at: string
          created_at: string
          id: string
          ip_address: unknown
          locale: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          consent_version: string
          consented_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          locale?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          consent_version?: string
          consented_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          locale?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_job_links: {
        Row: {
          applied_at: string | null
          created_at: string
          id: string
          job_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          id?: string
          job_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding_state: {
        Row: {
          completed_steps: Json
          created_at: string
          dismissed_hints: Json
          first_login_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_steps?: Json
          created_at?: string
          dismissed_hints?: Json
          first_login_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_steps?: Json
          created_at?: string
          dismissed_hints?: Json
          first_login_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_opportunity_matches: {
        Row: {
          created_at: string | null
          match_score: number
          opportunity_id: string
          rationale: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          match_score: number
          opportunity_id: string
          rationale?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          match_score?: number
          opportunity_id?: string
          rationale?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_opportunity_matches_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_opportunity_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_opportunity_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_scores: {
        Row: {
          assessments_completed: number
          communication: number
          computational_power: number
          creativity: number
          drive: number
          knowledge: number
          match_quality_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assessments_completed?: number
          communication?: number
          computational_power?: number
          creativity?: number
          drive?: number
          knowledge?: number
          match_quality_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assessments_completed?: number
          communication?: number
          computational_power?: number
          creativity?: number
          drive?: number
          knowledge?: number
          match_quality_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ximatar_translations: {
        Row: {
          behavior: string | null
          core_traits: string
          ideal_roles: string | null
          lang: Database["public"]["Enums"]["lang_code"]
          title: string
          weaknesses: string | null
          ximatar_id: string
        }
        Insert: {
          behavior?: string | null
          core_traits: string
          ideal_roles?: string | null
          lang: Database["public"]["Enums"]["lang_code"]
          title: string
          weaknesses?: string | null
          ximatar_id: string
        }
        Update: {
          behavior?: string | null
          core_traits?: string
          ideal_roles?: string | null
          lang?: Database["public"]["Enums"]["lang_code"]
          title?: string
          weaknesses?: string | null
          ximatar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ximatar_translations_ximatar_id_fkey"
            columns: ["ximatar_id"]
            isOneToOne: false
            referencedRelation: "ximatars"
            referencedColumns: ["id"]
          },
        ]
      }
      ximatars: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          label: string
          updated_at: string
          vector: Json
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          label: string
          updated_at?: string
          vector?: Json
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          label?: string
          updated_at?: string
          vector?: Json
        }
        Relationships: []
      }
    }
    Views: {
      feed_reaction_counts: {
        Row: {
          count: number | null
          feed_item_id: string | null
          reaction_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors_public: {
        Row: {
          active_coached_profiles_count: number | null
          badges: string[] | null
          bio: string | null
          can_host_video_sessions: boolean | null
          first_session_expectations: string | null
          free_intro_duration_minutes: number | null
          free_intro_enabled: boolean | null
          id: string | null
          is_active: boolean | null
          languages: string[] | null
          linkedin_url: string | null
          location: string | null
          name: string | null
          paid_sessions_enabled: boolean | null
          profile_image_url: string | null
          rating: number | null
          specialties: string[] | null
          title: string | null
          total_coached_profiles_count: number | null
          updated_at: string | null
          xima_pillars: string[] | null
        }
        Insert: {
          active_coached_profiles_count?: number | null
          badges?: string[] | null
          bio?: string | null
          can_host_video_sessions?: boolean | null
          first_session_expectations?: string | null
          free_intro_duration_minutes?: number | null
          free_intro_enabled?: boolean | null
          id?: string | null
          is_active?: boolean | null
          languages?: string[] | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          paid_sessions_enabled?: boolean | null
          profile_image_url?: string | null
          rating?: number | null
          specialties?: string[] | null
          title?: string | null
          total_coached_profiles_count?: number | null
          updated_at?: string | null
          xima_pillars?: string[] | null
        }
        Update: {
          active_coached_profiles_count?: number | null
          badges?: string[] | null
          bio?: string | null
          can_host_video_sessions?: boolean | null
          first_session_expectations?: string | null
          free_intro_duration_minutes?: number | null
          free_intro_enabled?: boolean | null
          id?: string | null
          is_active?: boolean | null
          languages?: string[] | null
          linkedin_url?: string | null
          location?: string | null
          name?: string | null
          paid_sessions_enabled?: boolean | null
          profile_image_url?: string | null
          rating?: number | null
          specialties?: string[] | null
          title?: string | null
          total_coached_profiles_count?: number | null
          updated_at?: string | null
          xima_pillars?: string[] | null
        }
        Relationships: []
      }
      v_dashboard: {
        Row: {
          assessments_completed: number | null
          auth_user_id: string | null
          avatar_url: Json | null
          communication: number | null
          computational_power: number | null
          creativity: number | null
          drive: number | null
          email: string | null
          full_name: string | null
          knowledge: number | null
          match_quality_pct: number | null
          preferred_lang: Database["public"]["Enums"]["lang_code"] | null
          top_matches: Json | null
          user_id: string | null
          ximatar: Database["public"]["Enums"]["ximatar_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_interest: { Args: { p_interest_id: string }; Returns: Json }
      add_feed_reaction: {
        Args: {
          p_feed_item_id: string
          p_reaction_type: string
          p_reactor_type: string
        }
        Returns: boolean
      }
      admin_set_business_plan: {
        Args: {
          p_business_id: string
          p_contract_end?: string
          p_contract_start?: string
          p_features?: Json
          p_max_seats?: number
          p_notes?: string
          p_plan_tier: string
        }
        Returns: Json
      }
      apply_referral_on_signup: { Args: { invite_code: string }; Returns: Json }
      assign_role_to_user: {
        Args: {
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      assign_ximatar: {
        Args: { p_assessment: string; p_lang?: string; p_user: string }
        Returns: string
      }
      assign_ximatar_by_pillars: {
        Args: { p_result_id: string }
        Returns: undefined
      }
      candidate_accept_reschedule: {
        Args: { p_session_id: string }
        Returns: Json
      }
      candidate_cancel_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      candidate_reject_reschedule: {
        Args: { p_session_id: string }
        Returns: Json
      }
      candidate_selected_mentor_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      check_business_feature: {
        Args: { p_business_id: string; p_feature: string }
        Returns: boolean
      }
      check_verification_expiry: { Args: never; Returns: undefined }
      compute_drive_for_current_user: { Args: never; Returns: number }
      compute_drive_score: { Args: { p_user_id: string }; Returns: number }
      compute_pillar_scores_from_assessment:
        | { Args: { p_result_id: string }; Returns: undefined }
        | {
            Args: { p_mc_answers: Json; p_result_id: string }
            Returns: undefined
          }
      confirm_email_verification: { Args: never; Returns: undefined }
      consume_my_credits_for_standard_session: {
        Args: { p_session_id?: string; required_credits?: number }
        Returns: Json
      }
      create_chat_thread: {
        Args: {
          p_business_id?: string
          p_candidate_profile_id: string
          p_mentor_profile_id?: string
          p_thread_type: string
        }
        Returns: string
      }
      delete_user_account: { Args: { p_user_id: string }; Returns: Json }
      emit_audit_event: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_type: string
          p_attempt_id?: string
          p_correlation_id?: string
          p_entity_id?: string
          p_entity_type: string
          p_ip_hash?: string
          p_metadata?: Json
          p_user_agent_hash?: string
        }
        Returns: string
      }
      emit_feed_signal: {
        Args: {
          p_payload: Json
          p_source: string
          p_subject_ximatar_id: string
          p_type: string
          p_visibility?: Json
        }
        Returns: string
      }
      emit_interest_aggregated_signal: {
        Args: { p_count: number; p_ximatar_id: string }
        Returns: string
      }
      enqueue_email: {
        Args: {
          p_email_type: string
          p_html_body: string
          p_idempotency_key: string
          p_metadata?: Json
          p_recipient_email: string
          p_subject: string
        }
        Returns: string
      }
      ensure_mentor_thread: {
        Args: { p_mentor: string; p_user: string }
        Returns: string
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_candidate_invitations: {
        Args: { p_user_id: string }
        Returns: {
          business_id: string
          company_name: string
          created_at: string
          hiring_goal_id: string
          id: string
          invite_token: string
          role_title: string
          status: string
        }[]
      }
      get_candidate_visibility: {
        Args: never
        Returns: {
          communication: number
          computational_power: number
          computed_at: string
          creativity: number
          display_name: string
          drive: number
          evaluation_score: number
          knowledge: number
          pillar_average: number
          profile_id: string
          rank: number
          user_id: string
          ximatar: Database["public"]["Enums"]["ximatar_type"]
          ximatar_id: string
          ximatar_image: string
          ximatar_label: string
        }[]
      }
      get_feed_item_reactions: { Args: { item_id: string }; Returns: Json }
      get_interest_count_for_ximatar: {
        Args: { p_ximatar_id: string }
        Returns: number
      }
      get_membership_status: { Args: never; Returns: Json }
      get_my_credit_balance: { Args: never; Returns: number }
      get_next_feed_item: {
        Args: never
        Returns: {
          created_at: string
          id: string
          payload: Json
          priority: number
          source: string
          subject_ximatar_id: string
          type: string
        }[]
      }
      get_pending_interests: {
        Args: never
        Returns: {
          accepted: boolean
          business_name: string
          hiring_goal_title: string
          id: string
          interested_at: string
        }[]
      }
      get_profile_id_for_auth_user: {
        Args: { p_auth_uid: string }
        Returns: string
      }
      grant_interview_prep_if_3_challenges_completed: {
        Args: { p_business_id: string; p_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_metric: {
        Args: {
          p_date?: string
          p_increment?: number
          p_metadata?: Json
          p_metric_name: string
        }
        Returns: undefined
      }
      internal_log_activity: {
        Args: { p_action: string; p_context?: Json; p_user_id: string }
        Returns: string
      }
      is_email_verified: { Args: never; Returns: boolean }
      is_thread_participant: {
        Args: { p_thread_id: string; p_user_id: string }
        Returns: boolean
      }
      log_bot_event: {
        Args: {
          p_lang: Database["public"]["Enums"]["lang_code"]
          p_payload: Json
          p_route: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
      log_user_activity: {
        Args: { p_action: string; p_context?: Json }
        Returns: string
      }
      mentor_cancel_session: { Args: { p_session_id: string }; Returns: Json }
      mentor_complete_session: { Args: { p_session_id: string }; Returns: Json }
      mentor_confirm_session: { Args: { p_session_id: string }; Returns: Json }
      mentor_reject_session: { Args: { p_session_id: string }; Returns: Json }
      mentor_reschedule_session: {
        Args: {
          p_new_ends_at: string
          p_new_starts_at: string
          p_session_id: string
        }
        Returns: Json
      }
      ops_check_assessment_wow_drop: {
        Args: never
        Returns: {
          alert_fired: boolean
          drop_pct: number
          last_week: number
          this_week: number
          threshold: number
        }[]
      }
      ops_check_dead_letters_24h: {
        Args: never
        Returns: {
          alert_fired: boolean
          dead_letter_count: number
          threshold: number
        }[]
      }
      ops_check_scoring_error_rate_24h: {
        Args: never
        Returns: {
          alert_fired: boolean
          error_count: number
          error_rate: number
          threshold: number
          total_count: number
        }[]
      }
      qualify_referral_and_reward: {
        Args: { p_referred_user_id: string }
        Returns: Json
      }
      recompute_matches: { Args: { p_user: string }; Returns: undefined }
      recompute_user_scores: { Args: { p_user: string }; Returns: undefined }
      record_business_interest: {
        Args: { p_feed_item_id: string; p_hiring_goal_id?: string }
        Returns: string
      }
      request_free_intro_session: { Args: { p_slot_id: string }; Returns: Json }
      request_mentor_session: { Args: { p_slot_id: string }; Returns: Json }
    }
    Enums: {
      ai_message_role: "user" | "assistant" | "system" | "tool"
      app_role: "admin" | "user" | "business" | "operator"
      audience_type_enum: "candidate" | "business" | "mentor"
      lang_code: "it" | "en" | "es"
      membership_tier: "freemium" | "basic" | "premium" | "pro"
      thread_type_enum: "business_candidate" | "mentor_candidate"
      ximatar_type:
        | "lion"
        | "owl"
        | "dolphin"
        | "fox"
        | "bear"
        | "cat"
        | "bee"
        | "parrot"
        | "elephant"
        | "wolf"
        | "chameleon"
        | "horse"
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
      ai_message_role: ["user", "assistant", "system", "tool"],
      app_role: ["admin", "user", "business", "operator"],
      audience_type_enum: ["candidate", "business", "mentor"],
      lang_code: ["it", "en", "es"],
      membership_tier: ["freemium", "basic", "premium", "pro"],
      thread_type_enum: ["business_candidate", "mentor_candidate"],
      ximatar_type: [
        "lion",
        "owl",
        "dolphin",
        "fox",
        "bear",
        "cat",
        "bee",
        "parrot",
        "elephant",
        "wolf",
        "chameleon",
        "horse",
      ],
    },
  },
} as const
