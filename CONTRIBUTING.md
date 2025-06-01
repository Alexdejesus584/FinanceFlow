# Guia de Contribuição

## Estrutura do Código

### Backend (server/)
- `db.ts` - Configuração do banco PostgreSQL com Drizzle
- `routes.ts` - Todas as rotas da API REST
- `storage.ts` - Camada de acesso aos dados (CRUD operations)
- `scheduler.ts` - Sistema de agendamento de tarefas (node-cron)
- `evolution-api.ts` - Cliente para integração WhatsApp
- `email-service.ts` - Serviço de notificações por email
- `replitAuth.ts` - Sistema de autenticação OpenID Connect

### Frontend (client/src/)
- `pages/` - Páginas principais da aplicação
- `components/` - Componentes reutilizáveis com Radix UI
- `hooks/` - React hooks customizados
- `lib/` - Utilitários e configurações

### Schema (shared/)
- `schema.ts` - Definições do banco de dados com Drizzle ORM

## Padrões de Desenvolvimento

### Backend
- Usar TypeScript strict mode
- Validação de dados com Zod
- Tratamento de erros consistente
- Logs detalhados para debugging
- Interface IStorage para abstração de dados

### Frontend
- Componentes funcionais com hooks
- TanStack Query para estado do servidor
- Tailwind CSS para estilização
- Formulários com react-hook-form + Zod
- Tratamento de loading/error states

### Banco de Dados
- Migrations com `npm run db:push`
- Relações explícitas no schema
- Índices para performance
- Soft deletes quando necessário

## Funcionalidades Principais

### Sistema de Cobranças
- CRUD completo de clientes e cobranças
- Suporte a recorrência (diário, semanal, mensal, anual)
- Cálculo automático de status (pendente, vencido, pago)
- Integração com calendário

### Mensageria WhatsApp
- Integração Evolution API para múltiplas instâncias
- Agendamento de mensagens para data/hora específica
- Templates dinâmicos com variáveis
- Dispatcher automático de lembretes
- Histórico completo de mensagens

### Agendador
- Jobs executados via node-cron
- Processamento de mensagens agendadas
- Geração de cobranças recorrentes
- Atualização de status vencidos
- Sincronização de status de instâncias

## Configuração de Desenvolvimento

### Variáveis de Ambiente
```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=dev-secret-key
REPL_ID=repl-id
REPLIT_DOMAINS=localhost:5000
```

### Scripts Úteis
```bash
npm run dev          # Desenvolvimento
npm run db:push      # Aplicar schema
npm run db:studio    # Interface visual do banco
```

## Fluxo de Dados

### Autenticação
1. Login via Replit Auth (OpenID Connect)
2. Sessão armazenada com express-session
3. Middleware `isAuthenticated` protege rotas
4. Dados isolados por `userId`

### Mensagens
1. Usuário cria/agenda mensagem
2. Salva no banco com status 'scheduled'
3. Scheduler executa a cada minuto
4. Processa mensagens com horário <= atual
5. Envia via Evolution API
6. Atualiza status para 'sent'

### Cobranças Recorrentes
1. Job executa diariamente (01:00)
2. Identifica cobranças recorrentes
3. Calcula próxima data de vencimento
4. Cria nova cobrança automaticamente
5. Atualiza calendário

## Debugging

### Logs Importantes
- `console.log('Processing scheduled messages...')` - Scheduler ativo
- `Evolution API Request:` - Chamadas para WhatsApp
- `Error sending billing notification:` - Falhas no envio

### Verificações Comuns
- Status de conexão das instâncias WhatsApp
- Formato correto do número de telefone
- Configuração das credenciais Evolution API
- Permissões de banco de dados

## Segurança

### Dados Sensíveis
- Nunca commitar credenciais reais
- Usar variáveis de ambiente
- Validar entrada do usuário
- Sanitizar queries SQL

### Multi-tenancy
- Todos os dados filtrados por `userId`
- Sessões isoladas por usuário
- Verificação de propriedade em updates/deletes

## Performance

### Banco de Dados
- Índices em colunas frequentemente consultadas
- Limit em queries de listagem
- Joins otimizados com leftJoin

### Frontend
- React Query para cache de dados
- Lazy loading de componentes
- Debounce em busca/filtros

## Testes

### Manualmente
- Testar fluxo completo de cobrança
- Verificar agendamento de mensagens
- Confirmar isolamento entre usuários
- Validar integração WhatsApp

### Cenários Críticos
- Envio de mensagem agendada
- Criação de cobrança recorrente
- Sincronização de status Evolution API
- Backup/restore de dados