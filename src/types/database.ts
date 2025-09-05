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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          company_name: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          company_name?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          bathrooms: number
          bedrooms: number
          city: string
          created_at: string | null
          embedding: string | null
          furnished: boolean | null
          id: string
          lat: number | null
          link: string | null
          lng: number | null
          neighborhood: string | null
          parking_spaces: number
          price: number
          property_id: string | null
          rental_type: Database["public"]["Enums"]["rental_type"] | null
          size: number
          state: string
          street: string
          type: string
          updated_at: string | null
          usage: Database["public"]["Enums"]["usage"] | null
        }
        Insert: {
          bathrooms: number
          bedrooms: number
          city: string
          created_at?: string | null
          embedding?: string | null
          furnished?: boolean | null
          id?: string
          lat?: number | null
          link?: string | null
          lng?: number | null
          neighborhood?: string | null
          parking_spaces: number
          price: number
          property_id?: string | null
          rental_type?: Database["public"]["Enums"]["rental_type"] | null
          size: number
          state: string
          street: string
          type: string
          updated_at?: string | null
          usage?: Database["public"]["Enums"]["usage"] | null
        }
        Update: {
          bathrooms?: number
          bedrooms?: number
          city?: string
          created_at?: string | null
          embedding?: string | null
          furnished?: boolean | null
          id?: string
          lat?: number | null
          link?: string | null
          lng?: number | null
          neighborhood?: string | null
          parking_spaces?: number
          price?: number
          property_id?: string | null
          rental_type?: Database["public"]["Enums"]["rental_type"] | null
          size?: number
          state?: string
          street?: string
          type?: string
          updated_at?: string | null
          usage?: Database["public"]["Enums"]["usage"] | null
        }
        Relationships: []
      }
      property_evaluations: {
        Row: {
          address: string
          area_sqm: number
          bathrooms: number
          bedrooms: number
          created_at: string
          estimated_value: number | null
          id: string
          latitude: number | null
          longitude: number | null
          parking_spaces: number
          property_type: string
          similar_properties: Json | null
          user_id: string
          value_range_max: number | null
          value_range_min: number | null
        }
        Insert: {
          address: string
          area_sqm: number
          bathrooms: number
          bedrooms: number
          created_at?: string
          estimated_value?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          parking_spaces: number
          property_type: string
          similar_properties?: Json | null
          user_id: string
          value_range_max?: number | null
          value_range_min?: number | null
        }
        Update: {
          address?: string
          area_sqm?: number
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          estimated_value?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          parking_spaces?: number
          property_type?: string
          similar_properties?: Json | null
          user_id?: string
          value_range_max?: number | null
          value_range_min?: number | null
        }
        Relationships: []
      }
      property_market_cache: {
        Row: {
          city_stats: Json
          created_at: string | null
          id: string
          neighbourhood_stats: Json
          state_stats: Json
          updated_at: string | null
          zipcode: string
          zipcode_stats: Json
        }
        Insert: {
          city_stats: Json
          created_at?: string | null
          id?: string
          neighbourhood_stats: Json
          state_stats: Json
          updated_at?: string | null
          zipcode: string
          zipcode_stats: Json
        }
        Update: {
          city_stats?: Json
          created_at?: string | null
          id?: string
          neighbourhood_stats?: Json
          state_stats?: Json
          updated_at?: string | null
          zipcode?: string
          zipcode_stats?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cube: {
        Args: { "": number[] } | { "": number }
        Returns: unknown
      }
      cube_dim: {
        Args: { "": unknown }
        Returns: number
      }
      cube_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      cube_is_point: {
        Args: { "": unknown }
        Returns: boolean
      }
      cube_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      cube_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      cube_send: {
        Args: { "": unknown }
        Returns: string
      }
      cube_size: {
        Args: { "": unknown }
        Returns: number
      }
      earth: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      gc_to_sec: {
        Args: { "": number }
        Returns: number
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      latitude: {
        Args: { "": unknown }
        Returns: number
      }
      longitude: {
        Args: { "": unknown }
        Returns: number
      }
      match_properties_hybrid: {
        Args: {
          embedding_weight?: number
          filter_rental_type?: Database["public"]["Enums"]["rental_type"]
          filter_type?: string
          filter_usage?: Database["public"]["Enums"]["usage"]
          geo_weight?: number
          match_count?: number
          query_embedding: string
          radius_km?: number
          user_lat: number
          user_lng: number
        }
        Returns: {
          bathrooms: number
          bedrooms: number
          city: string
          distance_km: number
          embedding_score: number
          furnished: boolean
          hybrid_score: number
          id: string
          link: string
          neighborhood: string
          parking_spaces: number
          price: number
          property_id: string
          rental_type: Database["public"]["Enums"]["rental_type"]
          size: number
          state: string
          street: string
          type: string
          usage: Database["public"]["Enums"]["usage"]
        }[]
      }
      match_properties_structured: {
        Args: {
          avg_region_price?: number
          bathrooms_tolerance?: number
          bedrooms_tolerance?: number
          match_count?: number
          max_price_deviation?: number
          parking_tolerance?: number
          radius_km?: number
          size_tolerance_percent?: number
          user_bathrooms: number
          user_bedrooms: number
          user_furnished?: boolean
          user_lat: number
          user_lng: number
          user_parking_spaces: number
          user_rental_type?: Database["public"]["Enums"]["rental_type"]
          user_size: number
          user_type: string
          user_usage: Database["public"]["Enums"]["usage"]
        }
        Returns: {
          bathrooms: number
          bedrooms: number
          city: string
          distance_km: number
          furnished: boolean
          id: string
          link: string
          neighborhood: string
          parking_spaces: number
          price: number
          property_id: string
          rental_type: Database["public"]["Enums"]["rental_type"]
          size: number
          state: string
          street: string
          type: string
          usage: Database["public"]["Enums"]["usage"]
        }[]
      }
      sec_to_gc: {
        Args: { "": number }
        Returns: number
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      rental_type: "mensal" | "diario"
      usage: "venda" | "aluguel"
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
      rental_type: ["mensal", "diario"],
      usage: ["venda", "aluguel"],
    },
  },
} as const
