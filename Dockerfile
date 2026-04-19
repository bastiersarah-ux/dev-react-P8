FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Dossiers persistants montés en volume
RUN mkdir -p data public/uploads

EXPOSE 3000

CMD ["node", "./bin/www"]
