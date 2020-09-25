FROM node:12-alpine
LABEL maintainer="Simon Reinisch <contact@reinisch.io>"

# Use app as working directory
WORKDIR /app

# Copy repository content
COPY . .

# Install dependencies
RUN npm install

# Open port 8080
EXPOSE 8080

# Install and start
ENTRYPOINT cp /config/backend.json config/production.json && \
           npm run build && \
           node dist/src/app.js
