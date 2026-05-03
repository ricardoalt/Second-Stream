import re

import pytest

from app.agents.chat_skill_loader import (
    SkillSpecError,
    available_skill_names,
    build_skills_prompt,
    compile_base_instructions,
    discover_skills,
    load_skill,
)

_SPEC_NAME_RE = re.compile(r"^[a-z0-9-]{1,64}$")
_SPEC_DESCRIPTION_MAX = 1024


def test_loads_safety_flagging_from_disk():
    skill = load_skill("safety-flagging")
    assert skill.name == "safety-flagging"
    assert len(skill.body) > 100


def test_loads_all_skills_from_disk():
    skills = discover_skills()
    names = {s.name for s in skills}
    expected = {
        "safety-flagging",
        "qualification-gate",
        "sub-discipline-router",
        "specialist-lens-light",
        "commercial-shaping",
        "discovery-gap-analysis",
        "discovery-reporting",
        "multimodal-intake",
        "sds-interpretation",
        "ideation-brief",
        "analytical-read",
        "playbook",
    }
    assert expected.issubset(names)


def test_load_skill_strips_frontmatter():
    skill = load_skill("discovery-reporting")
    assert skill.name == "discovery-reporting"
    assert "---" not in skill.body
    assert "name: discovery-reporting" not in skill.body
    assert len(skill.body) > 200


def test_discovery_skills_returns_metadata_with_name_and_description():
    skills = discover_skills()
    by_name = {s.name: s for s in skills}
    assert "discovery-reporting" in by_name
    assert "commercial-shaping" in by_name
    assert len(by_name["discovery-reporting"].description) > 50
    assert len(by_name["commercial-shaping"].description) > 50


def test_discover_skills_reads_standard_skill_md_paths():
    skills = discover_skills()
    by_name = {s.name: s for s in skills}

    assert by_name["discovery-reporting"].path.endswith(
        "prompts/chat-skills/discovery-reporting/SKILL.md"
    )


def test_build_skills_prompt_includes_all_skills_metadata():
    prompt = build_skills_prompt()
    assert "## Available Skills" in prompt
    assert "**safety-flagging**" in prompt
    assert "**commercial-shaping**" in prompt
    assert "**discovery-reporting**" in prompt


def test_compile_base_instructions_includes_metadata_not_full_bodies():
    instructions = compile_base_instructions()
    assert "## Available Skills" in instructions
    assert "**safety-flagging**" in instructions

    # Should NOT include full skill body details that are only in the markdown body
    # e.g., the detailed "## The three severity levels" section from safety-flagging
    assert "## The three severity levels" not in instructions
    assert "## Commercial shaping" not in instructions
    assert "## Discovery reporting" not in instructions


def test_compile_base_instructions_includes_base_agent_prompt():
    instructions = compile_base_instructions()
    # The base prompt is chat-agent-prompt.md — check it's included
    assert "SecondStream Discovery Agent" in instructions
    assert len(instructions) > 2000


def test_compile_base_instructions_includes_skill_loading_guidance():
    instructions = compile_base_instructions()
    assert "loadSkill" in instructions
    assert "Only metadata is shown initially" in instructions
    assert "Before performing specialized work" in instructions


def test_discovery_reporting_skill_loads_cleanly_from_disk():
    skill = load_skill("discovery-reporting")
    assert skill.name == "discovery-reporting"
    assert len(skill.body) > 200


def test_available_skill_names_returns_discovered_names():
    names = available_skill_names()
    assert "safety-flagging" in names
    assert "discovery-reporting" in names
    assert "commercial-shaping" in names


# --- Anthropic Agent Skills spec conformance ---


def test_all_skills_match_spec_name_regex():
    """Every discovered skill name must match ^[a-z0-9-]{1,64}$."""
    for skill in discover_skills():
        assert _SPEC_NAME_RE.match(skill.name), (
            f"skill name {skill.name!r} does not match spec regex"
        )


def test_all_skills_have_non_empty_description_within_spec_limit():
    """Spec: description is required and ≤ 1024 chars."""
    for skill in discover_skills():
        assert skill.description.strip(), (
            f"skill {skill.name} has empty description"
        )
        assert len(skill.description) <= _SPEC_DESCRIPTION_MAX, (
            f"skill {skill.name} description is {len(skill.description)} chars, "
            f"spec max is {_SPEC_DESCRIPTION_MAX}"
        )


def test_load_skill_rejects_invalid_name():
    """Spec regex should reject uppercase, underscore, traversal."""
    for bad in ("Safety_Flagging", "../etc", "name with space", ""):
        with pytest.raises(SkillSpecError):
            load_skill(bad)


def test_parse_frontmatter_handles_quoted_descriptions():
    """yaml.safe_load must preserve content inside quoted strings (regression for
    homebrew parser that truncated on embedded quotes)."""
    from app.agents.chat_skill_loader import _parse_frontmatter

    raw = (
        '---\n'
        'name: example-skill\n'
        'description: "first sentence. second: with colon."\n'
        '---\n'
        'body content'
    )
    meta, body = _parse_frontmatter(raw)
    assert meta["name"] == "example-skill"
    assert meta["description"] == "first sentence. second: with colon."
    assert body == "body content"


def test_parse_frontmatter_rejects_non_mapping():
    from app.agents.chat_skill_loader import _parse_frontmatter

    raw = "---\n- just\n- a list\n---\nbody"
    with pytest.raises(SkillSpecError):
        _parse_frontmatter(raw)


def test_chat_agent_prompt_has_no_ghost_skill_references():
    """Every hyphenated backtick-wrapped name in the chat agent prompt must
    correspond to either a real skill on disk or a known tool.

    Guards against re-introducing references like `trainee-mode` that have no
    backing SKILL.md.
    """
    from app.agents.chat_skill_loader import _SKILLS_DIR, available_skill_names

    prompt_path = _SKILLS_DIR.parent / "chat-agent-prompt.md"
    prompt = prompt_path.read_text(encoding="utf-8")

    real_skills = set(available_skill_names())
    known_tools = {
        "loadSkill",
        "generateIdeationBrief",
        "generateAnalyticalRead",
        "generatePlaybook",
    }
    candidates = set(re.findall(r"`([a-z0-9-]{3,64})`", prompt))
    suspect = {
        name
        for name in candidates
        if name not in real_skills
        and name not in known_tools
        and "-" in name  # only hyphenated names look like skills
    }
    assert not suspect, f"ghost skill references in prompt: {sorted(suspect)}"


def test_runtime_skill_prompts_have_no_ghost_references():
    """Runtime skill prompts must not mention ghost modes/tools like
    trainee-mode, Assessment-mode, or full specialist. These phrases
    sound like real skills/modes but have no backing implementation.
    Standalone business word 'Assessment' is allowed.
    """
    from app.agents.chat_skill_loader import _SKILLS_DIR

    ghost_patterns = [
        re.compile(r"trainee-mode"),
        re.compile(r"Assessment-mode"),
        re.compile(r"full specialist"),
        re.compile(r"full-specialist"),
    ]

    offenders = []
    for path in _SKILLS_DIR.glob("*/SKILL.md"):
        text = path.read_text(encoding="utf-8")
        for pat in ghost_patterns:
            if pat.search(text):
                offenders.append(
                    f"{path.relative_to(_SKILLS_DIR.parent.parent)}: {pat.pattern}"
                )
                break

    assert not offenders, f"ghost references found in skills: {offenders}"


def test_chat_agent_prompt_has_no_unicode_chemical_subscripts():
    """PDF rendering uses HTML entities for subscripts. Unicode subscripts in
    runtime prompts/skills risk the model emitting them in PDF JSON payloads,
    which the renderer cannot style consistently.
    """
    from app.agents.chat_skill_loader import _SKILLS_DIR

    offenders = []
    chat_prompt = _SKILLS_DIR.parent / "chat-agent-prompt.md"
    targets = [chat_prompt, *_SKILLS_DIR.glob("*/SKILL.md")]
    subscript_re = re.compile(r"[₀-₉]")  # ₀-₉

    for path in targets:
        text = path.read_text(encoding="utf-8")
        # discovery-reporting documents the rule and references the subscripts
        # by name — that mention is intentional, so skip it.
        if path.parent.name == "discovery-reporting":
            continue
        if subscript_re.search(text):
            offenders.append(str(path.relative_to(_SKILLS_DIR.parent.parent)))

    assert not offenders, f"Unicode subscripts found in: {offenders}"
