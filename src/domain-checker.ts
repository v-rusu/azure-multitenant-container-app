import dns from 'dns';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);

export interface Domain {
  hostname: string;
  status: 'not_connected' | 'connected' | 'failed';
}

export class DomainChecker {
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
    try {
      // Check A record
      const aRecords = await resolve4(hostname);
      console.log(`A records for ${hostname}:`, aRecords);
      console.log(`Expected A record: ${this.expectedARecord}`);
      if (!aRecords.includes(this.expectedARecord)) {
        console.log(`Invalid A record for ${hostname}`);
        return false;
      }

      // Check TXT record
      const txtRecords = await resolveTxt(`asuid.${hostname}`);
      const flatTxtRecords = txtRecords.map(record => record.join(''));
      console.log(`TXT records for ${hostname}:`, flatTxtRecords);
      console.log(`Expected TXT record: ${this.expectedTxtRecord}`);
      if (!flatTxtRecords.includes(this.expectedTxtRecord)) {
        console.log(`Invalid TXT record for ${hostname}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`DNS check failed for ${hostname}:`, error);
      return false;
    }
  }

  async loginToAzure(): Promise<boolean> {
    try {
      await execAsync(
        `az login --service-principal -u ${this.azureClientId} -p ${this.azureClientSecret} --tenant ${this.azureTenantId}`
      );
      return true;
    } catch (error) {
      console.error('Azure login failed:', error);
      return false;
    }
  }

  async configureHostname(hostname: string): Promise<boolean> {
    try {
    // Add hostname to container app
      await execAsync(
        `az containerapp hostname add -n ${this.azureAppName} -g ${this.azureResourceGroup} --hostname ${hostname}`
      );
      // Bind certificate
      await execAsync(
        `az containerapp hostname bind -n ${this.azureAppName} -g ${this.azureResourceGroup} --hostname ${hostname} -e ${this.azureEnvName}`
      );

      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists in container app')) {
        console.log(`Hostname ${hostname} is already configured`);
        return true;
      }
      
      console.error(`Failed to configure hostname ${hostname}:`, error);
      return false;
    }
  }
} 