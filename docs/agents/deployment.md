## Deployment

### Production Bedrock readiness (ECS/Fargate)

SecondStream backend/worker agents call Bedrock through `pydantic-ai` model IDs (for example `bedrock:us.anthropic.claude-sonnet-4-6`).

For production to work reliably, all of the following must be true:

1. ECS **task role** can call Bedrock inference APIs.
2. Runtime containers have explicit AWS region env vars (`AWS_REGION` and `AWS_DEFAULT_REGION`).
3. Bedrock model/inference-profile access is enabled in the AWS account + region.

### What Terraform now covers

Terraform `infrastructure/terraform/prod` now provisions the production-side wiring for Bedrock runtime usage:

- `iam.tf`: ECS task role policy grants:
  - `bedrock:InvokeModel`
  - `bedrock:InvokeModelWithResponseStream`
  - `bedrock:GetInferenceProfile`
- `locals.tf`: all ECS containers now receive:
  - `AWS_REGION = var.aws_region`
  - `AWS_DEFAULT_REGION = var.aws_region`
  - Existing `S3_REGION = var.aws_region` remains unchanged.

Implementation note: Bedrock permissions are currently scoped to `Resource = "*"` for correctness/reliability with inference-profile-based routing. Tighter ARN scoping can be added later once profile/model ARN coverage is fully stabilized across environments.

### What remains manual in AWS Console / account setup

Terraform cannot grant provider model access on your behalf inside Bedrock. You must still do these account-level steps:

1. In **Bedrock → Model access**, enable the required Anthropic model/inference profile in the same region as `var.aws_region`.
2. Ensure no SCP/permission boundary blocks these actions for the ECS task role:
   - `bedrock:InvokeModel`
   - `bedrock:InvokeModelWithResponseStream`
   - `bedrock:GetInferenceProfile`
3. If using cross-account deployment, verify trust/guardrails do not deny Bedrock runtime calls.

### Post-deploy verification (exact commands)

Run from repo root after `terraform apply`:

```bash
export AWS_REGION="us-east-1"
export ECS_CLUSTER="$(terraform -chdir=infrastructure/terraform/prod output -raw ecs_cluster_name)"
export ECS_SERVICE="$(terraform -chdir=infrastructure/terraform/prod output -raw ecs_service_name)"
export TASK_DEF_ARN="$(aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE" --query 'services[0].taskDefinition' --output text)"
export TASK_ROLE_ARN="$(aws ecs describe-task-definition --task-definition "$TASK_DEF_ARN" --query 'taskDefinition.taskRoleArn' --output text)"
```

Verify IAM allows required Bedrock actions:

```bash
aws iam simulate-principal-policy \
  --policy-source-arn "$TASK_ROLE_ARN" \
  --action-names bedrock:InvokeModel bedrock:InvokeModelWithResponseStream bedrock:GetInferenceProfile \
  --resource-arns "*" \
  --query 'EvaluationResults[].{Action:EvalActionName,Decision:EvalDecision}' \
  --output table
```

Verify region env vars are present in task definition:

```bash
aws ecs describe-task-definition \
  --task-definition "$TASK_DEF_ARN" \
  --query "taskDefinition.containerDefinitions[0].environment[?name=='AWS_REGION' || name=='AWS_DEFAULT_REGION' || name=='S3_REGION']" \
  --output table
```

Check service health and recent logs:

```bash
curl -fsS "https://$(terraform -chdir=infrastructure/terraform/prod output -raw alb_dns_name)/health"
aws logs tail "$(terraform -chdir=infrastructure/terraform/prod output -raw cloudwatch_log_group)" --since 10m --format short
```

Expected outcome:
- IAM simulation decisions are `allowed` for all three Bedrock actions.
- ECS task definition contains `AWS_REGION`, `AWS_DEFAULT_REGION`, and `S3_REGION`.
- Health endpoint returns success.
- No Bedrock `AccessDenied` errors in ECS logs during AI request execution.

### Backend
```bash
# Build Docker image
cd backend
docker build -t waste-platform-backend .
```

### Frontend
- Build via `bun run build` (deploy pipeline handles hosting).

### Notes
- Backend and frontend deploy independently; keep versions aligned via atomic commits in the monorepo.
- `backend/scripts/healthcheck_bulk_import_worker.py` reads `/proc/*/cmdline`; Linux/container-only healthcheck path.
- Voice transcription still depends on OpenAI (`OPENAI_API_KEY` secret must remain configured in production).
