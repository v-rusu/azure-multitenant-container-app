import dns from 'dns';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);

export class DomainService {
  constructor(
    private azureAppName: string,
    private azureResourceGroup: string,
    private azureEnvName: string,
    private azureClientId: string,
    private azureClientSecret: string,
    private azureTenantId: string
  ) {}

  async checkDns(hostname: string, expectedTxtRecord: string, expectedCnameRecord?: string | null, expectedARecord?: string | null): Promise<boolean> {
    console.log(`Starting DNS check for hostname: ${hostname}`);
    try {
      if (expectedARecord) {
        const aRecords = await resolve4(hostname);
        console.log(`A records for ${hostname}:`, aRecords);
        if (!aRecords.includes(expectedARecord)) {
          console.log(`Expected A record ${expectedARecord} not found.`);
          return false;
        }
      }

      if (expectedCnameRecord) {
        const resolveCname = promisify(dns.resolveCname);
        const cnameRecords = await resolveCname(hostname);
        console.log(`CNAME records for ${hostname}:`, cnameRecords);
        if (!cnameRecords.includes(expectedCnameRecord)) {
          console.log(`Expected CNAME record ${expectedCnameRecord} not found.`);
          return false;
        }
      }

      const txtRecords = await resolveTxt(`asuid.${hostname}`);
      const flatTxtRecords = txtRecords.map(record => record.join(''));
      console.log(`TXT records for asuid.${hostname}:`, flatTxtRecords);
      if (!flatTxtRecords.includes(expectedTxtRecord)) {
        console.log(`Expected TXT record ${expectedTxtRecord} not found.`);
        return false;
      }

      console.log(`DNS check passed for hostname: ${hostname}`);
      return true;
    } catch (error) {
      console.error(`DNS check failed for ${hostname}:`, error);
      return false;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    console.log('Checking Azure login status...');
    try {
      const { stdout } = await execAsync('az account show');
      console.log('Azure account information:', stdout);
      return true;
    } catch (error) {
      console.error('Not logged into Azure:', error);
      return false;
    }
  }

  async loginToAzure(): Promise<boolean> {
    console.log('Attempting to log in to Azure...');
    try {
      await execAsync(
        `az login --service-principal -u ${this.azureClientId} -p ${this.azureClientSecret} --tenant ${this.azureTenantId}`
      );
      console.log('Azure login successful.');
      return true;
    } catch (error) {
      console.error('Azure login failed:', error);
      return false;
    }
  }

  async configureHostname(hostname: string, validationMethod: string): Promise<boolean> {
    console.log(`Configuring hostname: ${hostname}`);
    try {
      await execAsync(
        `az containerapp hostname add -n ${this.azureAppName} -g ${this.azureResourceGroup} --hostname ${hostname}`
      );
      console.log(`Hostname ${hostname} added to container app.`);

      await execAsync(
        `az containerapp hostname bind -n ${this.azureAppName} -g ${this.azureResourceGroup} --hostname ${hostname} -e ${this.azureEnvName} --validation-method ${validationMethod}`
      );
      console.log(`Hostname ${hostname} bound to environment ${this.azureEnvName}.`);

      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists in container app')) {
        console.log(`Hostname ${hostname} already exists in container app.`);
        return true;
      }
      console.error(`Failed to configure hostname ${hostname}:`, error);
      return false;
    }
  }

  async deleteHostname(hostname: string): Promise<boolean> {
    console.log(`Deleting hostname: ${hostname}`);
    try {
      await execAsync(
        `az containerapp hostname delete -n ${this.azureAppName} -g ${this.azureResourceGroup} --hostname ${hostname} --yes`
      );
      console.log(`Hostname ${hostname} deleted from container app.`);

      const { stdout } = await execAsync(
        `az containerapp env certificate list -g ${this.azureResourceGroup} --name ${this.azureEnvName}`
      );
      const certificates = JSON.parse(stdout);
      const certificate = certificates.find((c: any) => c.properties.subjectName === hostname);
      if (certificate) {
        console.log(`Certificate ID for ${hostname}: ${certificate.id}`);
      } else {
        console.log(`Certificate ${hostname} not found.`);
      }

      await execAsync(
        `az containerapp env certificate delete -g ${this.azureResourceGroup} --name ${this.azureEnvName} --certificate ${certificate.id} --yes`
      );
      console.log(`Certificate ${certificate.id} deleted.`);
      return true;
    } catch (error) {
      console.error(`Failed to delete hostname ${hostname}:`, error);
      return false;
    }
  }
} 