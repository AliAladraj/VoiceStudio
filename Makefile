# Maintainer shortcuts; product development uses bun/uv directly.

.PHONY: release release-dry release-publish virustotal install-hooks uninstall-hooks

PYTHON ?= python3

release: ## Cut a release: asks stable/beta, draft/publish, then confirms
	uv run python scripts/release.py

release-dry: ## Show the release plan, change nothing
	uv run python scripts/release.py --dry-run

release-publish: ## Publish an existing draft: make release-publish TAG=v0.5.8
	@test -n "$(TAG)" || { echo "usage: make release-publish TAG=vX.Y.Z[-beta.N]"; exit 2; }
	uv run python scripts/release.py --publish $(TAG)

virustotal: export VIRUSTOTAL_FILE = $(FILE)
virustotal: ## Upload committed HEAD source ZIP, or make virustotal FILE=/path/to/public/file
	$(PYTHON) scripts/virustotal.py

install-hooks: ## Run the cached local CI (dagger call check) before every git push
	git config core.hooksPath scripts/git-hooks

uninstall-hooks: ## Stop running local CI before git push
	git config --unset core.hooksPath
