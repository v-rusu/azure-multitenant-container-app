import { Request, Response } from 'express';
import { DomainService } from '../services/domain.service';

const service = new DomainService(
  process.env.EXPECTED_A_RECORD!,
  process.env.EXPECTED_TXT_RECORD!,
  process.env.AZURE_APP_NAME!,
  process.env.AZURE_RESOURCE_GROUP!,
  process.env.AZURE_ENV_NAME!,
  process.env.AZURE_SP_CLIENT_ID!,
  process.env.AZURE_SP_CLIENT_SECRET!,
  process.env.AZURE_TENANT_ID!
);

export const processDomain = async (req: Request, res: Response): Promise<void> => {
  const domain = req.body.domain as string;

  if (!domain) {
    res.status(400).send('Domain parameter is required');
    return;
  }

  try {
    console.log(`Processing domain: ${domain}`);
    const dnsValid = await service.checkDns(domain);
    if (!dnsValid) {
      res.status(422).send('DNS verification failed');
      return;
    }

    const loggedIn = await service.isLoggedIn();
    if (!loggedIn) {
      const loginSuccess = await service.loginToAzure();
      if (!loginSuccess) {
        res.status(500).send('Internal Server Error');
        return;
      }
    }

    const configSuccess = await service.configureHostname(domain);
    if (configSuccess) {
      res.status(200).send('Domain successfully connected');
    } else {  
      res.status(500).send('Internal Server Error');
    }
  } catch (error) {
    console.error('Error processing domain:', error);
    res.status(500).send('Internal Server Error');
  }
};

export const deleteDomain = async (req: Request, res: Response): Promise<void> => {
  const domain = req.body.domain as string;

  if (!domain) {
    res.status(400).send('Domain parameter is required');
    return;
  }

  try {
    console.log(`Deleting domain: ${domain}`);
    const deleteSuccess = await service.deleteHostname(domain);
    if (deleteSuccess) {
      res.status(200).send('Domain successfully deleted');
    } else {
      res.status(500).send('Azure deletion failed');
    }
  } catch (error) {
    console.error('Error deleting domain:', error);
    res.status(500).send('Internal Server Error');
  }
}; 