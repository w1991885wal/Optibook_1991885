const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const errors = result.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    next(new ApiError(400, 'Validation failed', errors));
  },
];

module.exports = validate;
