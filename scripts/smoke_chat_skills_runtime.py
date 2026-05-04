"""Smoke test for CHAT_SKILLS_RUNTIME default adoption.

Runs without pytest to avoid WeasyPrint import chain.
"""
import os
import sys
from pathlib import Path

# Set dummy env vars before any Settings import
os.environ.setdefault("POSTGRES_PASSWORD", "dummypass123")
os.environ.setdefault("SECRET_KEY", "dummysecretkey1234567890123456789012")
os.environ.setdefault("OPENAI_API_KEY", "dummyopenaikey1234567890")

# Ensure backend is on path
sys.path.insert(0, str(Path(__file__).resolve().parent / ".." / "backend"))

from app.core.config import Settings


def test_default_is_pydantic_ai_skills():
    s = Settings()
    assert s.CHAT_SKILLS_RUNTIME == "pydantic-ai-skills", f"expected pydantic-ai-skills, got {s.CHAT_SKILLS_RUNTIME}"
    print("PASS: default is pydantic-ai-skills")


def test_custom_still_valid():
    s = Settings(CHAT_SKILLS_RUNTIME="custom")
    assert s.CHAT_SKILLS_RUNTIME == "custom"
    print("PASS: custom is still valid")


def test_invalid_rejected():
    try:
        Settings(CHAT_SKILLS_RUNTIME="bad-runtime")
        raise AssertionError("should have raised ValueError")
    except ValueError as exc:
        assert "CHAT_SKILLS_RUNTIME must be one of" in str(exc)
        print("PASS: invalid runtime rejected")


def test_register_tools_pydantic_runtime():
    from unittest.mock import MagicMock

    from app.agents import chat_agent as ca

    fake_agent = MagicMock()
    fake_agent._function_toolset = MagicMock()
    fake_agent._function_toolset.tools = {}
    fake_agent._function_toolset.add_tool = MagicMock()

    original_runtime = ca.settings.CHAT_SKILLS_RUNTIME
    try:
        ca.settings.CHAT_SKILLS_RUNTIME = "pydantic-ai-skills"
        ca._register_tools(fake_agent)
    finally:
        ca.settings.CHAT_SKILLS_RUNTIME = original_runtime

    added_names = [call.args[0].name for call in fake_agent._function_toolset.add_tool.call_args_list]
    assert "loadSkill" in added_names, f"loadSkill missing from {added_names}"
    assert "list_skills" in added_names, f"list_skills missing from {added_names}"
    assert "run_skill_script" not in added_names, "run_skill_script should be excluded"
    assert "read_skill_resource" not in added_names, "read_skill_resource should be excluded"
    print("PASS: pydantic runtime registers correct tools")


def test_register_tools_custom_runtime():
    from unittest.mock import MagicMock, patch

    from app.agents import chat_agent as ca

    fake_agent = MagicMock()
    fake_agent._function_toolset = MagicMock()
    fake_agent._function_toolset.tools = {}
    fake_agent._function_toolset.add_tool = MagicMock()

    original_runtime = ca.settings.CHAT_SKILLS_RUNTIME
    try:
        ca.settings.CHAT_SKILLS_RUNTIME = "custom"
        with patch.object(ca, "Agent", return_value=fake_agent):
            ca._make_agent(instructions="test")
    finally:
        ca.settings.CHAT_SKILLS_RUNTIME = original_runtime

    assert fake_agent._function_toolset.add_tool.call_count == 0, "custom runtime should not use add_tool"
    assert any(call.kwargs.get("name") == "loadSkill" for call in fake_agent.tool.call_args_list), "loadSkill should be registered via decorator"
    print("PASS: custom runtime registers loadSkill via decorator")


if __name__ == "__main__":
    test_default_is_pydantic_ai_skills()
    test_custom_still_valid()
    test_invalid_rejected()
    test_register_tools_pydantic_runtime()
    test_register_tools_custom_runtime()
    print("\nAll smokes passed.")
