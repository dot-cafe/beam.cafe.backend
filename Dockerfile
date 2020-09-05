FROM node:12.18.3-stretch

# Use app as working directory
WORKDIR /app

# Copy repository content
COPY . .

# Install dependencies and build backend
RUN npm install

# Open port 8080
EXPOSE 8080

# Start app
ENTRYPOINT npm run build && \
           node ./dist/src/app.js
