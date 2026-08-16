export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      grupos: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          nome: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          nome: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          nome?: string;
        };
        Relationships: [];
      };
      pastas: {
        Row: {
          created_at: string;
          created_by: string | null;
          grupo_id: string;
          id: string;
          nome: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          grupo_id: string;
          id?: string;
          nome: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          grupo_id?: string;
          id?: string;
          nome?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pastas_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
      pasta_membros: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          pasta_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          pasta_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          pasta_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pasta_membros_pasta_id_fkey";
            columns: ["pasta_id"];
            isOneToOne: false;
            referencedRelation: "pastas";
            referencedColumns: ["id"];
          },
        ];
      };
      grupo_membros: {
        Row: {
          created_at: string;
          created_by: string | null;
          grupo_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          grupo_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          grupo_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grupo_membros_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
      convites_grupo: {
        Row: {
          created_at: string;
          created_by: string | null;
          email: string;
          grupo_id: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          email: string;
          grupo_id: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          email?: string;
          grupo_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "convites_grupo_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
      documentos: {
        Row: {
          caminho: string;
          created_at: string;
          created_by: string | null;
          id: string;
          nome_arquivo: string;
          processo_id: string;
          tamanho: number | null;
          tipo: string | null;
        };
        Insert: {
          caminho: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          nome_arquivo: string;
          processo_id: string;
          tamanho?: number | null;
          tipo?: string | null;
        };
        Update: {
          caminho?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          nome_arquivo?: string;
          processo_id?: string;
          tamanho?: number | null;
          tipo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documentos_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      movimentacoes: {
        Row: {
          concluida: boolean;
          created_at: string;
          created_by: string | null;
          data_movimentacao: string;
          descricao: string;
          exige_acao: boolean;
          fonte: string;
          id: string;
          id_externo: string | null;
          observacao: string | null;
          prazo: string | null;
          processo_id: string;
          tipo: string | null;
          updated_at: string;
          validado: boolean;
          validado_em: string | null;
          validado_por: string | null;
        };
        Insert: {
          concluida?: boolean;
          created_at?: string;
          created_by?: string | null;
          data_movimentacao?: string;
          descricao: string;
          exige_acao?: boolean;
          fonte?: string;
          id?: string;
          id_externo?: string | null;
          observacao?: string | null;
          prazo?: string | null;
          processo_id: string;
          tipo?: string | null;
          updated_at?: string;
          validado?: boolean;
          validado_em?: string | null;
          validado_por?: string | null;
        };
        Update: {
          concluida?: boolean;
          created_at?: string;
          created_by?: string | null;
          data_movimentacao?: string;
          descricao?: string;
          exige_acao?: boolean;
          fonte?: string;
          id?: string;
          id_externo?: string | null;
          observacao?: string | null;
          prazo?: string | null;
          processo_id?: string;
          tipo?: string | null;
          updated_at?: string;
          validado?: boolean;
          validado_em?: string | null;
          validado_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "movimentacoes_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_acessos: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          processo_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          processo_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          processo_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_acessos_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_citacoes: {
        Row: {
          conferido: boolean;
          conferido_em: string | null;
          conferido_por: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          origem: string | null;
          processo_id: string;
          ultimo_andamento: string | null;
          ultimo_andamento_em: string | null;
          updated_at: string;
        };
        Insert: {
          conferido?: boolean;
          conferido_em?: string | null;
          conferido_por?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          origem?: string | null;
          processo_id: string;
          ultimo_andamento?: string | null;
          ultimo_andamento_em?: string | null;
          updated_at?: string;
        };
        Update: {
          conferido?: boolean;
          conferido_em?: string | null;
          conferido_por?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          origem?: string | null;
          processo_id?: string;
          ultimo_andamento?: string | null;
          ultimo_andamento_em?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_citacoes_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: true;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processos_historico: {
        Row: {
          alterado_em: string;
          alterado_por: string | null;
          campo: string;
          id: string;
          processo_id: string;
          valor_antigo: string | null;
          valor_novo: string | null;
        };
        Insert: {
          alterado_em?: string;
          alterado_por?: string | null;
          campo: string;
          id?: string;
          processo_id: string;
          valor_antigo?: string | null;
          valor_novo?: string | null;
        };
        Update: {
          alterado_em?: string;
          alterado_por?: string | null;
          campo?: string;
          id?: string;
          processo_id?: string;
          valor_antigo?: string | null;
          valor_novo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "processos_historico_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processos_relacionados: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          observacao: string | null;
          processo_id: string;
          relacionado_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          observacao?: string | null;
          processo_id: string;
          relacionado_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          observacao?: string | null;
          processo_id?: string;
          relacionado_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processos_relacionados_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processos_relacionados_relacionado_id_fkey";
            columns: ["relacionado_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processos: {
        Row: {
          autor: string | null;
          carteira: string | null;
          classe: string | null;
          cliente: string;
          comarca: string | null;
          coordenador: string | null;
          created_at: string;
          created_by: string | null;
          criticidade: string | null;
          decisoes_no_ld: boolean;
          fase: string | null;
          fonte: string;
          id: string;
          id_externo: string | null;
          monitorar: boolean;
          numero_antigo: string | null;
          numero_cliente: string | null;
          numero_cnj: string;
          numero_interno: string | null;
          observacao_encerramento: string | null;
          observacoes: string | null;
          parte_contraria: string | null;
          pasta_id: string | null;
          processo_pai_id: string | null;
          pronto_para_encerrar: boolean;
          provedor_externo: string | null;
          responsavel: string | null;
          reu: string | null;
          sincronizado_em: string | null;
          sistema: string | null;
          socio: string | null;
          status: string;
          tipo_desdobramento: string | null;
          tribunal: string | null;
          uf: string | null;
          ultima_verificacao_em: string | null;
          updated_at: string;
          valor_causa: number | null;
          valor_encerramento: number | null;
          vara: string | null;
        };
        Insert: {
          autor?: string | null;
          carteira?: string | null;
          classe?: string | null;
          cliente: string;
          comarca?: string | null;
          coordenador?: string | null;
          created_at?: string;
          created_by?: string | null;
          criticidade?: string | null;
          decisoes_no_ld?: boolean;
          fase?: string | null;
          fonte?: string;
          id?: string;
          id_externo?: string | null;
          monitorar?: boolean;
          numero_antigo?: string | null;
          numero_cliente?: string | null;
          numero_cnj: string;
          numero_interno?: string | null;
          observacao_encerramento?: string | null;
          observacoes?: string | null;
          parte_contraria?: string | null;
          pasta_id?: string | null;
          processo_pai_id?: string | null;
          pronto_para_encerrar?: boolean;
          provedor_externo?: string | null;
          responsavel?: string | null;
          reu?: string | null;
          sincronizado_em?: string | null;
          sistema?: string | null;
          socio?: string | null;
          status?: string;
          tipo_desdobramento?: string | null;
          tribunal?: string | null;
          uf?: string | null;
          ultima_verificacao_em?: string | null;
          updated_at?: string;
          valor_causa?: number | null;
          valor_encerramento?: number | null;
          vara?: string | null;
        };
        Update: {
          autor?: string | null;
          carteira?: string | null;
          classe?: string | null;
          cliente?: string;
          comarca?: string | null;
          coordenador?: string | null;
          created_at?: string;
          created_by?: string | null;
          criticidade?: string | null;
          decisoes_no_ld?: boolean;
          fase?: string | null;
          fonte?: string;
          id?: string;
          id_externo?: string | null;
          monitorar?: boolean;
          numero_antigo?: string | null;
          numero_cliente?: string | null;
          numero_cnj?: string;
          numero_interno?: string | null;
          observacao_encerramento?: string | null;
          observacoes?: string | null;
          parte_contraria?: string | null;
          pasta_id?: string | null;
          processo_pai_id?: string | null;
          pronto_para_encerrar?: boolean;
          provedor_externo?: string | null;
          responsavel?: string | null;
          reu?: string | null;
          sincronizado_em?: string | null;
          sistema?: string | null;
          socio?: string | null;
          status?: string;
          tipo_desdobramento?: string | null;
          tribunal?: string | null;
          uf?: string | null;
          ultima_verificacao_em?: string | null;
          updated_at?: string;
          valor_causa?: number | null;
          valor_encerramento?: number | null;
          vara?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "processos_pasta_id_fkey";
            columns: ["pasta_id"];
            isOneToOne: false;
            referencedRelation: "pastas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processos_processo_pai_id_fkey";
            columns: ["processo_pai_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          cargo: string | null;
          created_at: string;
          email: string | null;
          id: string;
          nome: string | null;
          sigla: string | null;
          updated_at: string;
        };
        Insert: {
          cargo?: string | null;
          created_at?: string;
          email?: string | null;
          id: string;
          nome?: string | null;
          sigla?: string | null;
          updated_at?: string;
        };
        Update: {
          cargo?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          nome?: string | null;
          sigla?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      verificacoes: {
        Row: {
          created_at: string;
          executado_em: string;
          executado_por: string | null;
          id: string;
          periodo_fim: string;
          periodo_inicio: string | null;
          tipo: string;
          total_movimentacoes: number;
        };
        Insert: {
          created_at?: string;
          executado_em?: string;
          executado_por?: string | null;
          id?: string;
          periodo_fim?: string;
          periodo_inicio?: string | null;
          tipo?: string;
          total_movimentacoes?: number;
        };
        Update: {
          created_at?: string;
          executado_em?: string;
          executado_por?: string | null;
          id?: string;
          periodo_fim?: string;
          periodo_inicio?: string | null;
          tipo?: string;
          total_movimentacoes?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      adicionar_membro_grupo: {
        Args: { _email: string; _grupo_id: string };
        Returns: { id: string; pendente: boolean }[];
      };
      adicionar_membro_pasta: {
        Args: { _email: string; _pasta_id: string };
        Returns: string;
      };
      compartilhar_processo: {
        Args: { _email: string; _processo_id: string };
        Returns: string;
      };
      fundir_processos: {
        Args: { _mantido_id: string; _removido_id: string };
        Returns: undefined;
      };
      e_dono_grupo: { Args: { _grupo_id: string }; Returns: boolean };
      e_dono_pasta: { Args: { _pasta_id: string }; Returns: boolean };
      e_dono_processo: { Args: { _processo_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      listar_acessos_processo: {
        Args: { _processo_id: string };
        Returns: {
          acesso_id: string;
          created_at: string;
          email: string;
          nome: string;
          user_id: string;
        }[];
      };
      listar_convites_grupo: {
        Args: { _grupo_id: string };
        Returns: { created_at: string; email: string; id: string }[];
      };
      listar_membros_grupo: {
        Args: { _grupo_id: string };
        Returns: {
          created_at: string;
          email: string;
          membro_id: string;
          nome: string;
          user_id: string;
        }[];
      };
      listar_membros_pasta: {
        Args: { _pasta_id: string };
        Returns: {
          created_at: string;
          email: string;
          membro_id: string;
          nome: string;
          user_id: string;
        }[];
      };
      membro_do_grupo: { Args: { _grupo_id: string }; Returns: boolean };
      membro_do_grupo_do_processo: {
        Args: { _processo_id: string };
        Returns: boolean;
      };
      pode_acessar_processo: {
        Args: { _processo_id: string };
        Returns: boolean;
      };
      pode_visualizar_processo: {
        Args: { _processo_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "member";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const;
