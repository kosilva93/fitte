.PHONY: install dev-api dev-mobile dev-web test lint format typecheck clean

# Install all dependencies across the monorepo
install:
	yarn install

# Start the API in dev mode (hot reload via tsx watch)
dev-api:
	yarn workspace @fitte/api dev

# Start the Expo mobile app
dev-mobile:
	yarn workspace @fitte/mobile start

# Start the Next.js web app
dev-web:
	yarn workspace @fitte/web dev

# Run all tests across workspaces
test:
	yarn workspace @fitte/api test
	yarn workspace @fitte/mobile test

# Lint all workspaces
lint:
	yarn workspace @fitte/api lint
	yarn workspace @fitte/mobile lint
	yarn workspace @fitte/web lint

# Format all workspaces
format:
	yarn workspace @fitte/api format
	yarn workspace @fitte/mobile format
	yarn workspace @fitte/web format

# Type check all workspaces
typecheck:
	yarn workspace @fitte/api typecheck
	yarn workspace @fitte/mobile typecheck
	yarn workspace @fitte/web typecheck

# Build the API for production
build-api:
	yarn workspace @fitte/api build

# Build the web app for production
build-web:
	yarn workspace @fitte/web build

# Build Expo app for preview (TestFlight / Play beta)
build-mobile-preview:
	cd apps/mobile && eas build --profile preview

# Build Expo app for production
build-mobile-production:
	cd apps/mobile && eas build --profile production

# Copy .env.example files to .env if they don't exist
setup-env:
	cp -n apps/api/.env.example apps/api/.env || true
	cp -n apps/mobile/.env.example apps/mobile/.env || true
	cp -n apps/web/.env.example apps/web/.env || true

# Remove all build artifacts and node_modules
clean:
	rm -rf node_modules apps/api/node_modules apps/mobile/node_modules apps/web/node_modules
	rm -rf apps/api/dist apps/mobile/.expo apps/mobile/web-build apps/web/.next
