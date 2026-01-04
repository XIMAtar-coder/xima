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
          created_at: string | null
          deadline: string | null
          description: string | null
          difficulty: number | null
          end_at: string | null
          hiring_goal_id: string | null
          id: string
          is_public: boolean | null
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
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          difficulty?: number | null
          end_at?: string | null
          hiring_goal_id?: string | null
          id?: string
          is_public?: boolean | null
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
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          difficulty?: number | null
          end_at?: string | null
          hiring_goal_id?: string | null
          id?: string
          is_public?: boolean | null
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
          created_at: string | null
          created_by: string
          id: string
          is_group: boolean
          topic: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_group?: boolean
          topic?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_group?: boolean
          topic?: string | null
        }
        Relationships: [
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
      company_profiles: {
        Row: {
          communication_style: string | null
          company_id: string
          created_at: string | null
          id: string
          ideal_traits: string[] | null
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
      mentor_availability_slots: {
        Row: {
          booked_by: string | null
          booking_id: string | null
          created_at: string | null
          end_time: string
          id: string
          is_booked: boolean | null
          mentor_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          booked_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          is_booked?: boolean | null
          mentor_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          booked_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          is_booked?: boolean | null
          mentor_id?: string
          start_time?: string
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
          avatar: Json | null
          created_at: string
          creation_source: string | null
          cv_comments: Json | null
          cv_scores: Json | null
          drive_level: string | null
          email: string | null
          full_name: string | null
          id: string
          mentor: Json | null
          name: string | null
          pillar_scores: Json | null
          pillars: Json | null
          preferred_lang: Database["public"]["Enums"]["lang_code"] | null
          profile_complete: boolean | null
          strongest_pillar: string | null
          updated_at: string
          user_id: string
          weakest_pillar: string | null
          ximatar: Database["public"]["Enums"]["ximatar_type"] | null
          ximatar_assigned_at: string | null
          ximatar_growth_path: string | null
          ximatar_id: string | null
          ximatar_image: string | null
          ximatar_name: string | null
          ximatar_storytelling: string | null
        }
        Insert: {
          avatar?: Json | null
          created_at?: string
          creation_source?: string | null
          cv_comments?: Json | null
          cv_scores?: Json | null
          drive_level?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          mentor?: Json | null
          name?: string | null
          pillar_scores?: Json | null
          pillars?: Json | null
          preferred_lang?: Database["public"]["Enums"]["lang_code"] | null
          profile_complete?: boolean | null
          strongest_pillar?: string | null
          updated_at?: string
          user_id: string
          weakest_pillar?: string | null
          ximatar?: Database["public"]["Enums"]["ximatar_type"] | null
          ximatar_assigned_at?: string | null
          ximatar_growth_path?: string | null
          ximatar_id?: string | null
          ximatar_image?: string | null
          ximatar_name?: string | null
          ximatar_storytelling?: string | null
        }
        Update: {
          avatar?: Json | null
          created_at?: string
          creation_source?: string | null
          cv_comments?: Json | null
          cv_scores?: Json | null
          drive_level?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          mentor?: Json | null
          name?: string | null
          pillar_scores?: Json | null
          pillars?: Json | null
          preferred_lang?: Database["public"]["Enums"]["lang_code"] | null
          profile_complete?: boolean | null
          strongest_pillar?: string | null
          updated_at?: string
          user_id?: string
          weakest_pillar?: string | null
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
      assign_first_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
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
      compute_pillar_scores_from_assessment:
        | { Args: { p_result_id: string }; Returns: undefined }
        | {
            Args: { p_mc_answers: Json; p_result_id: string }
            Returns: undefined
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
      get_profile_id_for_auth_user: {
        Args: { p_auth_uid: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      internal_log_activity: {
        Args: { p_action: string; p_context?: Json; p_user_id: string }
        Returns: string
      }
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
      recompute_matches: { Args: { p_user: string }; Returns: undefined }
      recompute_user_scores: { Args: { p_user: string }; Returns: undefined }
    }
    Enums: {
      ai_message_role: "user" | "assistant" | "system" | "tool"
      app_role: "admin" | "user" | "business" | "operator"
      lang_code: "it" | "en" | "es"
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
      lang_code: ["it", "en", "es"],
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
