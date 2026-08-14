-- A conta bdr@bcw.com.br não tinha papel nenhum em user_roles, então as
-- políticas que exigem admin (criar grupo, criar pasta dentro de um
-- grupo cujo dono não é ela, ver processos criados por outra pessoa)
-- bloqueavam tudo silenciosamente. Torna essa conta admin.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('bdr@bcw.com.br')
ON CONFLICT (user_id, role) DO NOTHING;
