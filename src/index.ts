import express, { Application } from 'express';
import domainRouter from './routes/domain.router';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/domain', domainRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 