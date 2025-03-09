# Use Node.js 18
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the consumer code
COPY . .

# Expose port if needed (optional, depending on how your consumer works)
# EXPOSE 3001

# Run the consumer
CMD ["node", "consumer.js"]
