# Security Documentation

## Introduction

SecondStream is a waste-opportunity platform that connects opportunities with AI-powered proposal generation.

Main system flow:

- Internet -> ALB (TLS 1.3) -> ECS Fargate -> RDS / ElastiCache / S3
- Secrets Manager provides the DB password, JWT secret, and API keys

## Main services we use

1. Amazon RDS for PostgreSQL
   - Primary relational database
   - Stores application data
   - Runs in private subnets

2. Amazon ElastiCache for Redis
   - Used for rate limiting and cache data
   - Runs in private subnets

3. ECS Fargate
   - Runs the backend API and workers
   - No public IP is assigned

4. Application Load Balancer
   - Exposes the public HTTPS endpoint
   - Handles TLS termination

5. AWS Secrets Manager
   - Stores secrets outside the codebase
   - Used for DB credentials, JWT secret, and API keys

6. Amazon S3
   - Stores uploaded files
   - Access is limited to the application role

7. Terraform
   - Defines the infrastructure as code
   - Keeps the AWS setup reproducible

## AWS infrastructure security

### Amazon RDS for PostgreSQL

Control | Status | Notes
--- | --- | ---
Encryption at rest | Enabled | Uses AWS KMS
Public access | Disabled | Not reachable from the internet
Private subnets | Enabled | Network isolated
Security groups | Restricted | ECS tasks only on port 5432
Deletion protection | Enabled in prod | Prevents accidental deletion
Backups | Enabled in prod | Recovery support
Performance Insights | Enabled in prod | Monitoring support

Why it is secure:

- The database is not exposed to the internet
- Network access is limited to backend tasks only
- Stored data is encrypted
- Credentials are not hardcoded

### Amazon ElastiCache for Redis

Control | Status | Notes
--- | --- | ---
Private subnets | Enabled | Network isolated
Security groups | Restricted | ECS tasks only
Usage | Controlled | Rate limiting and cache data

Why it is secure:

- It is not internet-facing
- Only the application can access it
- It does not store the core business data

### ECS Fargate

Control | Status | Notes
--- | --- | ---
Network mode | awsvpc | Each task gets its own ENI
Public IP | Disabled | Tasks stay private
Security groups | Restricted | ALB only to backend
IAM roles | Enabled | Execution role and task role separated
CloudWatch logs | Enabled | Centralized logging
Circuit breaker | Enabled | Auto rollback on failed deploys

Why it is secure:

- Containers are not reachable directly from the internet
- IAM permissions are limited by role
- Logs are centralized for auditing

### Application Load Balancer

Control | Status | Notes
--- | --- | ---
TLS policy | Enabled | TLS 1.3 policy
HTTP to HTTPS redirect | Enabled | Forces secure traffic
Security groups | Restricted | HTTPS only in production

Why it is secure:

- External traffic is encrypted in transit
- The backend is not exposed directly
- Old insecure HTTP access is redirected

### IAM

Control | Status | Notes
--- | --- | ---
Least privilege | Enabled | Minimal permissions per role
Secrets access | Restricted | Only required secrets are readable
Task role separation | Enabled | Execution and app permissions split

Why it is secure:

- Each role has the minimum access needed
- Secrets are pulled at runtime from Secrets Manager
- Application code does not need static AWS credentials

### AWS Secrets Manager

Stored secret | Status | Notes
--- | --- | ---
Database password | Stored | Auto-generated
JWT secret | Stored | Random secret value
OpenAI API key | Stored | Runtime injected

Why it is secure:

- Secrets are not stored in source code
- Secrets are not committed to version control
- Secrets are encrypted at rest by AWS

### Amazon S3

Control | Status | Notes
--- | --- | ---
Encryption | Enabled | Server-side encryption
Public access block | Enabled | No public bucket access
Bucket policy | Restricted | Application role only

Why it is secure:

- Uploaded files are protected at rest
- No public bucket access is allowed
- Only the backend can read and write files

## Application security

### Authentication

Control | Status | Notes
--- | --- | ---
JWT | Enabled | Token-based auth
Bcrypt password hashing | Enabled | Passwords are not stored in plain text
Token expiry | Enabled | Limited lifetime

Why it is secure:

- Passwords are never stored in plain text
- Tokens are signed and time-limited

### Authorization

Control | Status | Notes
--- | --- | ---
Organization scoping | Enabled | Data isolated by org
FastAPI dependencies | Enabled | Protected routes enforced centrally

Why it is secure:

- Users only see data from their organization
- Cross-tenant access is prevented at the application layer

### Rate limiting

Control | Status | Notes
--- | --- | ---
SlowAPI | Enabled | Endpoint limits
Redis storage | Enabled | Distributed rate limit state

Why it is secure:

- Brute force attacks are slowed down
- Abuse and resource exhaustion are reduced

### Input validation

Control | Status | Notes
--- | --- | ---
Pydantic validation | Enabled | Request schema checks
Field validators | Enabled | Business rules enforced

Why it is secure:

- Invalid input is rejected early
- Unexpected data types are blocked

### SQL injection prevention

Control | Status | Notes
--- | --- | ---
SQLAlchemy ORM | Enabled | Parameterized queries
Raw SQL | Avoided | Safer query construction

Why it is secure:

- Parameterized queries reduce injection risk
- The ORM handles escaping safely

### File upload security

Control | Status | Notes
--- | --- | ---
Allowed extensions | Enabled | Only approved file types
Size limit | Enabled | Large upload protection
SHA-256 hash | Enabled | File integrity support

Why it is secure:

- Dangerous file types are blocked
- Large uploads are limited
- File integrity can be checked

### Password reset security

Control | Status | Notes
--- | --- | ---
Reset tokens | Enabled | Token-based reset flow
Rate limiting | Enabled | Limits abuse

Why it is secure:

- Reset access is time-limited
- Abuse is reduced by rate limiting

## Database security

### Network security

Control | Status | Notes
--- | --- | ---
Private subnet | Enabled | No direct internet exposure
Security groups | Restricted | ECS to RDS only
Public access | Disabled | Not publicly reachable

Why it is secure:

- No direct internet access to PostgreSQL
- Only the application can reach the database port

### Data at rest

Control | Status | Notes
--- | --- | ---
RDS encryption | Enabled | AWS KMS encryption
Encrypted backups | Enabled | Snapshot protection

Why it is secure:

- Data stored on disk is protected
- Backups are protected as well

### Access control

Control | Status | Notes
--- | --- | ---
Application DB user | Enabled | Single app user
Secrets Manager | Enabled | Credentials stored centrally
Connection pooling | Enabled | Controlled DB access

Why it is secure:

- Database access is centralized
- Permissions are kept narrow

### Database connection security

Current state:

- The backend manages database connections through SQLAlchemy
- Connection pooling is configured in the database layer
- The database URL is built from application settings

### Audit and logging

Control | Status | Notes
--- | --- | ---
CloudWatch logs | Enabled | Centralized logs
Query logging | Disabled in prod | Avoids sensitive query exposure
Performance Insights | Enabled in prod | Monitoring support

## Security summary

AWS services and status:

- RDS: encrypted, private, restricted access
- ElastiCache: private and application only
- ECS: private tasks with IAM roles
- ALB: TLS 1.3 and HTTPS only
- IAM: least privilege
- Secrets Manager: all secrets stored centrally
- S3: encrypted and not public

Application controls and status:

- JWT authentication
- bcrypt password hashing
- organization-based authorization
- rate limiting with Redis
- Pydantic validation
- SQLAlchemy parameterized queries
- file upload restrictions

Database controls and status:

- private network isolation
- encryption at rest
- restricted security groups
- centralized credentials

Last updated: March 2026
