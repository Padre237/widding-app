import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { validate, commentCreateSchema } from '../middleware/validation.js';
import { listComments, addComment, deleteComment } from '../controllers/commentController.js';

const router = Router();

router.get('/:mediaId',  listComments);
router.post('/',         validate(commentCreateSchema), addComment);
router.delete('/:id',    optionalAuth, deleteComment);

export default router;
