from app.agents.chat_skill_loader import (
    _ALWAYS_ON,
    _is_sds_attachment,
    available_skill_names,
    build_skills_prompt,
    compile_base_instructions,
    discover_skills,
    load_skill,
    resolve_active_skills,
)
from app.services.chat_stream_protocol import ChatAgentAttachmentInput


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


def test_is_sds_attachment_detects_media_type_hint_without_filename_pattern():
    attachment = ChatAgentAttachmentInput(
        attachment_id="1",
        media_type="application/safety-data-sheet+json",
        filename="chemical-profile.json",
    )
    assert _is_sds_attachment(attachment) is True


def test_resolve_active_skills_returns_always_on_without_attachments():
    class FakeDeps:
        attachments = ()

    class FakeCtx:
        deps = FakeDeps()

    skills = resolve_active_skills(FakeCtx())
    assert skills == list(_ALWAYS_ON)


def test_resolve_active_skills_includes_multimodal_intake_for_image():
    class FakeDeps:
        pass

    class FakeCtx:
        deps = FakeDeps()
        deps.attachments = (
            ChatAgentAttachmentInput(
                attachment_id="1",
                media_type="image/jpeg",
                filename="photo.jpg",
            ),
        )

    skills = resolve_active_skills(FakeCtx())
    assert "multimodal-intake" in skills
    assert skills[: len(_ALWAYS_ON)] == list(_ALWAYS_ON)


def test_resolve_active_skills_includes_sds_for_sds_filename():
    class FakeDeps:
        pass

    class FakeCtx:
        deps = FakeDeps()
        deps.attachments = (
            ChatAgentAttachmentInput(
                attachment_id="1",
                media_type="application/pdf",
                filename="SDS_HF_acid.pdf",
            ),
        )

    skills = resolve_active_skills(FakeCtx())
    assert "sds-interpretation" in skills


def test_resolve_active_skills_includes_both_conditionals_when_both_apply():
    class FakeDeps:
        pass

    class FakeCtx:
        deps = FakeDeps()
        deps.attachments = (
            ChatAgentAttachmentInput(
                attachment_id="1",
                media_type="image/png",
                filename="sds_photo.png",
            ),
        )

    skills = resolve_active_skills(FakeCtx())
    assert "multimodal-intake" in skills
    assert "sds-interpretation" in skills


def test_resolve_active_skills_excludes_conditionals_for_text_only():
    class FakeDeps:
        pass

    class FakeCtx:
        deps = FakeDeps()
        deps.attachments = (
            ChatAgentAttachmentInput(
                attachment_id="1",
                media_type="text/plain",
                filename="notes.txt",
            ),
        )

    skills = resolve_active_skills(FakeCtx())
    assert "multimodal-intake" not in skills
    assert "sds-interpretation" not in skills
    assert skills == list(_ALWAYS_ON)


def test_available_skill_names_returns_discovered_names():
    names = available_skill_names()
    assert "safety-flagging" in names
    assert "discovery-reporting" in names
    assert "commercial-shaping" in names
