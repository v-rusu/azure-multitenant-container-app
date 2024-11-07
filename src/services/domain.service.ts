import dns from 'dns';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);

export class DomainService {
  constructor(
    private expectedARecord: string,
    private expectedTxtRecord: string,
    private azureAppName: string,
    private azureResourceGroup: string,
    private azureEnvName: string,
    private azureClientId: string,
    private azureClientSecret: string,
    private azureTenantId: string
  ) {}

  async checkDns(hostname: string): Promise<boolean> {
    console.log(`Starting DNS check for hostname: ${hostname}`);
    try {
      const aRecords = await resolve4(hostname);
      console.log(`A records for ${hostname}:`, aRecords);
      if (!aRecords.includes(this.expectedARecord)) {
        console.log(`Expected A record ${this.expectedARecord} not found.`);
        return false;
      }

      const txtRecords = await resolveTxt(`asuid.${hostname}`);
      const flatTxtRecords = txtRecords.map(record => record.join(''));
      console.log(`TXT records for asuid.${hostname}:`, flatTxtRecords);
      if (!flatTxtRecords.includes(this.expectedTxtRecord)) {
        console.log(`Expected TXT record ${this.expectedTxtRecord} not found.`);
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

  async configureHostname(hostname: string): Promise<boolean> {
    console.log(`Configuring hostname: ${hostname}`);
    try {
      await execAsync(
        `az containerapp hostname add -n ${this.azureAppName} -g ${this.azureResourceGroup} --hostname ${hostname}`
      );
      console.log(`Hostname ${hostname} added to container app.`);

      await execAsync(
        `az containerapp hostname bind -n ${this.azureAppName} -g ${this.azureResourceGroup} --hostname ${hostname} -e ${this.azureEnvName}`
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
        `az containerapp hostname delete -n ${this.azureAppName} -g ${this.azureResourceGroup} --hostname ${hostname}`
      );
      console.log(`Hostname ${hostname} deleted from container app.`);
      return true;
    } catch (error) {
      console.error(`Failed to delete hostname ${hostname}:`, error);
      return false;
    }
  }
} 