import { Request, Response } from 'express';
import { DomainService } from '../services/domain.service';

const service = new DomainService(
  process.env.AZURE_APP_NAME!,
  process.env.AZURE_RESOURCE_GROUP!,
  process.env.AZURE_ENV_NAME!,
  process.env.AZURE_SP_CLIENT_ID!,
  process.env.AZURE_SP_CLIENT_SECRET!,
  process.env.AZURE_TENANT_ID!
);

export const processDomain = async (req: Request, res: Response): Promise<void> => {
  const domain = req.body.domain as string;
  const callback = req.body.callback as string;
  const expectedCnameRecord = req.body.expectedCnameRecord as string | null;
  const expectedARecord = req.body.expectedARecord as string | null;
  const expectedTxtRecord = req.body.expectedTxtRecord as string;

  if (!domain) {
    res.status(400).json({ error: 'Domain parameter is required' });
    return;
  }

  try {
    console.log(`Processing domain: ${domain}`);
    const dnsValid = await service.checkDns(domain, expectedTxtRecord, expectedCnameRecord, expectedARecord);
    if (!dnsValid) {
      res.status(422).json({ error: 'DNS verification failed' });
      return;
    }

    const loggedIn = await service.isLoggedIn();
    if (!loggedIn) {
      const loginSuccess = await service.loginToAzure();
      if (!loginSuccess) {
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
    }

    res.status(202).json({ message: 'Domain configuration started' });

    service.configureHostname(domain, expectedARecord !== null ? 'HTTP' : 'CNAME').then(async (configSuccess) => {
      if (callback) {
        try {
          const result = configSuccess ? 
            { status: 'success', message: 'Domain successfully connected', domain: domain } : 
            { status: 'error', message: 'Configuration failed', domain: domain };
          
          await fetch(callback, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
          });
        } catch (callbackError) {
          console.error('Error calling callback:', callbackError);
        }
      }
    }).catch((error) => {
      console.error('Error in background configuration:', error);
      if (callback) {
        fetch(callback, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'error', message: 'Configuration failed', domain: domain })
        }).catch(err => console.error('Error calling callback:', err));
      }
    });

  } catch (error) {
    console.error('Error processing domain:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteDomain = async (req: Request, res: Response): Promise<void> => {
  const domain = req.body.domain as string;

  if (!domain) {
    res.status(400).json({ error: 'Domain parameter is required' });
    return;
  }

  try {
    const loggedIn = await service.isLoggedIn();
    if (!loggedIn) {
      const loginSuccess = await service.loginToAzure();
      if (!loginSuccess) {
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
    }

    console.log(`Deleting domain: ${domain}`);
    service.deleteHostname(domain);
    res.status(200).json({ message: 'Domain successfully deleted' });
  } catch (error) {
    console.error('Error deleting domain:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}; 