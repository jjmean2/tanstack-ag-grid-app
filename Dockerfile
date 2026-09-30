FROM node:24-bookworm

WORKDIR /app

RUN corepack enable

# Every workspace's package.json first, so the install layer is cached until
# dependencies change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/grid-demo-app/package.json apps/grid-demo-app/
COPY packages/workbook/package.json packages/workbook/
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
