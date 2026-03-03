FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN chmod +x .docker/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["sh", ".docker/entrypoint.sh"]
