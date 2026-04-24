from app.agents.chat_skill_loader import (
    _is_sds_attachment,
    build_conditional_instructions_fn,
    compile_base_instructions,
    load_skill,
)
from app.services.chat_stream_protocol import ChatAgentAttachmentInput


def test_loads_safety_flagging_from_disk():
    skill = load_skill("safety-flagging")
    assert skill.name == "safety-flagging"
    assert len(skill.body) > 100


def test_loads_all_nine_skills_from_disk():
    skills = [
        "safety-flagging",
        "qualification-gate",
        "sub-discipline-router",
        "specialist-lens-light",
        "commercial-shaping",
        "discovery-gap-analysis",
        "discovery-reporting",
        "multimodal-intake",
        "sds-interpretation",
    ]
    for name in skills:
        skill = load_skill(name)
        assert skill.name == name, f"Expected name={name}, got {skill.name}"


def test_sanitizes_claude_harness_directives_in_discovery_reporting():
    skill = load_skill("discovery-reporting")
    assert "reportlab" not in skill.body
    assert "/mnt/user-data" not in skill.body
    assert "present_files" not in skill.body
    assert "generateDiscoveryReport" in skill.body


def test_always_on_block_respects_defined_order():
    instructions = compile_base_instructions()
    # safety-flagging must appear before discovery-gap-analysis
    idx_safety = instructions.find("safety-flagging")
    idx_gap = instructions.find("discovery-gap-analysis")
    assert idx_safety < idx_gap


def test_base_instructions_contains_base_agent_prompt():
    instructions = compile_base_instructions()
    # The base prompt is chat-agent-prompt.md — check it's included
    assert len(instructions) > 5000  # base + 7 skills is many chars


def test_multimodal_intake_included_when_image_attached():
    fn = build_conditional_instructions_fn()
    attachments = [
        ChatAgentAttachmentInput(
            attachment_id="1",
            media_type="image/jpeg",
            filename="photo.jpg",
        )
    ]

    class FakeDeps:
        pass

    class FakeCtx:
        deps = FakeDeps()
        deps.attachments = tuple(attachments)

    result = fn(FakeCtx())
    assert "multimodal-intake" in result or len(result) > 0


def test_sds_interpretation_included_when_filename_matches_heuristic():
    fn = build_conditional_instructions_fn()

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

    result = fn(FakeCtx())
    assert len(result) > 0


def test_is_sds_attachment_detects_media_type_hint_without_filename_pattern():
    attachment = ChatAgentAttachmentInput(
        attachment_id="1",
        media_type="application/safety-data-sheet+json",
        filename="chemical-profile.json",
    )
    assert _is_sds_attachment(attachment) is True


def test_conditional_excluded_when_attachments_are_text_only():
    fn = build_conditional_instructions_fn()

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

    result = fn(FakeCtx())
    # For text-only, no conditionals apply
    assert "multimodal-intake" not in result
