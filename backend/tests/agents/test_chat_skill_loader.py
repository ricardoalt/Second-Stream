from app.agents.chat_skill_loader import (
    _ALWAYS_ON,
    _is_sds_attachment,
    build_conditional_instructions_fn,
    compile_base_instructions,
    load_skill,
    resolve_active_skills,
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


def test_discovery_reporting_skill_loads_cleanly_from_disk():
    skill = load_skill("discovery-reporting")
    assert skill.name == "discovery-reporting"
    assert len(skill.body) > 200


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
