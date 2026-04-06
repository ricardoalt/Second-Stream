# ============================================================================
# Local Values
# ============================================================================
# Computed values used throughout the configuration
# ============================================================================

locals {
  # Naming convention: {project}-{environment}-{resource}
  name_prefix = "${var.project_name}-${var.environment}"

  # Common tags (merged with default_tags from provider)
  common_tags = {
    Terraform  = "true"
    CostCenter = "Engineering"
  }

  # Network configuration
  azs = var.availability_zones

  # Subnet CIDR calculations
  public_subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 8, 1), # 10.0.1.0/24
    cidrsubnet(var.vpc_cidr, 8, 2), # 10.0.2.0/24
  ]

  private_subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 8, 10), # 10.0.10.0/24
    cidrsubnet(var.vpc_cidr, 8, 11), # 10.0.11.0/24
  ]

  # Container environment variables
  # Non-sensitive vars only (secrets via Secrets Manager)
  container_environment = [
    {
      name  = "ENVIRONMENT"
      value = var.environment
    },
    {
      name  = "DEBUG"
      value = "false"
    },
    {
      name  = "LOG_LEVEL"
      value = "INFO"
    },
    {
      name  = "POSTGRES_SERVER"
      value = aws_db_instance.main.address
    },
    {
      name  = "POSTGRES_PORT"
      value = "5432"
    },
    {
      name  = "POSTGRES_DB"
      value = var.db_name
    },
    {
      name  = "POSTGRES_USER"
      value = var.db_username
    },
    {
      name  = "REDIS_HOST"
      value = aws_elasticache_cluster.main.cache_nodes[0].address
    },
    {
      name  = "REDIS_PORT"
      value = "6379"
    },
    {
      name  = "USE_LOCAL_STORAGE"
      value = "false"
    },
    {
      name  = "S3_BUCKET"
      value = aws_s3_bucket.storage.id
    },
    {
      name  = "S3_REGION"
      value = var.aws_region
    },
    {
      name  = "AWS_REGION"
      value = var.aws_region
    },
    {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    },
    {
      name  = "CORS_ORIGINS"
      value = var.cors_origins
    },
    {
      name  = "BACKEND_URL"
      value = var.enable_https && var.acm_certificate_arn != "" ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
    },
    {
      name  = "PYTHONPATH"
      value = "/app"
    },
  ]

  # Container secrets (from Secrets Manager)
  # Default behavior: wire the secret ARN (AWSCURRENT) into ECS.
  # Optional: if `manage_secret_values=true`, wire the version ARN instead.
  container_secrets = [
    {
      name      = "OPENAI_API_KEY"
      valueFrom = try(aws_secretsmanager_secret_version.openai_api_key[0].arn, aws_secretsmanager_secret.openai_api_key.arn)
    },
    {
      name      = "SECRET_KEY"
      valueFrom = try(aws_secretsmanager_secret_version.jwt_secret[0].arn, aws_secretsmanager_secret.jwt_secret.arn)
    },
    {
      name      = "POSTGRES_PASSWORD"
      valueFrom = aws_secretsmanager_secret_version.db_password.arn
    },
  ]
}
