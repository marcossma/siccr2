FROM node:20-alpine

# Instalar bash e curl (necessários para o entrypoint e healthcheck)
RUN apk add --no-cache bash curl

WORKDIR /app

# Copiar dependências primeiro para aproveitar o cache de camadas
COPY package*.json ./

RUN npm ci --omit=dev

# Copiar o restante do código
COPY . .

# Tornar o entrypoint executável
RUN chmod +x entrypoint.sh

EXPOSE 15000

ENTRYPOINT ["./entrypoint.sh"]
