export const validate = (schema, part = 'body') => (req, _res, next) => {
  req[part] = schema.parse(req[part]);
  next();
};