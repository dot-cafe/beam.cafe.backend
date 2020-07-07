FROM node:alpine3.11 as build-stage
MAINTAINER Simon Reinisch <contact@reinisch.io>

# Create app directory
WORKDIR /backend

# Copy the important file
COPY . .

# Install app dependencies
RUN npm install

# Build the application for deployment
RUN npm run build

###backend
FROM node:current-alpine

WORKDIR /backend

COPY --from=build-stage /backend/dist /backend

# install dependency
RUN npm install --production

# Open port 8080
EXPOSE 8080

# Command to start the server
CMD RUN npm run start
