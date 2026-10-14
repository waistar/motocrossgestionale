"""Query periodica Supabase con la chiave pubblica già presente in config.js."""

import json
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


CONFIG = Path(__file__).resolve().parents[1] / "config.js"


def read_config(path=CONFIG):
    source = path.read_text(encoding="utf-8")
    values = {}
    for name in ("SUPABASE_URL", "SUPABASE_ANON_KEY"):
        match = re.search(
            rf"^\s*export\s+const\s+{name}\s*=\s*(['\"])([^'\"\r\n]+)\1\s*;",
            source,
            re.MULTILINE,
        )
        if not match:
            raise ValueError(f"Configura {name} in config.js.")
        values[name] = match.group(2)
    url = urlsplit(values["SUPABASE_URL"])
    if (url.scheme != "https" or not url.hostname
            or not url.hostname.endswith(".supabase.co")
            or url.username or url.password or url.port
            or url.path not in ("", "/") or url.query or url.fragment):
        raise ValueError("SUPABASE_URL deve essere l'URL HTTPS del progetto Supabase.")
    key = values["SUPABASE_ANON_KEY"]
    # La chiave pubblica è già utilizzata dal frontend; nessun segreto amministrativo.
    if not (key.startswith("sb_publishable_") or key.startswith("eyJ")):
        raise ValueError("Usa una chiave pubblica publishable oppure anon in config.js.")
    if key.startswith("eyJ"):
        import base64
        try:
            payload = key.split(".")[1]
            role = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))).get("role")
        except (IndexError, ValueError, TypeError):
            raise ValueError("Chiave anon non valida.") from None
        if role != "anon":
            raise ValueError("Il heartbeat richiede la chiave anon pubblica, non service_role.")
    return values["SUPABASE_URL"].rstrip("/"), key


def heartbeat(url, key, attempts=3):
    headers = {"apikey": key, "Content-Type": "application/json"}
    if key.startswith("eyJ"):
        headers["Authorization"] = "Bearer " + key
    request = Request(
        url + "/rest/v1/rpc/garage_heartbeat",
        data=b"{}",
        headers=headers,
        method="POST",
    )
    for attempt in range(attempts):
        try:
            with urlopen(request, timeout=30) as response:
                if response.status != 200 or json.loads(response.read()) != 1:
                    raise RuntimeError("Risposta heartbeat inattesa: la query deve restituire 1.")
            print("Heartbeat OK: query SELECT 1 eseguita su Supabase.")
            return
        except HTTPError as error:
            if error.code in (400, 401, 403, 404):
                raise RuntimeError(
                    f"HTTP {error.code}: controlla config.js ed esegui heartbeat.sql "
                    "nel SQL Editor di Supabase."
                ) from None
            if error.code != 429 and error.code < 500:
                raise RuntimeError(f"Heartbeat fallito: HTTP {error.code}.") from None
            message = f"HTTP {error.code}"
        except (URLError, TimeoutError):
            message = "connessione non disponibile o timeout"
        if attempt + 1 == attempts:
            raise RuntimeError(f"Heartbeat fallito dopo {attempts} tentativi: {message}.")
        print(f"Tentativo {attempt + 1} fallito ({message}); riprovo.", file=sys.stderr)
        time.sleep(5 * (attempt + 1))


def main():
    try:
        heartbeat(*read_config())
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Errore: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
