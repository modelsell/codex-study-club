"""Exercise the downloadable inventory without invoking either coding client."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[2] / "public/templates/agent-instructions-audit.py"
SPEC = importlib.util.spec_from_file_location("instruction_audit", SCRIPT)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


class InstructionAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.project = self.root / "project"
        self.project.mkdir()

    def scan(self):
        return AUDIT.audit_directory(self.project, stop_at=self.root, user_home=self.root)

    def test_agents_only_is_inventory_not_a_loading_claim(self):
        rules = self.project / "AGENTS.md"
        rules.write_text("# shared rules\n", encoding="utf-8")
        before = rules.read_bytes()
        result = self.scan()
        self.assertTrue(result["scan_complete"])
        self.assertEqual([x["path"] for x in result["found"]], ["AGENTS.md"])
        self.assertEqual(result["possible_claude_fallback_blockers"], [])
        self.assertFalse(result["client_loading_verified"])
        self.assertEqual(rules.read_bytes(), before)
        self.assertEqual(list(self.project.iterdir()), [rules])

    def test_parent_and_local_markers_are_found_without_reading_contents(self):
        (self.root / "CLAUDE.md").write_text("@project/AGENTS.md\n")
        (self.project / "CLAUDE.local.md").touch()
        with patch.object(Path, "read_text", side_effect=AssertionError("Content read")):
            result = self.scan()
        self.assertEqual(set(result["possible_claude_fallback_blockers"]),
                         {"CLAUDE.local.md", "../CLAUDE.md"})
        self.assertFalse(result["client_loading_verified"])

    def test_personal_global_file_does_not_count_as_a_project_blocker(self):
        (self.root / ".claude").mkdir()
        (self.root / ".claude/CLAUDE.md").touch()
        result = self.scan()
        self.assertTrue(result["found"][0]["personal_global_file"])
        self.assertEqual(result["possible_claude_fallback_blockers"], [])

    def test_override_and_broken_symlink_are_reported_without_success_claim(self):
        (self.project / "AGENTS.override.md").touch()
        (self.project / "CLAUDE.md").symlink_to("missing.md")
        result = self.scan()
        self.assertFalse(result["scan_complete"])
        self.assertEqual(result["errors"][0]["error"], "NotReadableAsRegularFile")
        self.assertIn("CLAUDE.md", result["possible_claude_fallback_blockers"])
        self.assertIn("AGENTS.override.md", [x["path"] for x in result["found"]])

    def test_permission_errors_are_incomplete_evidence(self):
        original = Path.lstat
        def probe(path):
            if path == self.project / "AGENTS.md":
                raise PermissionError("fixture")
            return original(path)
        with patch.object(Path, "lstat", probe):
            result = self.scan()
        self.assertFalse(result["scan_complete"])
        self.assertEqual(result["errors"], [{"path": "AGENTS.md", "error": "PermissionError"}])


if __name__ == "__main__":
    unittest.main()
