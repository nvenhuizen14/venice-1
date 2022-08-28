import {z} from 'zod'

type Literal = boolean | null | number | string
type Json = Literal | {[key: string]: Json} | Json[]
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
)

export const IntegrationRead = z.object({
  id: z.string(),
  ledger_id: z.string(),
  config: jsonSchema,
  created_at: z.string(),
  updated_at: z.string(),
})

export type IntegrationReadT = z.infer<typeof IntegrationRead>
