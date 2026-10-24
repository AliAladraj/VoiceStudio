"""Every Vite config that builds the renderer must define __BUILD_COMMIT__.

The constant is read by the report-bug button and Settings > Diagnostics. A
config that defines __APP_VERSION__ but not __BUILD_COMMIT__ builds fine and
then throws a ReferenceError the moment either renders, which is how the
renderer smokes and the UI crawler failed on main after the build commit was
added to reports.
"""
from __future__ import annotations

from pathlib import Path

import pytest

_ELECTRON = Path(__file__).resolve().parents[1] / "electron"
_CONFIGS = sorted(
    p
    for pattern in ("*vite*.ts", "*vite*.mjs", "tests/*vite*.mjs", "tests/*vite*.ts")
    for p in _ELECTRON.glob(pattern)
    if "__APP_VERSION__" in p.read_text(encoding="utf-8")
)


def test_the_configs_are_found():
    assert len(_CONFIGS) >= 5, _CONFIGS


@pytest.mark.parametrize("path", _CONFIGS, ids=lambda p: str(p.relative_to(_ELECTRON)))
def test_a_config_that_defines_the_version_also_defines_the_build_commit(path):
    assert "__BUILD_COMMIT__" in path.read_text(encoding="utf-8"), (
        f"{path.name} defines __APP_VERSION__ but not __BUILD_COMMIT__"
    )
