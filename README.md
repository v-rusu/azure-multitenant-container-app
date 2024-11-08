# Domain Service - Azure Container Apps Domain Configuration

A microservice that manages custom domains and SSL certificates for Azure Container Apps in multi-tenant environments. It runs Azure CLI commands in a containerized environment and exposes a REST API for domain management.

The basics of multi-tenant applications and Azure Container Apps:
[Azure Multi-tenant docs](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/overview).

Custom domains and SSL certificates for Azure Container Apps:
[Azure Container Apps docs](https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates)

Working with a service principal:
[Azure Service Principal docs](https://learn.microsoft.com/en-us/cli/azure/azure-cli-sp-tutorial-1)

Communication between microservices in container apps:
[Azure Container Apps docs](https://learn.microsoft.com/en-us/azure/container-apps/communicate-between-microservices?pivots=docker-local&wt.mc_id=knwlserapi_inproduct_azportal&tabs=bash#communicate-between-container-apps)

## Overview

This service helps you automate the process of:
- Verifying DNS records (A, CNAME, TXT) for custom domains
- Configuring custom domains in Azure Container Apps
- Managing SSL certificates
- Providing async status updates via webhooks

## Configuration

1. Create a `.env` file based on the example:
```env
# Azure Authentication
AZURE_SP_CLIENT_ID=<service_principal_id>
AZURE_SP_CLIENT_SECRET=<service_principal_secret>
AZURE_TENANT_ID=<azure_tenant_id>

# Azure Resources
AZURE_APP_NAME=<container_app_name>
AZURE_RESOURCE_GROUP=<resource_group_name>
AZURE_ENV_NAME=<environment_name>
```

2. Start the service using Docker Compose:
```bash
docker-compose up -d
```

## API Reference

### Add Custom Domain

```http
POST /api/domain
Content-Type: application/json

{
    "domain": "custom.example.com",
    "callback": "https://your-callback-url.com/webhook",
    "expectedCnameRecord": "your-app.azurecontainerapps.io",  // Optional
    "expectedARecord": "1.2.3.4",                             // Optional
    "expectedTxtRecord": "azure-verification=xyz123"
}
```

Use a CNAME for subdomains and an A record for root domains. A records work for both subdomains and root domains.

The service will:
1. Verify DNS records match the expected values
2. Configure the domain in Azure Container Apps
3. Send a callback webhook with the result

#### Callback Payload Examples

Success:
```json
{
    "status": "success",
    "message": "Domain successfully connected",
    "domain": "custom.example.com"
}
```

Failure:
```json
{
    "status": "error",
    "message": "Configuration failed",
    "domain": "custom.example.com"
}
```

### Remove Custom Domain

```http
DELETE /api/domain
Content-Type: application/json

{
    "domain": "custom.example.com"
}
```

## DNS Configuration

You need to configure your DNS records before using this service:

1. **For CNAME setup:**
   - CNAME record pointing to your Container App URL
   - TXT record for domain verification

2. **For A record setup:**
   - A record pointing to your static IP
   - TXT record for domain verification

## Running with Docker Compose

The service uses the following Docker Compose configuration:
```yaml
version: '3.8'

services:
  domain-service:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - ./.env
    ports:
      - "3001:3001"
    dns:
      - 8.8.8.8  # Google DNS
      - 8.8.4.4  # Google DNS backup
    dns_opt:
      - timeout:2
      - attempts:5
```

## Error Handling

Common error responses:
- `400 Bad Request`: Missing required parameters
- `422 Unprocessable Entity`: DNS verification failed
- `500 Internal Server Error`: Azure authentication or configuration errors
