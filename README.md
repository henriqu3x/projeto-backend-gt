# Project Root API

API REST para usuários, categorias e produtos, com autenticação JWT.

## Setup

### Requisitos
- Node.js 18+
- MySQL 8+

### 1) Instalar dependências
```bash
npm install
```

### 2) Configurar ambiente
Crie o `.env` a partir do `.env.example` e preencha com suas credenciais:
```bash
cp .env.example .env
```

Exemplo mínimo:
```
PORT=3000
APP_URL=http://localhost:3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=project_root
DB_USER=root
DB_PASSWORD=senha
JWT_SECRET=troque-esta-chave
JWT_EXPIRES_IN=1d
```

### 3) Criar o banco
```sql
CREATE DATABASE project_root;
```

### 4) Rodar a API
```bash
npm run dev
```

Na primeira inicialização o Sequelize cria as tabelas automaticamente.

## Documentação (Swagger)
- UI: `http://localhost:3000/docs`
- JSON: `http://localhost:3000/docs.json`

## Autenticação
Endpoints `POST`, `PUT` e `DELETE` (exceto `/v1/user` e `/v1/user/token`) exigem:
```
Authorization: Bearer <JWT>
```

## Endpoints principais
- Usuários: `/v1/user`, `/v1/user/{id}`, `/v1/user/token`
- Categorias: `/v1/category`, `/v1/category/{id}`, `/v1/category/search`
- Produtos: `/v1/product`, `/v1/product/{id}`, `/v1/product/search`