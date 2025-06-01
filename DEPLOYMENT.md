# Guia de Deploy

## Opções de Hospedagem

### 1. Replit Deployments (Mais Simples)
- Clique no botão "Deploy" no Replit
- Configure domínio personalizado se desejar
- SSL automático incluído

### 2. Vercel + PlanetScale/Neon
```bash
# 1. Conecte seu repositório GitHub ao Vercel
# 2. Configure as variáveis de ambiente:
DATABASE_URL=postgresql://...
SESSION_SECRET=sua-chave-aqui
REPL_ID=seu-repl-id
REPLIT_DOMAINS=seudominio.com
```

### 3. Railway
```bash
# 1. Conecte repositório GitHub
# 2. Adicione PostgreSQL addon
# 3. Configure variáveis automáticas
```

### 4. VPS (DigitalOcean, Linode, etc.)

#### Preparação do Servidor
```bash
# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx
sudo apt-get install nginx
```

#### Deploy da Aplicação
```bash
# 1. Clone o repositório
git clone https://github.com/seuusuario/seu-repo.git
cd seu-repo

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# 4. Execute migrações
npm run db:push

# 5. Build da aplicação
npm run build

# 6. Inicie com PM2
pm2 start npm --name "sistema-cobranca" -- run start
pm2 save
pm2 startup
```

#### Configuração do Nginx
```nginx
# /etc/nginx/sites-available/seudominio.com
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/seudominio.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Configurar SSL com Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

### 5. Hostinger VPS

Se você tem VPS na Hostinger:

```bash
# 1. Acesse via SSH
ssh root@seu-ip-vps

# 2. Siga os mesmos passos do VPS acima
# 3. Configure DNS no painel da Hostinger para apontar para o IP do VPS
```

## Configuração do Banco de Dados

### PostgreSQL Local (VPS)
```bash
# 1. Criar usuário e banco
sudo -u postgres psql
CREATE USER sistema_user WITH PASSWORD 'senha_segura';
CREATE DATABASE sistema_cobranca OWNER sistema_user;
GRANT ALL PRIVILEGES ON DATABASE sistema_cobranca TO sistema_user;
\q

# 2. Configurar DATABASE_URL
DATABASE_URL=postgresql://sistema_user:senha_segura@localhost:5432/sistema_cobranca
```

### PostgreSQL na Nuvem
- **Neon** (Recomendado): Gratuito até 500MB
- **PlanetScale**: MySQL compatível
- **ElephantSQL**: PostgreSQL gratuito até 20MB
- **Amazon RDS**: Pago mas robusto

## Migração de Dados

### Exportar dados do Replit
```bash
# No terminal do Replit
pg_dump $DATABASE_URL > backup.sql
```

### Importar no novo banco
```bash
# No servidor de destino
psql $DATABASE_URL < backup.sql
```

## Checklist Pré-Deploy

- [ ] Configurar todas as variáveis de ambiente
- [ ] Testar conexão com banco de dados
- [ ] Verificar credenciais da Evolution API
- [ ] Configurar domínio e DNS
- [ ] Testar SSL/HTTPS
- [ ] Configurar backup automático do banco
- [ ] Testar agendamento de mensagens
- [ ] Verificar logs de erro

## Monitoramento

### Logs
```bash
# Logs do PM2
pm2 logs sistema-cobranca

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Automático
```bash
# Adicionar ao crontab
0 2 * * * pg_dump $DATABASE_URL > /backup/backup_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verificar DATABASE_URL
   - Testar conectividade: `psql $DATABASE_URL`

2. **Erro 502 Bad Gateway**
   - Verificar se aplicação está rodando: `pm2 status`
   - Verificar logs: `pm2 logs`

3. **Mensagens não enviando**
   - Verificar credenciais Evolution API
   - Testar conectividade com API externa

4. **Problemas de SSL**
   - Renovar certificado: `sudo certbot renew`
   - Verificar configuração Nginx

### Comandos Úteis
```bash
# Reiniciar aplicação
pm2 restart sistema-cobranca

# Atualizar código
git pull origin main
npm install
npm run build
pm2 restart sistema-cobranca

# Verificar status
pm2 status
systemctl status nginx
systemctl status postgresql
```