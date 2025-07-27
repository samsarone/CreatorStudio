# Use Node base with Debian (Linux) packages
FROM node:20-bullseye

# Install native deps (canvas, etc.)
RUN apt-get update && apt-get install -y \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  python3 \
  pkg-config \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy only dependency files and install cleanly
COPY package.json yarn.lock ./
RUN yarn install --ignore-scripts && yarn add esbuild && yarn esbuild --version

# Copy rest of the app
COPY . .

COPY .env.staging .env

# Build app
RUN yarn build --mode staging


# Expose
EXPOSE 3000

# Start preview server
CMD ["yarn", "preview", "--host", "--port", "3000"]
