# SecondStream Moat Infrastructure

SecondStream — Moat Infrastructure

**SecondStream**

**Moat Infrastructure — AWS + Bedrock Reference Architecture**

*Founder → Engineering Lead \| Working draft for review*

**Executive summary**

This document describes the infrastructure SecondStream needs to add on top of its existing Bedrock-based agent pipeline so that every Discovery and Assessment quietly builds a proprietary data asset. The asset is the moat. The infrastructure is what makes the asset accumulate without anyone having to remember to make it accumulate.

Three things have to land:

- **A structured store** — a database in our own AWS account that captures the count-and-compare fields from every opportunity (the schema we agree separately with the senior operator).

- **A knowledge base** — a retrieval-augmented index over every report, transcript, and SDS we produce, so the agent can search past cases by meaning during new conversations.

- **A security perimeter** — end-to-end controls so this data is genuinely ours, isolated from outside access, encrypted in transit and at rest, never used to train external models, and access-controlled internally.

All of this sits inside infrastructure we already pay for. AWS Bedrock, by contract, does not retain or train on our inputs. The work below is configuration and discipline, not net-new platform spend. Estimated additional AWS run cost for this layer at our current scale: low hundreds of dollars per month, scaling roughly with opportunity volume.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>What I'm asking from engineering</strong></p>
<p>Read this as a strawman architecture. Push back on anything that doesn't fit how we already run, propose alternatives where you have stronger conviction, and come back with a scoped implementation plan that we can ship in 3–4 weeks once the schema is locked.</p></td>
</tr>
</tbody>
</table>

**What this architecture guarantees, and what it doesn't**

Two questions matter most for this build: is the data we generate genuinely ours and inaccessible to outsiders, and can we move off AWS if we ever need to. Both are good questions and both deserve straight answers — including where the answer is "yes with discipline" rather than "yes, full stop." The honest version of this section is what makes the rest of the document credible.

**Access to our intelligence: what's true**

**What this architecture genuinely guarantees.** Bedrock contractually does not retain our inputs, does not use our data to train foundation models, and does not share our data with model providers (Anthropic, in our case). Our producer conversations and agent outputs never leave our AWS account in any persistent way. The structured database, the documents, and the knowledge base all live inside our VPC, encrypted with our keys, accessible only through IAM roles we control. There is no public endpoint to the database, no shared credential, no path for an external actor to read our data without breaching AWS itself or compromising our internal credentials. For all practical purposes, the data we generate is ours and only ours.

**What this architecture guarantees with operational discipline.** The technical perimeter only holds if we operate it well. Specifically: MFA stays enforced on every human account; IAM roles stay tightly scoped; database credentials never end up in a Slack message or a public repository; engineers don't take exports home for "convenience"; access reviews actually happen quarterly. None of these are exotic — they're table stakes — but they're how the architecture stops being a diagram and becomes real protection. If the discipline lapses, the architecture cannot save us.

**What no architecture can promise.** AWS as the cloud provider runs the underlying infrastructure. They contractually do not access our data and have strong technical and legal controls preventing it, but if compelled by lawful order (subpoena, search warrant) they could be required to produce data — the same is true of any cloud provider, any colocation facility, any on-premises system in any jurisdiction with rule of law. We accept this in exchange for the operational and security benefits of running on a hyperscaler. Separately, no architecture eliminates insider risk: a determined team member with legitimate access could exfiltrate data, and the controls against this are cultural and contractual (NDAs, audit, exit procedures), not architectural. We don't claim to have eliminated either category — we claim to have managed them through the right combination of architecture, discipline, and contracts.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Bottom line on access</strong></p>
<p>For any reasonable definition of "nobody but us has access to our intelligence" — the answer is yes, with the operational discipline this document specifies. For the maximalist definition that includes AWS itself and any insider risk, no managed cloud architecture meets that bar; ours manages those risks rather than pretending they're closed.</p></td>
</tr>
</tbody>
</table>

**Portability: what moves and what doesn't**

Avoiding lock-in matters because optionality is leverage — with AWS, with future investors, with a future acquirer. Here is the honest portability picture, component by component.

|                                                 |                                                                                                                                                                                                                                                        |                                                                                                                                                                                   |
|-------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Asset**                                       | **How portable**                                                                                                                                                                                                                                       | **Effort to move**                                                                                                                                                                |
| Structured database (Postgres)                  | Fully portable. Postgres is open-source and runs on any cloud (GCP CloudSQL, Azure Database, on-prem) or self-hosted.                                                                                                                                  | 1–2 days for the data migration. The schema and queries don't change.                                                                                                             |
| Documents (S3)                                  | Fully portable. They're files. S3-compatible storage is offered by every other cloud and several independents (Cloudflare R2, Backblaze B2, Wasabi).                                                                                                   | Egress fees from AWS, then a one-time copy. 1–3 days.                                                                                                                             |
| Conversation transcripts and structured records | Fully portable. JSON and text data, no AWS-specific format.                                                                                                                                                                                            | Bundled with the above.                                                                                                                                                           |
| Agent prompts, skills, orchestration logic      | Fully portable. They're code. The agent talks to a model API; the model API can be swapped (Anthropic direct, GCP Vertex AI, Azure OpenAI, self-hosted).                                                                                               | 1–2 days to swap the model client; testing of prompt behaviour against the new endpoint is the longer item (~1 week).                                                             |
| Bedrock Knowledge Base (vector index)           | Not portable as-is — it's an AWS-managed index. The source documents are portable; the index would be rebuilt against a new vector store (e.g. self-hosted OpenSearch, Pinecone, Weaviate, pgvector).                                                  | 3–5 days of engineering plus re-indexing time. The retrieval quality should be equivalent or better, depending on the replacement.                                                |
| IAM, networking, observability config           | Conceptually portable but mechanically different on each cloud. The pattern translates; the specific config files don't.                                                                                                                               | 1 week to re-implement on a new platform.                                                                                                                                         |
| Bedrock Agents orchestration (if used)          | If we use Bedrock Agents as the orchestration layer, this is the most AWS-coupled piece. If we use a custom orchestration layer (Fargate-based) calling Bedrock for inference only, the orchestration is fully portable and only the model calls move. | 0–1 weeks depending on the choice above. This is why the architecture above recommends a custom orchestration layer over deep Bedrock Agents coupling — it preserves portability. |

**Total realistic migration effort:** two to four weeks of focused engineering, plus AWS egress fees on the data (modest at our scale — under \$1,000 even at significant volume). This is real work, but it's two to four weeks, not two to four months. We are not held hostage.

**What gives us this portability is design discipline now, not luck later.** Specifically: keeping the orchestration layer in our own code rather than buried in Bedrock Agents; storing the source documents in their native formats rather than AWS-proprietary structures; using open-source database engines (Postgres) rather than AWS-only ones (Aurora's Postgres-compatible mode is fine — it speaks standard Postgres wire protocol). Engineering should treat the portability test as a design constraint: at every architectural choice, ask "if we had to leave AWS in three months, what would this cost us?" If the answer is "a rebuild," pick differently.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>Bottom line on portability</strong></p>
<p>Our data and our agent logic are portable. The two AWS-coupled pieces (Bedrock Knowledge Base index, Bedrock Agents if used) are rebuild-not-migrate, but the rebuild is days, not months. The full migration is two to four weeks of focused engineering. The exit plan in the appendix below makes this concrete.</p></td>
</tr>
</tbody>
</table>

**The architecture in one paragraph**

Field agents talk to producers through the SecondStream app. The app calls Bedrock-hosted Claude via Bedrock Agents (or a custom orchestration layer — engineering call). The agent runs Discovery, generates the report, and at the end emits two things in parallel: a PDF/Markdown document that goes to the producer and into S3, and a JSON record that gets validated against our schema and written to a relational database. The S3 documents are indexed into a Bedrock Knowledge Base. During subsequent conversations, the agent can query the Knowledge Base for similar past cases and the database for analytical lookups. Everything sits inside one VPC in one AWS account, with KMS encryption, IAM-based access, no public ingress beyond the app's API gateway, and CloudTrail logging every access.

**The five decisions you're being asked to make**

These are the calls where engineering judgement is needed. The rest is conventional.

|        |                                                                                                  |                                                                                                                                                                                                     |
|--------|--------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **\#** | **Decision**                                                                                     | **Why it matters**                                                                                                                                                                                  |
| 1      | Bedrock region (us-east-1 vs us-west-2)                                                          | Affects model availability, latency from US producers, and data-residency story. Recommend us-east-1 for model breadth unless you have an existing west-coast preference.                           |
| 2      | Structured store: Aurora PostgreSQL vs DynamoDB vs both                                          | Aurora is the right answer for analytical queries (count, compare, slice). DynamoDB is tempting for simplicity but punishes us on the queries we'll most want to run. Recommend Aurora.             |
| 3      | Knowledge base: Bedrock Knowledge Bases (managed) vs self-hosted (OpenSearch + custom retrieval) | Managed gets us running in days. Self-hosted gives more retrieval control. Recommend managed for v1, revisit at year-end if retrieval quality is limiting.                                          |
| 4      | Single AWS account vs multi-account (separate prod/data)                                         | Multi-account is the right long-term answer for blast-radius isolation. Single account is fine for v1 if we're disciplined with IAM. Recommend single account now, plan for split inside 12 months. |
| 5      | Schema migration tooling                                                                         | We will evolve the schema quarterly. Pick the migration tool now (e.g. Flyway, Liquibase, Prisma Migrate) so we don't end up running ALTER TABLE statements by hand.                                |

**Reference architecture**

**Component map**

The infrastructure breaks into seven layers. Engineering's job is to wire them together; this section names each one and what it's responsible for.

|                         |                                     |                                                                                                                                                                           |
|-------------------------|-------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Layer**               | **AWS service**                     | **Responsibility**                                                                                                                                                        |
| Edge / API              | API Gateway + WAF + CloudFront      | Single front door for the SecondStream app. WAF blocks abuse, rate limits, geo-fencing if needed. No service in the layers below is reachable from the internet directly. |
| Compute / orchestration | ECS Fargate or Lambda               | Runs the agent orchestration logic, the schema validation, the document generation pipeline. Stateless — scales horizontally.                                             |
| AI / inference          | Amazon Bedrock                      | Claude models for Discovery, Assessment, structured extraction, and knowledge-base retrieval. No fine-tuning required for v1.                                             |
| Knowledge base          | Bedrock Knowledge Bases (managed)   | Retrieval-augmented index over reports, transcripts, SDSs. Returns relevant past cases to the agent during new conversations.                                             |
| Document store          | S3 (Standard + Glacier transition)  | Source-of-truth storage for every PDF, transcript, and uploaded SDS. Versioned, encrypted, lifecycle-managed.                                                             |
| Structured store        | Aurora PostgreSQL Serverless v2     | The schema-validated database of opportunity records. The thing we count and compare across.                                                                              |
| Observability & audit   | CloudWatch + CloudTrail + GuardDuty | Every API call, every database read, every knowledge-base query is logged. Anomalies are flagged. Audit trail for any future security review.                             |

**How a Discovery flows through it**

Concrete walk-through, so you can see where the data deposits happen.

- Field agent opens a Discovery in the SecondStream app and starts a conversation about a specific producer opportunity.

- The app calls our orchestration layer (Fargate). The orchestrator initialises a Bedrock conversation with Claude using our Discovery system prompt and the relevant skills (sub-discipline-router, specialist-lens-light, sds-interpretation, etc.).

- Throughout the conversation, the agent may call the knowledge base via the orchestrator — "have we seen chlorinated solvent streams from refineries before; what did the typical hazard profile look like?" The knowledge base returns relevant snippets from past reports.

- When the agent reaches the qualification gate and produces the Ideation Brief, three things happen in parallel: the PDF is generated and stored in S3; the conversation transcript is stored in S3; a structured JSON record matching our schema is emitted by the agent.

- The orchestrator validates the JSON against the schema. If validation passes, it writes the record to Aurora. If validation fails, it writes a partial record with a quality flag and queues a notification for human review — we never silently drop data.

- S3 events trigger Bedrock Knowledge Bases to ingest the new document into the retrieval index, so it's available to the agent in future conversations.

- CloudTrail logs every step. The agent's "data completeness percentage" field gets calculated and stored alongside the record.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>The thing that makes this work</strong></p>
<p>Notice that the field agent never sees any of this. They have a conversation, the agent produces a document, the producer gets what they need. The moat building happens silently in the background. If anyone ever has to remember to do a manual data-entry step, the system has failed.</p></td>
</tr>
</tbody>
</table>

**Security perimeter — "nobody accesses our database"**

This section addresses the founder's specific concern: the data we accumulate must be genuinely ours, isolated, and inaccessible to anyone outside the company. Below are the layers of defence, ordered by what they protect against.

**1. Bedrock data-handling guarantees**

The single most important thing to know: Amazon Bedrock contractually does not retain inputs or outputs, does not use customer data to train foundation models, and does not share data with model providers (Anthropic, in our case). Our producer conversations never leave our AWS account boundary in any persistent way. This is the architectural reason Bedrock is the right home for sensitive vertical work — the same reason banks, healthcare systems, and defence contractors host regulated workloads on it.

Action: include the relevant Bedrock data-handling terms in our security overview document. Reference the AWS Service Terms section on Bedrock — engineering can pull the current language.

**2. Network isolation**

- **Single VPC** containing all our compute, database, and supporting services. No public subnets except the API Gateway / WAF entry point.

- **VPC endpoints** (AWS PrivateLink) for Bedrock, S3, and other AWS services we consume. Traffic to Bedrock never traverses the public internet.

- **Aurora in private subnets only.** No public IP, no public endpoint. Reachable only from inside the VPC, only from named security groups.

- **Security groups as deny-by-default.** Each service explicitly declares which other services it accepts traffic from, on which ports. The orchestrator can hit Aurora; nothing else can.

**3. Encryption**

- **Encryption at rest,** everywhere. Aurora, S3, EBS volumes, Bedrock Knowledge Bases vector store. AWS-managed KMS keys are acceptable for v1; consider customer-managed keys (CMKs) when we onboard producers who require it.

- **Encryption in transit.** TLS 1.2+ on every API. Internal service-to-service traffic also TLS-encrypted, not just relying on VPC isolation.

- **Field-level encryption for PII.** Producer contact details, site addresses below the city level, and named-individual data should be encrypted at the application layer with a separate key, so even a database read doesn't expose them in plain text.

**4. Identity and access**

- **IAM roles, not IAM users, for every service.** No long-lived access keys living in environment variables.

- **Least privilege.** Each role gets exactly the permissions it needs. The orchestrator role can read/write Aurora and call Bedrock; it cannot, for instance, modify IAM or read CloudTrail.

- **MFA enforced for all human AWS console access** without exception.

- **Database access from humans is gated by AWS SSO (Identity Center).** No shared credentials. Every query is attributable to a named human.

- **Read-only by default.** Even engineers with database access read through a read-only role unless they're actively running a migration. Write access requires explicit elevation, logged.

**5. Audit and detection**

- **CloudTrail enabled across all regions,** logs immutable, stored in a separate logging account or at minimum a separate S3 bucket with object-lock enabled.

- **GuardDuty enabled.** Anomalous API calls (e.g. an unfamiliar IP making large queries) generate alerts.

- **Database query logging.** Aurora Performance Insights plus query-level logging for any access not coming from the orchestrator. Direct human queries should be rare and visible.

- **Quarterly access review.** Whoever owns security walks through who has access to what and removes anything that isn't earning its place.

**6. Producer-data legal posture**

The technical perimeter is necessary but not sufficient. The data is only legally ours to use and retain if our engagement with producers explicitly grants those rights. This is a contracts question more than an infrastructure question, but it belongs on engineering's radar because it shapes what the system is allowed to do:

- Producer terms of engagement must include explicit retention and use clauses for operational data generated during Discovery and Assessment. Our US-counsel review of these clauses should happen before we ingest any production data into the structured store.

- Where producer-supplied SDSs and analytical reports are included, retention should be lawful (the producer gave us the document for a purpose) but redistribution is constrained. Documents in the knowledge base should never be exposed verbatim to other producers.

- Any future move to share or sell aggregated insights externally needs a separate legal pass. The architecture supports it; the contracts may not yet.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>What to escalate to founder before launch</strong></p>
<p>If any of these aren't already in place: producer-side contract language for retention, an MFA mandate, MFA for AWS console, CloudTrail with object-lock. These are the four "if-they're-not-there-it's-a-real-problem" items. Everything else can iterate.</p></td>
</tr>
</tbody>
</table>

**Build plan**

Phased so we can ship the moat layer without disrupting what's already running.

**Phase A — foundations (week 1–2)**

- Audit existing AWS account against the security checklist above. Close any gaps before adding new services.

- Stand up the VPC, subnets, security groups, KMS keys for the moat layer if they don't exist already.

- Create dedicated IAM roles for orchestrator, ingest pipeline, and human read-only access.

- Decide region (call \#1) and document the data-residency story for the security overview.

**Phase B — structured store (week 2–3, parallel with A)**

- Provision Aurora PostgreSQL Serverless v2 in private subnets. Encryption at rest with KMS.

- Build the schema from v1 (whatever we land on with the senior operator). Choose migration tool (call \#5) and apply v1 as the first migration.

- Build the ingest API: takes a JSON record from the orchestrator, validates against schema, writes to Aurora with completeness flags.

- Build a minimal admin read-only query interface (e.g. Metabase or a thin internal app) so we can sanity-check what's landing.

**Phase C — knowledge base (week 3–4)**

- Provision Bedrock Knowledge Base, configure embeddings model, set up the S3 source bucket.

- Wire the orchestrator to ingest every new document into the knowledge base on creation.

- Add a knowledge-base retrieval tool to the agent's tool set, with prompt guidance on when to use it.

- Test retrieval quality against a small set of fabricated past cases — does it find what it should, does it surface what it shouldn't.

**Phase D — agent pipeline integration (week 4)**

- Modify the agent prompt to emit the structured JSON record alongside the document, validated against the schema.

- Wire orchestrator to capture both outputs and route them to S3 + Aurora respectively.

- End-to-end test on a fabricated Discovery: agent runs, document is produced, structured record lands, knowledge base ingests, subsequent agent run can retrieve.

**Phase E — observability and review (ongoing)**

- CloudTrail, GuardDuty, CloudWatch dashboards in place from day one.

- Monthly review of structured-store completeness — what % of records have outcome data filled in, where are the gaps.

- Quarterly schema review — what fields aren't earning their place, what new fields the data is asking for.

**Total elapsed time**

4 weeks of engineering for an engineer who knows the existing codebase. Add 1–2 weeks of buffer for the security review and any surprises in the existing AWS account. Schema design (the parallel work with the senior operator) should be done in the same window — we want the schema locked by end of week 2 so phases B and D have something concrete to build against.

**Indicative cost**

Order-of-magnitude only. Real numbers depend on opportunity volume and document size.

|                                                     |                                                    |                                                                                               |
|-----------------------------------------------------|----------------------------------------------------|-----------------------------------------------------------------------------------------------|
| **Service**                                         | **Driver**                                         | **Indicative monthly at our current scale**                                                   |
| Bedrock inference (Claude)                          | Token volume per Discovery × number of Discoveries | Already in our run-rate; this layer adds maybe 10–20% for retrieval and structured extraction |
| Aurora PostgreSQL Serverless v2                     | Min capacity unit + storage                        | \$60–150 at low volume, scales modestly with records                                          |
| S3 (standard + lifecycle to Glacier)                | Document storage and retrieval                     | \$10–30 — documents are small, count grows linearly                                           |
| Bedrock Knowledge Bases                             | Embeddings + vector storage + retrieval queries    | \$50–200 depending on document count and query rate                                           |
| Observability (CloudTrail / GuardDuty / CloudWatch) | Account-wide                                       | \$30–80                                                                                       |
| Networking (VPC endpoints, NAT)                     | Account-wide                                       | \$30–60                                                                                       |
| Total marginal cost of moat infrastructure          |                                                    | Roughly \$200–500/month at our current scale, scaling linearly with opportunity volume        |

This is a rounding error against the value of the asset being built. Worth saying explicitly: the cost of not building this layer (no moat, no analytical insight, no compounding asset) is many orders of magnitude higher than the run cost.

**Risks and how we manage them**

|                                                                        |                                                                                                                                                                                                                                                                                                         |
|------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Risk**                                                               | **How we manage it**                                                                                                                                                                                                                                                                                    |
| Schema designed badly — fields we'll never use, fields we need missing | Strawman process with senior operator before build. Quarterly review afterwards. Schema versioning so we can evolve without breaking history.                                                                                                                                                           |
| Outcome data never gets filled in — "the dead-data problem"            | Outcome capture must be a workflow obligation, not an optional field. Designate an owner. Dashboard the % of records with outcome filled in. If it drops below 70% at 6 months, the moat is failing.                                                                                                    |
| Knowledge base returns irrelevant or hallucinated past cases           | Test retrieval quality early. Tag every retrieval result in the report so we can audit accuracy. Tune chunking and embeddings if quality is poor.                                                                                                                                                       |
| A producer contract didn't grant retention rights                      | Audit producer engagement contracts before ingestion. Establish a default clause with US counsel. Maintain a list of producers whose data has restrictive terms — the orchestrator should know.                                                                                                         |
| AWS account compromise                                                 | MFA, IAM hygiene, GuardDuty, CloudTrail with object-lock, regular access review. None of these is glamorous; all of them are necessary.                                                                                                                                                                 |
| Vendor lock-in to Bedrock                                              | Designed for portability from day one — orchestration in our own code, open-source Postgres, native document formats. Realistic full migration: 2–4 weeks of engineering. See the portability section above and the exit-plan appendix at the back of this document for the concrete migration runbook. |
| Engineering departure mid-build                                        | Document the architecture as we build it. Make the configuration as much code (Terraform, CDK) as possible. Avoid clever tricks that live in one engineer's head.                                                                                                                                       |

**Founder's checklist for the engineering conversation**

If you walk into the architecture conversation with engineering and these things get answered clearly, you're in good shape. If any of them get hand-waved, push.

- **Region decision and data-residency story.** Where does our data live, and can we tell a producer truthfully?

- **Database choice with a real reason.** Aurora vs DynamoDB vs something else, and why.

- **Knowledge base approach.** Managed Bedrock Knowledge Bases for v1, or are we self-hosting? Trade-offs explicit.

- **Schema migration tooling chosen.** We will evolve the schema. Tooling now, not later.

- **Security perimeter walked through.** Engineering can articulate the network, encryption, IAM, and audit story without reading from a checklist.

- **Outcome-capture workflow named.** Who fills in outcome status, when, and what makes them remember.

- **Build plan with explicit phases and owner.** Not "we'll figure it out" — actual sequenced work.

- **Cost estimate within 2× of the indicative numbers above.** If they come back with a number much higher, dig in.

- **What can be Terraform / CDK from day one.** Configuration in code is what makes this maintainable. Click-ops doesn't scale.

- **Honest assessment of where the existing infrastructure already covers what we need vs where it doesn't.** We don't want to rebuild things we already have.

**Appendix: AWS exit plan**

This appendix exists not because we plan to leave AWS, but because having an exit plan is what proves we're not held hostage. It's an asset for any future investor, partner, or acquirer conversation, and it forces engineering to design with portability in mind. Treat it as a live document — review it annually, keep it current.

**Trigger conditions — when this plan would be activated**

None of the following are predicted; all of them are plausible enough that having a plan in hand is prudent.

- AWS materially changes pricing or terms in a way that breaks our economics.

- AWS becomes a competitor — for instance, by offering a hazardous-waste vertical agent product that conflicts with ours.

- A major customer or acquirer requires us to run on a different cloud (GCP, Azure, or sovereign cloud) for their compliance reasons.

- A regulatory shift (US data-localisation rule, sectoral mandate) forces a move.

- AWS suffers a sustained outage or trust event that crosses the threshold for moving.

**Migration runbook (target platform: GCP — substitute as needed)**

This is the rough sequence of work for a full migration. Adjust the platform-specific service names if the target is Azure, Oracle Cloud, sovereign cloud, or self-hosted. The shape is the same.

**Phase 1 — preparation (week 1)**

- Inventory all AWS resources currently in use. Terraform/CDK state files are the source of truth here — another reason to keep infrastructure as code from day one.

- Stand up a target environment on the new platform — VPC equivalent, IAM equivalent, encryption keys, observability.

- Decide on equivalents for AWS-specific services: model host (Anthropic API direct, or Vertex AI for Claude on GCP, or Azure OpenAI), vector store (pgvector on the same Postgres, or Pinecone, or self-hosted OpenSearch), object storage (GCS, Azure Blob, R2).

- Set up a parallel observability stack on the new platform — same dashboards, same alerts.

**Phase 2 — data migration (week 1–2)**

- Database: snapshot Aurora Postgres, restore to managed Postgres on the new platform (Cloud SQL, Azure Database, or self-hosted). Test queries against the migrated database; expect zero changes to schema or query behaviour.

- Documents: copy S3 buckets to the new object storage. Use AWS DataSync or a custom script. Egress fees apply — budget accordingly. Verify object counts and a sample of checksums.

- Knowledge base: re-ingest source documents into the new vector store. Test retrieval quality against a fixed set of test queries; tune chunk size and embeddings if quality drops.

- Audit logs: archive the existing CloudTrail history to long-term storage on the new platform; start fresh logging on the new platform.

**Phase 3 — application migration (week 2–3)**

- Swap the model client to point at the new model host. Run the regression test suite against the agent — does it produce equivalent output on a fixed set of test Discoveries?

- Swap the vector-store client to point at the new knowledge base. Re-run retrieval quality tests.

- Update orchestration layer's environment configuration to point at new database, new storage, new IAM.

- Run end-to-end tests on a fabricated Discovery: agent runs, document is produced, structured record lands, knowledge base ingests, subsequent agent run can retrieve.

**Phase 4 — cutover (week 3–4)**

- Run both environments in parallel for 1–2 weeks. New Discoveries write to both. Detect divergence early.

- Migrate the SecondStream app's traffic to the new environment progressively (10%, 50%, 100%).

- Monitor for issues; have rollback procedure ready and tested.

- Once stable, decommission the AWS environment in stages: stop new writes, archive final state, delete after a 30-day cooling period.

**Estimated cost of migration**

|                                                                              |                                                                          |
|------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| **Cost component**                                                           | **Estimate at our current scale**                                        |
| Engineering effort (2–4 weeks, 1–2 senior engineers)                         | \$30,000–\$80,000 in fully-loaded engineering time                       |
| AWS egress fees (data transfer out)                                          | Under \$1,000 at our current data volume; scales with growth             |
| Parallel-run period (running both environments simultaneously for 1–2 weeks) | \$500–\$2,000 (mostly the duplicate inference and database costs)        |
| New platform setup costs (one-off)                                           | Under \$1,000 in service provisioning                                    |
| Total realistic migration cost                                               | \$30,000–\$85,000 including engineering, achievable in 3–4 elapsed weeks |

This is real money but it is not catastrophic money. It's roughly the cost of one senior hire's salary for a quarter — the kind of number that's discussable in a board meeting, not a company-killer.

**Design constraints that protect portability**

These are the choices we should hold engineering to as the architecture evolves. Each one preserves an exit option.

- **Orchestration in our own code, not Bedrock Agents.** The agent prompts and tool definitions live in our codebase, not in AWS-managed configuration. We use Bedrock for inference only.

- **Open-source database engines.** Postgres, not DynamoDB or any AWS-only data service. Aurora's Postgres-compatible mode is fine — it speaks standard Postgres.

- **Documents stored in their native formats.** PDFs as PDFs, transcripts as text, structured records as JSON. No AWS-proprietary serialisation.

- **Infrastructure as code.** Terraform or CDK from day one. Configuration we can read, version, and translate to a new platform. No "click-ops" environments that exist only in someone's AWS console memory.

- **Standard protocols at every interface.** Postgres wire protocol, S3 API, OpenAI/Anthropic-compatible model APIs, standard OAuth/OIDC for auth. Avoid AWS-specific protocols where alternatives exist.

- **Annual portability test.** Once a year, an engineer runs through this exit plan as a tabletop exercise. Updates the document. Identifies anything that's drifted into being more AWS-coupled than it should be. Half a day's work. Pays for itself the day we ever need it.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr class="odd">
<td><p><strong>The principle behind this appendix</strong></p>
<p>Optionality is leverage. The day we sign a deal with AWS where leaving would cost us six months and a million dollars is the day they own the negotiation. Keeping the exit plan current — and keeping the architecture honest about portability — is what keeps the leverage on our side. We're not planning to leave; we're protecting the option to.</p></td>
</tr>
</tbody>
</table>

*End of document.*
