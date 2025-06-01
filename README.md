# Sistema de Cobrança e Mensagens WhatsApp

Sistema completo de gerenciamento de cobranças com integração WhatsApp via Evolution API, agendamento de mensagens e interface de calendário.

## Funcionalidades

### 📋 Gestão de Cobranças
- Cadastro e gerenciamento de clientes
- Criação de cobranças com valores e vencimentos
- Tipos de cobrança personalizáveis
- Cobranças recorrentes (diário, semanal, mensal, anual)
- Status automático de vencimento

### 📅 Calendário
- Visualização de cobranças em formato calendário
- Interface similar ao Google Calendar
- Eventos automáticos baseados nas cobranças
- Navegação por mês/ano

### 💬 Sistema de Mensagens
- Integração com Evolution API para WhatsApp
- Agendamento de mensagens para data/hora específica
- Dispatcher automático de lembretes de cobrança
- Templates personalizáveis de mensagens
- Histórico completo de mensagens enviadas

### 🔧 Evolution API Manager
- Gerenciamento completo de instâncias WhatsApp
- Configuração de API global
- Status de conexão em tempo real
- QR Code para conexão
- Múltiplas instâncias por usuário

### 🔐 Autenticação
- Login via Replit Auth (OpenID Connect)
- Sistema multi-tenant (dados isolados por usuário)
- Sessões seguras

## Tecnologias

### Backend
- Node.js + Express.js
- TypeScript
- PostgreSQL com Drizzle ORM
- Evolution API para WhatsApp
- Sistema de agendamento com node-cron

### Frontend
- React.js + TypeScript
- Tailwind CSS
- Radix UI components
- TanStack Query para gerenciamento de estado
- Wouter para roteamento

## Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── lib/          # Utilitários e configurações
│   │   └── hooks/        # React hooks customizados
├── server/                # Backend Express
│   ├── db.ts             # Configuração do banco
│   ├── routes.ts         # Rotas da API
│   ├── storage.ts        # Camada de dados
│   ├── scheduler.ts      # Agendador de tarefas
│   ├── evolution-api.ts  # Cliente Evolution API
│   └── email-service.ts  # Serviço de email
├── shared/               # Código compartilhado
│   └── schema.ts        # Schema do banco de dados
└── package.json         # Dependências e scripts
```

## Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- Conta na Evolution API

### Configuração

1. Clone o repositório
```bash
git clone [url-do-repositorio]
cd sistema-cobranca
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
```bash
# Copie e configure o arquivo .env
DATABASE_URL=postgresql://user:password@localhost:5432/database
SESSION_SECRET=sua-chave-secreta-aqui
REPL_ID=seu-repl-id
ISSUER_URL=https://replit.com/oidc
REPLIT_DOMAINS=seu-dominio.com
```

4. Execute as migrações do banco
```bash
npm run db:push
```

5. Inicie o servidor
```bash
npm run dev
```

## Configuração da Evolution API

1. Acesse a seção "Evolution API" no sistema
2. Configure a URL base e chave global da API
3. Crie uma nova instância WhatsApp
4. Conecte usando o QR Code fornecido

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run db:push` - Aplica mudanças no schema do banco
- `npm run db:studio` - Abre interface visual do banco

## Deploy

### Opções de Deploy

1. **Replit Deployments** (Recomendado)
   - Deploy automático integrado
   - SSL/HTTPS configurado
   - Domínio customizável

2. **Vercel**
   - Conecte o repositório GitHub
   - Configure as variáveis de ambiente
   - Deploy automático

3. **Railway**
   - Suporte nativo a PostgreSQL
   - Deploy direto do GitHub
   - Configuração simples

4. **VPS/Servidor Próprio**
   - Instale Node.js e PostgreSQL
   - Configure Nginx como proxy reverso
   - Use PM2 para gerenciamento de processo

### Variáveis de Ambiente para Produção

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=chave-segura-producao
REPL_ID=seu-repl-id
REPLIT_DOMAINS=seudominio.com
NODE_ENV=production
```

## Uso do Sistema

### 1. Primeiro Acesso
- Faça login com sua conta Replit
- Configure a Evolution API com suas credenciais
- Crie sua primeira instância WhatsApp

### 2. Gerenciamento de Clientes
- Acesse "Clientes" para cadastrar novos clientes
- Adicione informações de contato e WhatsApp

### 3. Criação de Cobranças
- Em "Cobranças", crie novas cobranças
- Configure valores, vencimentos e recorrência
- Associe a um cliente existente

### 4. Envio de Mensagens
- Use "Mensagens" para enviar lembretes
- Selecione cobranças do sistema
- Agende envios para data/hora específica
- Acompanhe o histórico de mensagens

### 5. Visualização no Calendário
- Acesse "Calendário" para visão geral
- Veja todas as cobranças organizadas por data
- Navegue entre meses e anos

## Contribuição

Este é um projeto proprietário. Para sugestões ou melhorias, entre em contato.

## Licença

Todos os direitos reservados.