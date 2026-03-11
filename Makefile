setup:
	docker pull hexletprojects/hexlet-project-source-ci:latest
	docker pull ubuntu:latest
	make install

install:
	npm install

build:
	npm run build

test:
	ACTIONS_RUNNER_DEBUG=1 npx jest

lint:
	npx @biomejs/biome check

lint-fix:
	npx @biomejs/biome check --fix

# TODO: release authomatically after build
release:
	git push -f origin master:release

update-deps:
	npx ncu -u
