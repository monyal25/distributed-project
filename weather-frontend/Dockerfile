# Dockerfile for frontend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Add environment variable inside Docker container
ARG REACT_APP_WEBSOCKET_URL
ENV REACT_APP_WEBSOCKET_URL=${REACT_APP_WEBSOCKET_URL}

RUN npm run build

CMD ["npm", "start"]
