#!/usr/bin/env python3
"""Build this showcase's additive JSON-only UIR package from public authoring."""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile


def write_json(path: pathlib.Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def digest(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--author", type=pathlib.Path, default=pathlib.Path("uir/author_site.py"))
    parser.add_argument("--package", type=pathlib.Path, default=pathlib.Path("app/uir-package"))
    args = parser.parse_args()
    root = pathlib.Path.cwd().resolve()
    author = (root / args.author).resolve()
    package = (root / args.package).resolve()
    package.relative_to(root)

    with tempfile.TemporaryDirectory(prefix="uir-public-build-") as temporary:
        changes_path = pathlib.Path(temporary) / "site.changeset.json"
        run = subprocess.run(
            [sys.executable, str(author), "--output", str(changes_path)],
            cwd=root,
            check=False,
        )
        if run.returncode:
            return run.returncode
        changes = json.loads(changes_path.read_text(encoding="utf-8"))

    if changes.get("changeSetVersion") != "0.1":
        raise SystemExit("unsupported changeSetVersion")
    if changes.get("deletes") or changes.get("assets") != {"deletes": [], "upserts": []}:
        raise SystemExit("showcase transport must remain additive and JSON-only")

    grouped: dict[tuple[str, str], list[dict]] = {}
    for item in changes["upserts"]:
        key = (item["collection"], item["path"])
        grouped.setdefault(key, []).append(item["record"])

    current_manifest = json.loads((package / "package.json").read_text(encoding="utf-8"))
    declared = {shard["path"] for shard in changes["shards"]}
    existing = {
        item.relative_to(package).as_posix()
        for item in package.rglob("*")
        if item.is_file() and item != package / "package.json"
    }
    if existing != declared:
        raise SystemExit(f"package file set differs: expected {sorted(declared)}, actual {sorted(existing)}")
    declared_keys = {(shard["collection"], shard["path"]) for shard in changes["shards"]}
    if not set(grouped).issubset(declared_keys):
        raise SystemExit("upserts exist outside declared shards")

    model = []
    for shard in changes["shards"]:
        collection, relative = shard["collection"], shard["path"]
        if pathlib.PurePosixPath(relative).is_absolute() or ".." in pathlib.PurePosixPath(relative).parts:
            raise SystemExit(f"unsafe shard path: {relative}")
        target = package / relative
        write_json(target, {"collection": collection, "records": grouped.pop((collection, relative), [])})
        model.append({"collection": collection, "path": relative, "sha256": digest(target)})
    write_json(
        package / "package.json",
        {
            "assets": [],
            "formatVersion": current_manifest.get("formatVersion", "1.0"),
            "model": model,
            "packageId": changes["packageId"],
            "packageVersion": changes["packageVersion"],
            "readingProfile": changes["readingProfile"],
            "vocabularyVersion": current_manifest["vocabularyVersion"],
        },
    )
    print(f"built public UIR package: {package}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
