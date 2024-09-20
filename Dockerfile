# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy only the package.json and package-lock.json files
COPY package.json /app/

# Install dependencies
RUN npm install

# Copy the remaining files
COPY . /app/

# Expose the port your app runs on
EXPOSE 8282

# Start the Node.js app
CMD [ "node", "dev_index.js" ]
