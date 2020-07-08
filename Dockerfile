FROM node:11
MAINTAINER Simon Reinisch <contact@reinisch.io>
# Use app as working directory
WORKDIR /app
# Copy repository content
COPY . .
# Update and upgrade system
RUN apt-get update && \
    apt-get upgrade -y
# Install pm2 as process manager, it'll restart the app in case of emergencies
RUN npm install pm2 -g
# Install and build backend
RUN npm install && \
    npm run build
# Open port 8080
EXPOSE 8080
# Use pm2 as entrypoint
ENTRYPOINT ["pm2", "start", "dist/src/app.js", "--name", "beam.cafe.backend", "--no-daemon"]






























