import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['admin', 'inspector', 'operator', 'viewer']).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const createLineSchema = z.object({
  name: z.string().min(2, 'Line name must be at least 2 characters'),
  factoryLocation: z.string().min(2, 'Factory location must be at least 2 characters'),
  description: z.string().optional()
});

export const createInspectionSchema = z.object({
  lineId: z.string().uuid('Valid line ID is required'),
  itemSku: z.string().min(2, 'Item SKU must be at least 2 characters'),
  operatorNotes: z.string().optional()
});

export const updateInspectionStatusSchema = z.object({
  status: z.enum(['PASSED', 'WARNING', 'CRITICAL', 'PENDING']).optional(),
  operatorNotes: z.string().optional()
});

export function validate(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      return res.status(400).json({ error: 'Invalid request payload' });
    }
  };
}
