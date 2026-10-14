import base64
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

SPEC = importlib.util.spec_from_file_location(
    "heartbeat", Path(__file__).resolve().parents[1] / "scripts/supabase_heartbeat.py"
)
heartbeat = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(heartbeat)


class Response(io.BytesIO):
    status = 200


class HeartbeatTest(unittest.TestCase):
    url = "https://example.supabase.co"
    key = "sb_publishable_test"

    def config(self, url=None, key=None):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.js"
            path.write_text(
                f"export const SUPABASE_URL = '{url or self.url}';\n"
                f"export const SUPABASE_ANON_KEY = '{key or self.key}';\n"
            )
            return heartbeat.read_config(path)

    @patch.object(heartbeat, "urlopen", return_value=Response(b"1"))
    def test_success_uses_public_rpc_without_user_login(self, request):
        heartbeat.heartbeat(*self.config())
        call = request.call_args.args[0]
        self.assertEqual(call.full_url, self.url + "/rest/v1/rpc/garage_heartbeat")
        self.assertEqual(call.method, "POST")
        self.assertEqual(call.data, b"{}")
        self.assertEqual(call.get_header("Apikey"), self.key)
        self.assertIsNone(call.get_header("Authorization"))

    @patch.object(heartbeat.time, "sleep")
    @patch.object(heartbeat, "urlopen")
    def test_temporary_errors_retry_then_succeed(self, request, sleep):
        request.side_effect = [
            HTTPError(self.url, 503, "Unavailable", None, None),
            URLError("offline"), Response(b"1")
        ]
        heartbeat.heartbeat(self.url, self.key)
        self.assertEqual(request.call_count, 3)
        self.assertEqual([c.args[0] for c in sleep.call_args_list], [5, 10])

    @patch.object(heartbeat.time, "sleep")
    @patch.object(heartbeat, "urlopen")
    def test_rate_limit_exhaustion_fails(self, request, sleep):
        request.side_effect = HTTPError(self.url, 429, "Limited", None, None)
        with self.assertRaisesRegex(RuntimeError, "dopo 3 tentativi"):
            heartbeat.heartbeat(self.url, self.key)
        self.assertEqual(request.call_count, 3)

    @patch.object(heartbeat.time, "sleep")
    @patch.object(heartbeat, "urlopen")
    def test_missing_function_and_denied_access_fail_without_retry(self, request, sleep):
        for code in (400, 401, 403, 404):
            with self.subTest(code=code):
                request.reset_mock()
                request.side_effect = HTTPError(self.url, code, "Failed", None, None)
                with self.assertRaisesRegex(RuntimeError, "heartbeat.sql"):
                    heartbeat.heartbeat(self.url, self.key)
                self.assertEqual(request.call_count, 1)
        sleep.assert_not_called()

    @patch.object(heartbeat, "urlopen", return_value=Response(b'"wrong"'))
    def test_unexpected_result_is_not_a_success(self, request):
        with self.assertRaisesRegex(RuntimeError, "inattesa"):
            heartbeat.heartbeat(self.url, self.key)

    def test_invalid_project_and_secret_keys_rejected(self):
        for url in ("http://example.supabase.co", "https://example.com", self.url + "/rest/v1"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                self.config(url=url)
        with self.assertRaises(ValueError):
            self.config(key="sb_secret_never_use_this")
        payload = base64.urlsafe_b64encode(json.dumps({"role":"service_role"}).encode()).decode().rstrip("=")
        with self.assertRaisesRegex(ValueError, "non service_role"):
            self.config(key=f"eyJheader.{payload}.signature")

    @patch.object(heartbeat, "urlopen", return_value=Response(b"1"))
    def test_legacy_anon_key_is_supported(self, request):
        payload = base64.urlsafe_b64encode(json.dumps({"role":"anon"}).encode()).decode().rstrip("=")
        key = f"eyJheader.{payload}.signature"
        heartbeat.heartbeat(*self.config(key=key))
        self.assertEqual(request.call_args.args[0].get_header("Authorization"), "Bearer " + key)

    @patch.object(heartbeat, "read_config", side_effect=ValueError("configurazione assente"))
    def test_cli_returns_failure(self, config):
        self.assertEqual(heartbeat.main(), 1)


if __name__ == "__main__":
    unittest.main()
