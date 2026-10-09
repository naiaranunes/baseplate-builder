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
      api_keys_registry: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          service_name: string
          updated_at: string | null
          user_id: string
          vault_secret_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          service_name: string
          updated_at?: string | null
          user_id: string
          vault_secret_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          service_name?: string
          updated_at?: string | null
          user_id?: string
          vault_secret_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          evolution_base_url: string | null
          evolution_configured: boolean
          evolution_instance: string | null
          gsheets_configured: boolean
          gsheets_url: string | null
          id: number
          slack_alerts_enabled: boolean
          slack_desvio_threshold: number
          slack_resumo_semanal: boolean
          slack_webhook_configured: boolean
          updated_at: string
          whatsapp_alerts_enabled: boolean
          whatsapp_destino: string | null
          whatsapp_desvio_threshold: number
          whatsapp_resumo_semanal: boolean
        }
        Insert: {
          evolution_base_url?: string | null
          evolution_configured?: boolean
          evolution_instance?: string | null
          gsheets_configured?: boolean
          gsheets_url?: string | null
          id: number
          slack_alerts_enabled?: boolean
          slack_desvio_threshold?: number
          slack_resumo_semanal?: boolean
          slack_webhook_configured?: boolean
          updated_at?: string
          whatsapp_alerts_enabled?: boolean
          whatsapp_destino?: string | null
          whatsapp_desvio_threshold?: number
          whatsapp_resumo_semanal?: boolean
        }
        Update: {
          evolution_base_url?: string | null
          evolution_configured?: boolean
          evolution_instance?: string | null
          gsheets_configured?: boolean
          gsheets_url?: string | null
          id?: number
          slack_alerts_enabled?: boolean
          slack_desvio_threshold?: number
          slack_resumo_semanal?: boolean
          slack_webhook_configured?: boolean
          updated_at?: string
          whatsapp_alerts_enabled?: boolean
          whatsapp_destino?: string | null
          whatsapp_desvio_threshold?: number
          whatsapp_resumo_semanal?: boolean
        }
        Relationships: []
      }
      entrega_historico: {
        Row: {
          autor_id: string | null
          comentario: string | null
          created_at: string
          entrega_id: string
          id: string
          status_anterior: string | null
          status_novo: string | null
        }
        Insert: {
          autor_id?: string | null
          comentario?: string | null
          created_at?: string
          entrega_id: string
          id?: string
          status_anterior?: string | null
          status_novo?: string | null
        }
        Update: {
          autor_id?: string | null
          comentario?: string | null
          created_at?: string
          entrega_id?: string
          id?: string
          status_anterior?: string | null
          status_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrega_historico_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          created_at: string
          criado_por: string | null
          data_realizacao: string | null
          descricao: string | null
          id: string
          lider_id: string
          liderado_cadastro_id: string | null
          liderado_id: string | null
          observacao_realizacao: string | null
          periodicidade: string
          prazo: string
          prazo_hora: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data_realizacao?: string | null
          descricao?: string | null
          id?: string
          lider_id?: string
          liderado_cadastro_id?: string | null
          liderado_id?: string | null
          observacao_realizacao?: string | null
          periodicidade?: string
          prazo: string
          prazo_hora?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data_realizacao?: string | null
          descricao?: string | null
          id?: string
          lider_id?: string
          liderado_cadastro_id?: string | null
          liderado_id?: string | null
          observacao_realizacao?: string | null
          periodicidade?: string
          prazo?: string
          prazo_hora?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_liderado_cadastro_id_fkey"
            columns: ["liderado_cadastro_id"]
            isOneToOne: false
            referencedRelation: "liderados"
            referencedColumns: ["id"]
          },
        ]
      }
      liderados: {
        Row: {
          area: string | null
          ativo: boolean
          cargo: string | null
          created_at: string
          email: string | null
          gestor_id: string
          id: string
          nome: string
          usuario_id: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          area?: string | null
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string | null
          gestor_id?: string
          id?: string
          nome: string
          usuario_id?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          area?: string | null
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string | null
          gestor_id?: string
          id?: string
          nome?: string
          usuario_id?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      meta_comentarios: {
        Row: {
          autor_id: string | null
          conteudo: string
          created_at: string
          id: string
          meta_id: string
        }
        Insert: {
          autor_id?: string | null
          conteudo: string
          created_at?: string
          id?: string
          meta_id: string
        }
        Update: {
          autor_id?: string | null
          conteudo?: string
          created_at?: string
          id?: string
          meta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_comentarios_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_comentarios_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas_with_responsavel"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_lancamentos: {
        Row: {
          created_at: string
          data_lancamento: string
          id: string
          is_demo: boolean
          lancado_por: string | null
          meta_id: string
          observacao: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          data_lancamento: string
          id?: string
          is_demo?: boolean
          lancado_por?: string | null
          meta_id: string
          observacao?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          data_lancamento?: string
          id?: string
          is_demo?: boolean
          lancado_por?: string | null
          meta_id?: string
          observacao?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_lancamentos_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_lancamentos_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas_with_responsavel"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          area: string
          created_at: string
          criado_por: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: string
          is_demo: boolean
          is_inverse: boolean
          nome: string
          periodicidade: string
          responsavel_id: string | null
          status: string
          unidade: string
          updated_at: string
          valor_alvo: number
          valor_atual: number
        }
        Insert: {
          area: string
          created_at?: string
          criado_por?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: string
          is_demo?: boolean
          is_inverse?: boolean
          nome: string
          periodicidade: string
          responsavel_id?: string | null
          status?: string
          unidade: string
          updated_at?: string
          valor_alvo: number
          valor_atual?: number
        }
        Update: {
          area?: string
          created_at?: string
          criado_por?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: string
          is_demo?: boolean
          is_inverse?: boolean
          nome?: string
          periodicidade?: string
          responsavel_id?: string | null
          status?: string
          unidade?: string
          updated_at?: string
          valor_alvo?: number
          valor_atual?: number
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          ativo: boolean
          canal: string
          created_at: string
          criado_por: string | null
          descricao: string | null
          evento: string
          id: string
          is_custom: boolean
          mensagem_template: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          canal?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          evento: string
          id?: string
          is_custom?: boolean
          mensagem_template: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          canal?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          evento?: string
          id?: string
          is_custom?: boolean
          mensagem_template?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      plano_tarefas: {
        Row: {
          concluida: boolean
          created_at: string
          descricao: string
          id: string
          ordem: number
          plano_id: string
          prazo: string | null
          responsavel_id: string | null
        }
        Insert: {
          concluida?: boolean
          created_at?: string
          descricao: string
          id?: string
          ordem?: number
          plano_id: string
          prazo?: string | null
          responsavel_id?: string | null
        }
        Update: {
          concluida?: boolean
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          plano_id?: string
          prazo?: string | null
          responsavel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plano_tarefas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_acao"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_acao: {
        Row: {
          created_at: string
          criado_por: string | null
          id: string
          is_demo: boolean
          meta_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          id?: string
          is_demo?: boolean
          meta_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          id?: string
          is_demo?: boolean
          meta_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_acao_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_acao_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas_with_responsavel"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_approved: boolean
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          is_approved?: boolean
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_config: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
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
    }
    Views: {
      metas_with_responsavel: {
        Row: {
          area: string | null
          created_at: string | null
          criado_por: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string | null
          is_demo: boolean | null
          is_inverse: boolean | null
          nome: string | null
          periodicidade: string | null
          responsavel_avatar: string | null
          responsavel_email: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          unidade: string | null
          updated_at: string | null
          valor_alvo: number | null
          valor_atual: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: {
          p_is_active: boolean
          p_is_approved: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      calcular_status_meta: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_is_inverse?: boolean
          p_valor_alvo: number
          p_valor_atual: number
        }
        Returns: string
      }
      claim_my_liderado: { Args: never; Returns: boolean }
      e_meu_cadastro: { Args: { _lid: string }; Returns: boolean }
      ensure_auth_trigger: { Args: never; Returns: Json }
      gerencia_liderado: { Args: { _lid: string }; Returns: boolean }
      get_handle_new_user_def: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_member: { Args: never; Returns: boolean }
      list_leaders: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      list_members: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      pode_ver_entrega: {
        Args: { _criador: string; _lid: string; _lider: string }
        Returns: boolean
      }
      read_vault_secret: { Args: { p_key: string }; Returns: string }
      registrar_realizacao_entrega: {
        Args: { p_data: string; p_entrega_id: string; p_observacao?: string }
        Returns: string
      }
      store_vault_secret: {
        Args: { p_key: string; p_value: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "agent"
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
      app_role: ["admin", "supervisor", "agent"],
    },
  },
} as const
