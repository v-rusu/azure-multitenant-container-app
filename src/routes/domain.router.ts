import express, { Router } from 'express';
import { processDomain, deleteDomain } from '../controllers/domain.controller';

const router: Router = express.Router();

router.post('/process', processDomain);
router.delete('/delete', deleteDomain);

export default router; 