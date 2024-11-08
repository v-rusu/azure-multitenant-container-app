# Domain Service - Azure Container Apps Domain Configuration

## Overview

This project provides a service to configure custom domains for Azure Container Apps, specifically designed to support **multitenant applications**. It automates the process of verifying DNS records and setting up SSL certificates. 
[Azure Multi-tenant docs](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/overview).
[Azure Container Apps docs](https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates)

## Features

- **Automated DNS Verification**: Supports verification of A and TXT records.
- **Azure Container Apps Configuration**: Automates the domain configuration process for multitenant environments.
- **SSL Certificate Binding**: Automatically binds SSL certificates to the configured domains.

## Prerequisites

Before you begin, ensure you have the following:

1. **Azure Subscription**: Required to manage Azure resources.
2. **Azure Service Principal**: Must have permissions to manage Container Apps and SSL certificates.
3. **Docker and Docker Compose**: Needed to build and run the service.
4. **DNS Access**: Ability to configure A and TXT records for domain verification.

## Installation

Follow these steps to set up and run the service:

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory with the following variables:

   ```env
   # Azure Authentication
   AZURE_SP_CLIENT_ID=<service_principal_id>
   AZURE_SP_CLIENT_SECRET=<service_principal_secret>
   AZURE_TENANT_ID=<azure_tenant_id>

   # Azure Resources
   AZURE_APP_NAME=<container_app_name>
   AZURE_RESOURCE_GROUP=<resource_group_name>
   AZURE_ENV_NAME=<environment_name>

   # DNS Configuration
   EXPECTED_A_RECORD=<ip_address>
   EXPECTED_TXT_RECORD=<verification_value>

   # Application Settings
   PORT=3000
   ```

3. **Build and Start the Service**:
   Use Docker Compose to build and start the service:

   ```bash
   docker-compose up --build
   ```

## How It Works

1. **API Endpoint**: The service exposes an API endpoint `/process-domain` to process a single domain. It accepts a `domain` query parameter.

2. **DNS Verification**: The service verifies that the A record matches the expected IP and the TXT record matches the expected verification value.

3. **Azure Configuration**: It logs in to Azure using the service principal, adds the hostname to the Container App, and binds the SSL certificate.

4. **Response Messages**: The service returns specific messages based on the success or failure of each step.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Troubleshooting

### Common Issues

- **DNS Verification Fails**: Check DNS propagation, verify A and TXT records.
- **Azure Authentication Fails**: Verify service principal credentials and permissions.
- **Certificate Binding Fails**: Ensure DNS records are correct and check for existing bindings.

### Logs

For detailed error messages, check the Docker logs:

```bash
docker-compose logs domain-service
```

## Security Notes

- Store all credentials in secure environment variables.
- Use the minimum required permissions for the service principal.
- Regularly rotate service principal credentials.
- Monitor Azure activity logs for any issues.

## Monitoring

Monitor the service through Docker logs and Azure Activity logs to ensure smooth operation.

## Deployment

1. Ensure all environment variables are set.
2. Build and push the Docker image.
3. Deploy using Docker Compose.
4. Monitor logs for successful startup.