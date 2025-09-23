# Use Node.js 18 as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Define build arguments
ARG PORT
ARG MONGODB_URI
ARG JWT_SECRET
ARG JWT_REFRESH_SECRET
ARG JWT_TOKEN_EXPIRY_MINUTES
ARG JWT_REFRESH_TOKEN_EXPIRY_MINUTES
ARG USER_EMAIL
ARG EMAIL_APP_PASSWORD
ARG COMPILER_URL
ARG FRONTEND_URL
ARG ADMIN_URL
ARG CLOUDINARY_CLOUD_NAME

# Set environment variables from build arguments
ENV PORT=$PORT
ENV MONGODB_URI=$MONGODB_URI
ENV JWT_SECRET=$JWT_SECRET
ENV JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
ENV JWT_TOKEN_EXPIRY_MINUTES=$JWT_TOKEN_EXPIRY_MINUTES
ENV JWT_REFRESH_TOKEN_EXPIRY_MINUTES=$JWT_REFRESH_TOKEN_EXPIRY_MINUTES
ENV USER_EMAIL=$USER_EMAIL
ENV EMAIL_APP_PASSWORD=$EMAIL_APP_PASSWORD
ENV COMPILER_URL=$COMPILER_URL
ENV FRONTEND_URL=$FRONTEND_URL
ENV ADMIN_URL=$ADMIN_URL
ENV CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy environment variables if needed
COPY .env.example .env

# Expose the port your app runs on
EXPOSE 4000

# Start the application
CMD ["node", "--es-module-specifier-resolution=node", "dist/index.js"]