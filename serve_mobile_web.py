#!/usr/bin/env python3
"""Serve only the web files required by the KTEK Expo shell."""

from __future__ import annotations

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


PROJECT_ROOT = Path(__file__).resolve().parent
ALLOWED_PATHS = {
    "/index.html",
    "/digital_twin.js",
    "/ktek_map_objects.json",
}


class KtekRequestHandler(SimpleHTTPRequestHandler):
    server_version = "KTEKWeb/1.0"

    def _allowed_path(self) -> str | None:
        path = unquote(urlsplit(self.path).path)
        if path == "/":
            return "/index.html"
        if path in ALLOWED_PATHS:
            return path
        return None

    def do_GET(self) -> None:
        allowed_path = self._allowed_path()
        if allowed_path is None:
            self.send_error(404, "Not found")
            return
        self.path = allowed_path
        super().do_GET()

    def do_HEAD(self) -> None:
        allowed_path = self._allowed_path()
        if allowed_path is None:
            self.send_error(404, "Not found")
            return
        self.path = allowed_path
        super().do_HEAD()

    def list_directory(self, path: str):
        self.send_error(404, "Not found")
        return None

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8002)
    args = parser.parse_args()

    handler = functools.partial(KtekRequestHandler, directory=str(PROJECT_ROOT))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"KTEK web server: http://{args.host}:{args.port}/index.html", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
