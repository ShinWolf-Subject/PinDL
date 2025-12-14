const Joi = require('joi');

const downloadSchema = Joi.object({
  url: Joi.string()
    .uri()
    .pattern(/^https?:\/\/(?:[a-z]+\.)?pinterest\.(?:com|fr|de|co\.uk|jp|ca|au|it|es|ru)|\/\/pin\.it/) // Tambahkan pin.it
    .required()
    .messages({
      'string.uri': 'URL must be a valid URI',
      'string.pattern.base': 'URL must be a valid Pinterest URL (e.g., pinterest.com/pin/... or pin.it/...)',
      'any.required': 'URL is required'
    })
});

const validateDownloadRequest = (req, res, next) => {
  const { error, value } = downloadSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }
  
  req.validatedData = value;
  next();
};

module.exports = { validateDownloadRequest };