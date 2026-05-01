from app.agents.chat_skill_loader import (
    available_skill_names,
    build_skills_prompt,
    compile_base_instructions,
    discover_skills,
    load_skill,
)


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
