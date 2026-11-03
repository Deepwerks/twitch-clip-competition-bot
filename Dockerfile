# syntax=docker/dockerfile:1.27

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile
RUN pnpm run build
ENV NODE_ENV=production

EXPOSE 3000
CMD ["pnpm", "run", "start"]