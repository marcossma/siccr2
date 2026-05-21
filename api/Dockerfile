FROM node:20-alpine

# Instalar bash e curl (necessários para o entrypoint e healthcheck)
RUN apk add --no-cache bash curl dos2unix

WORKDIR /app

# Copiar dependências primeiro para aproveitar o cache de camadas
COPY package*.json ./

# scripts/install-husky.js é chamado pelo "prepare" durante npm ci.
# Precisa estar presente antes — mas como ele sai cedo quando não há .git
# (caso do container), o efeito prático é zero em produção.
COPY scripts/ ./scripts/

RUN npm ci --omit=dev

# Copiar o restante do código
COPY . .

# Corrigir line endings (CRLF→LF) e tornar executável
# (também o entrypoint-dev usado em desenvolvimento via docker-compose.override.yml)
RUN dos2unix entrypoint.sh entrypoint-dev.sh && chmod +x entrypoint.sh entrypoint-dev.sh

EXPOSE 15000

ENTRYPOINT ["./entrypoint.sh"]
