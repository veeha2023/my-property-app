FROM apify/actor-node-playwright-chrome:20

COPY package.json ./
RUN npm install --only=prod --no-optional

COPY . ./
