import { Router } from 'express';
const router = Router();
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: "Rajib's Note" });
});
export default router;
