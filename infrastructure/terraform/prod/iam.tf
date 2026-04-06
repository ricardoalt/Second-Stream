# ============================================================================
# IAM Roles & Policies
# ============================================================================
# ECS Task Execution Role: Pull images, write logs
# ECS Task Role: Access AWS services (S3, Secrets Manager)
# ============================================================================

# -----------------------------------------------------------------------------
# ECS Task Execution Role (required for Fargate)
# -----------------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_task_execution_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name_prefix        = "${local.name_prefix}-ecs-exec-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution_assume.json

  tags = {
    Name = "${local.name_prefix}-ecs-execution-role"
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Custom policy: Read secrets from Secrets Manager
resource "aws_iam_role_policy" "ecs_secrets_access" {
  name_prefix = "${local.name_prefix}-ecs-secrets-"
  role        = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        # Wildcard to allow access to secret versions
        Resource = [
          "${aws_secretsmanager_secret.openai_api_key.arn}*",
          "${aws_secretsmanager_secret.jwt_secret.arn}*",
          "${aws_secretsmanager_secret.db_password.arn}*",
        ]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# ECS Task Role (permissions for application code)
# -----------------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_task_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task" {
  name_prefix        = "${local.name_prefix}-ecs-task-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume.json

  tags = {
    Name = "${local.name_prefix}-ecs-task-role"
  }
}

# S3 access for PDF storage
resource "aws_iam_role_policy" "ecs_s3_access" {
  name_prefix = "${local.name_prefix}-ecs-s3-"
  role        = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.storage.arn,
          "${aws_s3_bucket.storage.arn}/*"
        ]
      }
    ]
  })
}

# CloudWatch Logs (for application logging)
resource "aws_iam_role_policy" "ecs_cloudwatch_logs" {
  name_prefix = "${local.name_prefix}-ecs-logs-"
  role        = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.ecs.arn}:*"
      }
    ]
  })
}

# Bedrock runtime access (required by pydantic-ai model IDs like
# `bedrock:us.anthropic.claude-sonnet-4-6` using inference profiles)
#
# NOTE: We intentionally use Resource = "*" for production reliability:
# - Inference profile/model ARN coverage can vary by provider and region.
# - Over-tight scoping has caused AccessDenied in practice.
# Once exact profile/model ARNs are stabilized for all environments,
# this can be tightened in a follow-up hardening pass.
resource "aws_iam_role_policy" "ecs_bedrock_access" {
  name_prefix = "${local.name_prefix}-ecs-bedrock-"
  role        = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:GetInferenceProfile",
        ]
        Resource = "*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# ECS Exec (optional but recommended for operations)
# -----------------------------------------------------------------------------
#
# Allows `aws ecs execute-command` (SSM channel) inside running tasks.
# No cost unless you use it, and it improves incident response/debugging.
resource "aws_iam_role_policy" "ecs_ssm_access" {
  name_prefix = "${local.name_prefix}-ecs-ssm-"
  role        = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel",
        ]
        Resource = "*"
      },
    ]
  })
}
