.DEFAULT_GOAL := help

REPOSITORY := $(notdir $(CURDIR))

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: dev
dev: ## Run dev server
dev: node_modules
	npm run dev

dist/index.html: node_modules example.md
	npm run build

example-export.pdf: node_modules example.md
	npm run export

example-export/*.png: node_modules example.md
	npm run screenshot

node_modules: package.json package-lock.json
	npm ci

.PHONY: install
install: ## Install packages
install: node_modules

.PHONY: upgrade
upgrade: ## Upgrades package.json
upgrade:
	npx -p npm-check-updates  -c "ncu -u"
	npm update

.PHONY: publish
publish: ## Publish add-on
publish:
	npm publish --access public

.PHONY: build
build: dist/index.html ## Build slide

.PHONY: pdf
pdf: example-export.pdf ## Export slide to PDF

.PHONY: png
png: example-export/*.png ## Export slide to PNG

.PHONY: clean
clean: ## Delete slide
clean:
	rm -rf example-export/* example-export.pdf dist/*
