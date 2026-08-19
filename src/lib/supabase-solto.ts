import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

// Mesmo cliente do banco, só que sem os tipos gerados. Serve para as
// tabelas/colunas que já existem no projeto mas ainda não apareceram no
// arquivo de tipos gerado (ex.: documentos, validado_por/validado_em) —
// assim o typecheck passa sem mudar nada do comportamento.
export const supabaseSolto = supabase as unknown as SupabaseClient;
