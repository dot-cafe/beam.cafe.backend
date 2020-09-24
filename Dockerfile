FROM node:11

# Use app as working directory
WORKDIR /app

# Copy repository content
COPY . .

# Open port 8080
EXPOSE 8080

# Install and start
ENTRYPOINT cp /config/backend.json config/production.json
           npm install && \
           npm run build && \
           node dist/src/app.js
