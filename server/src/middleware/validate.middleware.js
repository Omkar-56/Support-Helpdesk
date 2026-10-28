export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err.errors) {
      const details = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details,
        message: details[0]?.message || 'Invalid input data',
      });
    }
    return res.status(400).json({ error: 'Invalid input data' });
  }
};
