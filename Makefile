setup: pull setup

pull:
	docker pull hexletprojects/hexlet-project-source-ci:latest
	docker pull ubuntu:latest

install:
	npm install

build:
	npm run build

test:
	ACTIONS_RUNNER_DEBUG=1 npx vitest run

typecheck:
	npx tsc --noEmit

lint:
	npx @biomejs/biome check

lint-fix:
	npx @biomejs/biome check --fix

update-deps:
	npx ncu -u
