# AWS Credentials Setup for Backend Local Development

This guide defines the canonical local-development AWS credential flow for backend Docker Compose (`app`, `intake-worker`, `bulk-import-worker`) so Bedrock works without exporting access keys into shell env.

## TL;DR

- Use AWS shared config/credentials in `~/.aws`.
- Backend containers mount `~/.aws` read-only.
- Containers receive only:
  - `AWS_PROFILE` (default: `default`)
  - `AWS_REGION` / `AWS_DEFAULT_REGION` (default: `us-east-1`)
  - `AWS_SDK_LOAD_CONFIG=1`
- Run `docker compose up -d` from `backend/`.

No `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` propagation is required.

---

## Why this approach

Compared to exporting raw keys via `.envrc`, shared config mount is:

- **More robust**: no empty env var issue when host shell is missing exports.
- **More secure**: no long-lived secrets injected into container env.
- **SSO-ready**: works with `aws configure sso` + `aws sso login`.
- **Maintainable**: standard AWS SDK credential provider chain (boto3 defaults).

---

## One-time setup

### 1) Install/configure AWS CLI

Choose one:

```bash
# Access keys profile
aws configure --profile default

# or SSO profile
aws configure sso --profile your-sso-profile
aws sso login --profile your-sso-profile
```

This writes config into `~/.aws/config` and credentials/cache into `~/.aws`.

### 2) (Optional) direnv for convenience

`backend/.envrc` now sets safe defaults only (profile/region/config mode), not access keys.

```bash
cd backend
direnv allow
```

---

## Docker Compose behavior

`backend/docker-compose.override.yml` configures these services:

- `app`
- `intake-worker`
- `bulk-import-worker`

Each service has:

1. Read-only mount:

```yaml
volumes:
  - ${HOME}/.aws:/home/appuser/.aws:ro
```

2. AWS runtime env:

```yaml
environment:
  - AWS_PROFILE=${AWS_PROFILE:-default}
  - AWS_REGION=${AWS_REGION:-us-east-1}
  - AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
  - AWS_SDK_LOAD_CONFIG=1
```

Because containers run as `appuser`, using `/home/appuser/.aws` aligns with SDK default lookup paths.

The shared entrypoint also performs a **fail-fast validation** when `AWS_SDK_LOAD_CONFIG=1`:

- checks `/home/appuser/.aws` exists
- requires at least one of:
  - `/home/appuser/.aws/config`
  - `/home/appuser/.aws/credentials`

If the mount is missing, the container exits early with a clear error instead of failing later during the first Bedrock call.

---

## Daily usage

From `backend/`:

```bash
docker compose up -d
```

If using SSO profile:

```bash
aws sso login --profile your-sso-profile
AWS_PROFILE=your-sso-profile docker compose up -d
```

---

## Verification commands

Use these to confirm containers can see AWS shared config:

```bash
docker compose exec app sh -lc 'echo "$AWS_PROFILE|$AWS_REGION|$AWS_SDK_LOAD_CONFIG"'
docker compose exec app sh -lc 'ls -la /home/appuser/.aws'
docker compose exec app python -c "import boto3; print(boto3.Session().region_name, boto3.Session().get_credentials() is not None)"

docker compose exec intake-worker python -c "import boto3; print(boto3.Session().region_name, boto3.Session().get_credentials() is not None)"
docker compose exec bulk-import-worker python -c "import boto3; print(boto3.Session().region_name, boto3.Session().get_credentials() is not None)"
```

Expected signal:

- Profile/region env variables present.
- `/home/appuser/.aws` visible in container.
- boto3 session resolves region and non-null credentials provider.

> Note: successful local credential resolution does not guarantee Bedrock model invocation permissions. IAM policy, region availability, and SSO session freshness still apply.

---

## Troubleshooting

### `Unable to locate credentials`

1. Confirm host has AWS files:

```bash
ls -la ~/.aws
```

2. Confirm container mount exists:

```bash
docker compose exec app ls -la /home/appuser/.aws
```

If the mount is missing at startup, the container now fails early with an entrypoint error before the app/worker begins processing.

3. Recreate services after changes:

```bash
docker compose up -d --force-recreate app intake-worker bulk-import-worker
```

4. If SSO profile, refresh login:

```bash
aws sso login --profile <profile>
```

### `NoRegionError`

Set region explicitly at runtime:

```bash
AWS_REGION=us-east-1 AWS_DEFAULT_REGION=us-east-1 docker compose up -d
```

or configure region in `~/.aws/config` profile.

### Bedrock access denied

Credential wiring is correct but IAM/Bedrock access is insufficient. Verify:

- `bedrock:InvokeModel` (and related actions as needed)
- correct account/role/profile
- Bedrock model access enabled in selected region

---

## Security notes

- Never commit `~/.aws` contents, `.env`, or raw keys.
- Use least-privilege IAM policies.
- Prefer SSO over long-lived keys for team environments.
