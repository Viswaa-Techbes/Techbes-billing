const { Router } = require('express');
const { protect } = require('../middleware/auth');
const itemController = require('../controllers/itemController');

const router = Router();

router.use(protect);

router.get('/', itemController.getItems);
router.post('/', itemController.createItem);
router.put('/:id', itemController.updateItem);
router.delete('/:id', itemController.deleteItem);

module.exports = router;
