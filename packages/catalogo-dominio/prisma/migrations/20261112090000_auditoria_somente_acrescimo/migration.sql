-- Auditoria só aceita acréscimo pelo painel (revisão da etapa 1, S1).
-- Expurgos por prazo (RegistroAcesso 180 dias, IP 30 dias) rodam com o papel dono.
REVOKE UPDATE, DELETE, TRUNCATE ON "Alteracao", "RegistroAcesso" FROM catalogo_painel;

-- O painel não mexe no controle de migrações.
REVOKE ALL ON "_prisma_migrations" FROM catalogo_painel;
