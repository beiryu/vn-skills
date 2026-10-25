FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm build

FROM node:22-alpine AS runtime
RUN corepack enable
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./
COPY --from=build /app/packages/core/package.json packages/core/package.json
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/packages/cli/package.json packages/cli/package.json
COPY --from=build /app/packages/cli/dist packages/cli/dist
COPY --from=build /app/packages/mcp/package.json packages/mcp/package.json
COPY --from=build /app/packages/mcp/dist packages/mcp/dist
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter @vn-skills/mcp...
USER node
ENTRYPOINT ["node", "packages/mcp/dist/index.js"]
