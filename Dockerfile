# FROM node:20-alpine

# WORKDIR /app

# # Copy package files
# COPY package*.json ./

# # Install dependencies
# RUN npm ci --only=production

# # Copy source code
# COPY . .

# # Create config directory if it doesn't exist
# RUN mkdir -p config

# # Expose port 5000
# EXPOSE 5000

# # Start the application
# CMD ["node", "app.js"]


FROM node:20-alpine

WORKDIR /app

# Install MongoDB Database Tools
RUN apk add --no-cache mongodb-tools

# Create backup directory with proper permissions
RUN mkdir -p /tmp/backups && chmod 777 /tmp/backups

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create config directory if it doesn't exist
RUN mkdir -p config

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["node", "app.js"]