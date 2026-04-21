const { param } = require('express-validator');
const validate = require('../middleware/validate');

exports.idParam = validate([
  param('id').isMongoId().withMessage('Invalid id'),
]);
