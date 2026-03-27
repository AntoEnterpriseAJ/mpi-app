"""
Tests for Docker and project infrastructure configuration files added in the Docker setup PR.

Covers:
  - .gitignore patterns
  - backend/.dockerignore patterns
  - backend/.env.example content and format
  - backend/Dockerfile directives
  - docker-compose.yml structure and correctness
"""

import fnmatch
import os
import re

import pytest
import yaml

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def repo_path(*parts: str) -> str:
    return os.path.join(REPO_ROOT, *parts)


def read_file(*parts: str) -> str:
    with open(repo_path(*parts)) as fh:
        return fh.read()


def read_lines(*parts: str) -> list[str]:
    return read_file(*parts).splitlines()


def non_comment_lines(*parts: str) -> list[str]:
    """Return non-empty, non-comment lines from a file."""
    return [
        ln.strip()
        for ln in read_lines(*parts)
        if ln.strip() and not ln.strip().startswith("#")
    ]


def gitignore_matches(pattern: str, path: str) -> bool:
    """Return True if *path* is matched by *pattern* using fnmatch semantics."""
    return fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(
        os.path.basename(path), pattern
    )


def any_gitignore_pattern_matches(patterns: list[str], path: str) -> bool:
    return any(gitignore_matches(p, path) for p in patterns)


# ---------------------------------------------------------------------------
# .gitignore
# ---------------------------------------------------------------------------


class TestGitignore:
    GITIGNORE_PATH = (".gitignore",)

    def _patterns(self) -> list[str]:
        return non_comment_lines(*self.GITIGNORE_PATH)

    # --- existence ---

    def test_file_exists(self):
        assert os.path.isfile(repo_path(*self.GITIGNORE_PATH)), ".gitignore must exist"

    # --- Python artefacts ---

    def test_ignores_pycache_directory(self):
        patterns = self._patterns()
        assert "__pycache__/" in patterns

    def test_ignores_pyc_files(self):
        patterns = self._patterns()
        assert "*.pyc" in patterns

    def test_ignores_pyo_files(self):
        patterns = self._patterns()
        assert "*.pyo" in patterns

    def test_ignores_pyd_files(self):
        patterns = self._patterns()
        assert "*.pyd" in patterns

    def test_ignores_dot_venv_directory(self):
        patterns = self._patterns()
        assert ".venv/" in patterns

    def test_ignores_venv_directory(self):
        patterns = self._patterns()
        assert "venv/" in patterns

    def test_ignores_dist_directory(self):
        patterns = self._patterns()
        assert "dist/" in patterns

    def test_ignores_egg_info_directories(self):
        patterns = self._patterns()
        assert "*.egg-info/" in patterns

    # --- secrets / environment ---

    def test_ignores_dot_env_file(self):
        patterns = self._patterns()
        assert ".env" in patterns

    def test_ignores_dot_env_glob(self):
        """*.env should match any file ending in .env (e.g. production.env)."""
        patterns = self._patterns()
        assert "*.env" in patterns

    def test_dot_env_glob_matches_production_env(self):
        patterns = self._patterns()
        assert any_gitignore_pattern_matches(patterns, "production.env")

    def test_dot_env_glob_matches_local_env(self):
        patterns = self._patterns()
        assert any_gitignore_pattern_matches(patterns, "local.env")

    # --- editors ---

    def test_ignores_vscode_directory(self):
        patterns = self._patterns()
        assert ".vscode/" in patterns

    def test_ignores_idea_directory(self):
        patterns = self._patterns()
        assert ".idea/" in patterns

    # --- OS artefacts ---

    def test_ignores_ds_store(self):
        patterns = self._patterns()
        assert ".DS_Store" in patterns

    def test_ignores_thumbs_db(self):
        patterns = self._patterns()
        assert "Thumbs.db" in patterns

    # --- negative / regression ---

    def test_does_not_ignore_requirements_txt(self):
        """requirements.txt must be tracked by git."""
        patterns = self._patterns()
        assert not any_gitignore_pattern_matches(patterns, "requirements.txt")

    def test_does_not_ignore_py_source_files(self):
        """Regular .py files must NOT be ignored."""
        patterns = self._patterns()
        assert not any_gitignore_pattern_matches(patterns, "main.py")

    def test_does_not_ignore_dockerfile(self):
        """Dockerfile must be tracked."""
        patterns = self._patterns()
        assert not any_gitignore_pattern_matches(patterns, "Dockerfile")

    def test_pyc_pattern_matches_compiled_file(self):
        """*.pyc pattern must match a realistic compiled filename."""
        patterns = self._patterns()
        assert any_gitignore_pattern_matches(patterns, "main.pyc")

    def test_egg_info_pattern_matches_package(self):
        patterns = self._patterns()
        assert any_gitignore_pattern_matches(patterns, "mypackage.egg-info/")


# ---------------------------------------------------------------------------
# backend/.dockerignore
# ---------------------------------------------------------------------------


class TestDockerIgnore:
    DOCKERIGNORE_PATH = ("backend", ".dockerignore")

    def _patterns(self) -> list[str]:
        return non_comment_lines(*self.DOCKERIGNORE_PATH)

    def test_file_exists(self):
        assert os.path.isfile(repo_path(*self.DOCKERIGNORE_PATH))

    def test_excludes_pycache(self):
        assert "__pycache__/" in self._patterns()

    def test_excludes_pyc_files(self):
        assert "*.pyc" in self._patterns()

    def test_excludes_pyo_files(self):
        assert "*.pyo" in self._patterns()

    def test_excludes_pyd_files(self):
        assert "*.pyd" in self._patterns()

    def test_excludes_dot_venv(self):
        assert ".venv/" in self._patterns()

    def test_excludes_dot_env(self):
        """.env must never be sent to the Docker build daemon."""
        assert ".env" in self._patterns()

    def test_pyc_pattern_matches_compiled_file(self):
        assert any(
            fnmatch.fnmatch("main.pyc", p) for p in self._patterns()
        )

    # --- regression: secrets must stay out of the image ---

    def test_dot_env_excluded_prevents_secret_leakage(self):
        """
        Regression: ensures .env is listed so credentials are never baked
        into the Docker image layer.
        """
        patterns = self._patterns()
        assert ".env" in patterns, (
            ".env MUST be in .dockerignore to prevent secrets being copied into the image"
        )


# ---------------------------------------------------------------------------
# backend/.env.example
# ---------------------------------------------------------------------------


class TestEnvExample:
    ENV_EXAMPLE_PATH = ("backend", ".env.example")

    def _content(self) -> str:
        return read_file(*self.ENV_EXAMPLE_PATH)

    def test_file_exists(self):
        assert os.path.isfile(repo_path(*self.ENV_EXAMPLE_PATH))

    def test_contains_database_url_key(self):
        assert "DATABASE_URL" in self._content()

    def test_database_url_uses_postgresql_scheme(self):
        assert "postgresql://" in self._content()

    def test_database_url_references_mpi_db(self):
        assert "mpi_db" in self._content()

    def test_database_url_uses_localhost_for_local_dev(self):
        """The example file targets local development, so localhost is expected."""
        assert "localhost" in self._content()

    def test_has_placeholder_password(self):
        """Password must be a placeholder, not a real credential."""
        assert "your_password_here" in self._content()

    def test_password_is_not_empty(self):
        """Placeholder must not be an empty string."""
        match = re.search(r"postgresql://[^:]+:([^@]+)@", self._content())
        assert match is not None, "DATABASE_URL must include a password field"
        password = match.group(1)
        assert password.strip() != ""

    def test_format_is_key_equals_value(self):
        """Each non-empty, non-comment line must be KEY=value."""
        for line in non_comment_lines(*self.ENV_EXAMPLE_PATH):
            assert "=" in line, f"Expected KEY=value format, got: {line!r}"

    def test_uses_default_postgres_port(self):
        assert ":5432/" in self._content()

    # --- regression: example must NOT contain a real password ---

    def test_placeholder_is_not_a_realistic_password(self):
        """
        Regression: guard against accidentally committing a real password
        in the example file.  A realistic password would not contain the
        literal word 'your'.
        """
        match = re.search(r"postgresql://[^:]+:([^@]+)@", self._content())
        assert match is not None
        password = match.group(1)
        assert "your" in password.lower(), (
            "Placeholder password should contain 'your' to signal it is not real"
        )


# ---------------------------------------------------------------------------
# backend/Dockerfile
# ---------------------------------------------------------------------------


class TestDockerfile:
    DOCKERFILE_PATH = ("backend", "Dockerfile")

    def _lines(self) -> list[str]:
        return read_lines(*self.DOCKERFILE_PATH)

    def _instructions(self) -> list[tuple[str, str]]:
        """Return (instruction, rest) pairs for non-empty, non-comment lines."""
        result = []
        for line in self._lines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                parts = stripped.split(None, 1)
                result.append((parts[0].upper(), parts[1] if len(parts) > 1 else ""))
        return result

    def _instruction_values(self, keyword: str) -> list[str]:
        return [rest for kw, rest in self._instructions() if kw == keyword]

    def test_file_exists(self):
        assert os.path.isfile(repo_path(*self.DOCKERFILE_PATH))

    def test_base_image_is_python_312_slim(self):
        from_values = self._instruction_values("FROM")
        assert len(from_values) >= 1
        assert from_values[0] == "python:3.12-slim"

    def test_workdir_is_app(self):
        workdir_values = self._instruction_values("WORKDIR")
        assert "/app" in workdir_values

    def test_copies_requirements_before_source(self):
        """requirements.txt must be copied before the rest of the source so
        Docker layer caching avoids reinstalling packages on code changes."""
        instructions = self._instructions()
        copy_indices = [i for i, (kw, _) in enumerate(instructions) if kw == "COPY"]
        assert len(copy_indices) >= 2, "Expected at least two COPY instructions"
        first_copy_rest = instructions[copy_indices[0]][1]
        assert "requirements.txt" in first_copy_rest

    def test_pip_install_uses_no_cache_dir(self):
        run_values = self._instruction_values("RUN")
        pip_runs = [v for v in run_values if "pip install" in v]
        assert pip_runs, "Expected a RUN pip install instruction"
        assert "--no-cache-dir" in pip_runs[0]

    def test_pip_install_requirements_txt(self):
        run_values = self._instruction_values("RUN")
        pip_runs = [v for v in run_values if "pip install" in v]
        assert pip_runs
        assert "-r requirements.txt" in pip_runs[0]

    def test_exposes_port_8000(self):
        expose_values = self._instruction_values("EXPOSE")
        assert "8000" in expose_values

    def test_cmd_uses_uvicorn(self):
        cmd_values = self._instruction_values("CMD")
        assert cmd_values, "Dockerfile must have a CMD instruction"
        assert "uvicorn" in cmd_values[0]

    def test_cmd_runs_main_app(self):
        cmd_values = self._instruction_values("CMD")
        assert "main:app" in cmd_values[0]

    def test_cmd_binds_to_all_interfaces(self):
        """Server must listen on 0.0.0.0, not 127.0.0.1, inside the container."""
        cmd_values = self._instruction_values("CMD")
        assert "0.0.0.0" in cmd_values[0]

    def test_cmd_uses_correct_port(self):
        cmd_values = self._instruction_values("CMD")
        assert "8000" in cmd_values[0]

    def test_cmd_enables_hot_reload(self):
        """--reload flag must be present so hot-reload works in development."""
        cmd_values = self._instruction_values("CMD")
        assert "--reload" in cmd_values[0]

    def test_requirements_installed_before_source_copy(self):
        """RUN pip install must appear before the second COPY (source copy)."""
        instructions = self._instructions()
        copy_indices = [i for i, (kw, _) in enumerate(instructions) if kw == "COPY"]
        run_pip_indices = [
            i
            for i, (kw, rest) in enumerate(instructions)
            if kw == "RUN" and "pip install" in rest
        ]
        assert run_pip_indices, "Expected at least one RUN pip install"
        # The source COPY (second one) must come after pip install
        assert copy_indices[-1] > run_pip_indices[0]


# ---------------------------------------------------------------------------
# docker-compose.yml
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def compose() -> dict:
    with open(repo_path("docker-compose.yml")) as fh:
        return yaml.safe_load(fh)


class TestDockerCompose:
    def test_file_exists(self):
        assert os.path.isfile(repo_path("docker-compose.yml"))

    def test_valid_yaml(self, compose):
        assert isinstance(compose, dict)

    def test_version_is_3_8(self, compose):
        assert str(compose.get("version")) == "3.8"

    def test_defines_two_services(self, compose):
        assert set(compose["services"].keys()) == {"db", "api"}

    # --- db service ---

    def test_db_uses_postgres_15_alpine(self, compose):
        assert compose["services"]["db"]["image"] == "postgres:15-alpine"

    def test_db_container_name(self, compose):
        assert compose["services"]["db"]["container_name"] == "mpi_app_db"

    def test_db_restart_always(self, compose):
        assert compose["services"]["db"]["restart"] == "always"

    def test_db_postgres_user_set(self, compose):
        env = compose["services"]["db"]["environment"]
        assert "POSTGRES_USER" in env

    def test_db_postgres_password_set(self, compose):
        env = compose["services"]["db"]["environment"]
        assert "POSTGRES_PASSWORD" in env

    def test_db_postgres_db_is_mpi_db(self, compose):
        env = compose["services"]["db"]["environment"]
        assert env.get("POSTGRES_DB") == "mpi_db"

    def test_db_exposes_postgres_port(self, compose):
        ports = compose["services"]["db"]["ports"]
        assert "5432:5432" in ports

    def test_db_has_named_volume(self, compose):
        db_volumes = compose["services"]["db"]["volumes"]
        assert any("postgres_data" in v for v in db_volumes)

    def test_db_has_healthcheck(self, compose):
        assert "healthcheck" in compose["services"]["db"]

    def test_db_healthcheck_uses_pg_isready(self, compose):
        hc = compose["services"]["db"]["healthcheck"]
        test_cmd = " ".join(hc["test"]) if isinstance(hc["test"], list) else hc["test"]
        assert "pg_isready" in test_cmd

    def test_db_healthcheck_interval(self, compose):
        hc = compose["services"]["db"]["healthcheck"]
        assert hc.get("interval") == "5s"

    def test_db_healthcheck_timeout(self, compose):
        hc = compose["services"]["db"]["healthcheck"]
        assert hc.get("timeout") == "5s"

    def test_db_healthcheck_retries(self, compose):
        hc = compose["services"]["db"]["healthcheck"]
        assert hc.get("retries") == 5

    # --- api service ---

    def test_api_builds_from_backend_directory(self, compose):
        assert compose["services"]["api"]["build"] == "./backend"

    def test_api_container_name(self, compose):
        assert compose["services"]["api"]["container_name"] == "mpi_app_api"

    def test_api_restart_always(self, compose):
        assert compose["services"]["api"]["restart"] == "always"

    def test_api_exposes_port_8000(self, compose):
        ports = compose["services"]["api"]["ports"]
        assert "8000:8000" in ports

    def test_api_has_database_url_env(self, compose):
        env = compose["services"]["api"]["environment"]
        assert "DATABASE_URL" in env

    def test_api_database_url_uses_postgresql_scheme(self, compose):
        db_url = compose["services"]["api"]["environment"]["DATABASE_URL"]
        assert db_url.startswith("postgresql://")

    def test_api_database_url_points_to_db_service(self, compose):
        """DATABASE_URL must reference the 'db' service hostname, not localhost."""
        db_url = compose["services"]["api"]["environment"]["DATABASE_URL"]
        assert "@db:" in db_url, (
            "DATABASE_URL should reference the 'db' service hostname, not localhost"
        )

    def test_api_database_url_references_mpi_db(self, compose):
        db_url = compose["services"]["api"]["environment"]["DATABASE_URL"]
        assert db_url.endswith("/mpi_db")

    def test_api_depends_on_db(self, compose):
        depends_on = compose["services"]["api"]["depends_on"]
        assert "db" in depends_on

    def test_api_depends_on_db_with_healthy_condition(self, compose):
        """API must not start until the DB healthcheck passes."""
        depends_on = compose["services"]["api"]["depends_on"]
        assert depends_on["db"]["condition"] == "service_healthy"

    def test_api_mounts_backend_for_hot_reload(self, compose):
        """backend/ must be mounted into /app so --reload sees code changes."""
        volumes = compose["services"]["api"]["volumes"]
        assert any("./backend:/app" in v for v in volumes)

    # --- named volumes ---

    def test_named_volume_postgres_data_defined(self, compose):
        assert "postgres_data" in compose.get("volumes", {})

    # --- regression / edge cases ---

    def test_api_does_not_use_localhost_for_db(self, compose):
        """
        Regression: inside Docker network, localhost refers to the API container
        itself, not the db container.
        """
        db_url = compose["services"]["api"]["environment"]["DATABASE_URL"]
        assert "localhost" not in db_url

    def test_db_credentials_consistent_between_services(self, compose):
        """
        The POSTGRES_USER / POSTGRES_PASSWORD in the db service must match the
        credentials embedded in the api's DATABASE_URL.
        """
        db_env = compose["services"]["db"]["environment"]
        db_url = compose["services"]["api"]["environment"]["DATABASE_URL"]
        # Extract user from URL: postgresql://USER:PASS@host/db
        match = re.match(r"postgresql://([^:]+):([^@]+)@", db_url)
        assert match, "DATABASE_URL must follow postgresql://user:pass@host/db"
        url_user = match.group(1)
        url_pass = match.group(2)
        assert url_user == str(db_env["POSTGRES_USER"])
        assert url_pass == str(db_env["POSTGRES_PASSWORD"])