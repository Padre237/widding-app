import { Router } from 'express';
import { validate, reactionSchema } from '../middleware/validation.js';
import { getReactions, addReaction, removeReaction } from '../controllers/reactionController.js';

const router = Router();

router.get('/:mediaId',  getReactions);
router.post('/',         validate(reactionSchema), addReaction);
router.delete('/',       validate(reactionSchema), removeReaction);

export default router;
