import {TRPCError} from '@trpc/server'

import type {
  AnySyncProvider,
  Id,
  LinkFactory,
  MetaService,
  ZStandard,
} from '@usevenice/cdk-core'
import {zConnectWith} from '@usevenice/cdk-core'
import {extractId, makeId, zRaw} from '@usevenice/cdk-core'
import type {Json} from '@usevenice/util'
import {castInput, deepMerge, mapDeep, R, z, zGuard} from '@usevenice/util'

import type {UserInfo} from './auth-utils'
import type {SyncEngineConfig} from './makeSyncEngine'

// Four different types
// Generic Input / Input
// Generic Output / Output
// We implement all except Generic Output

export type ZInput = {
  [k in keyof typeof zInput]: z.infer<(typeof zInput)[k]>
}
export const zInput = (() => {
  const provider = z.string().brand<'provider'>()
  // zRaw also have a bunch of things such as userId, envName, etc.
  // Do we want to worry about those?
  const integration = zRaw.integration
  const institution = zRaw.institution
  const resource = zRaw.resource.omit({standard: true}).extend({
    integration: integration.optional(),
    institution: institution.optional(),
  })
  const pipeline = zRaw.pipeline.extend({
    source: resource.partial().optional(),
    destination: resource.partial().optional(),
    watch: z.boolean().optional(),
  })
  return {provider, institution, integration, resource, pipeline}
})()

type _inferInput<T> = T extends z.ZodTypeAny ? z.input<T> : never

// Would be nice to improve the typing of this... Make stuff non-optional
/** https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types */
export type IntegrationInput<T extends AnySyncProvider = AnySyncProvider> =
  T extends AnySyncProvider
    ? {
        id: Id<T['name']>['int']
        config?: Partial<_inferInput<T['def']['integrationConfig']>>
      }
    : never

// Is there a way to infer this? Or would that be too much?
export type ResourceInput<T extends AnySyncProvider = AnySyncProvider> =
  T extends AnySyncProvider
    ? {
        id: Id<T['name']>['reso']
        integrationId?: Id<T['name']>['int']
        integration?: IntegrationInput<T>
        settings?: Partial<_inferInput<T['def']['resourceSettings']>> & object
      }
    : never

export interface PipelineInput<
  PSrc extends AnySyncProvider = AnySyncProvider,
  PDest extends AnySyncProvider = AnySyncProvider,
  TLinks extends Record<string, LinkFactory> = {},
> {
  id: Id['pipe']
  source?: PSrc extends AnySyncProvider ? ResourceInput<PSrc> : never
  sourceState?: PSrc extends AnySyncProvider
    ? Partial<_inferInput<PSrc['def']['sourceState']>>
    : never
  destination?: PDest extends AnySyncProvider ? ResourceInput<PDest> : never
  destinationState?: PDest extends AnySyncProvider
    ? Partial<_inferInput<PDest['def']['destinationState']>>
    : never
  /** Used to initialize links */
  linkOptions?: Array<
    // prettier-ignore
    {
      [K in Extract<keyof TLinks, string>]: undefined extends Parameters<TLinks[K]>[0]
        ? [name: K, args: Parameters<TLinks[K]>[0]] | [name: K] | K
        : [name: K, args: Parameters<TLinks[K]>[0]]
    }[Extract<keyof TLinks, string>]
  >
  watch?: boolean
}

// Consider adding connectContextInput here...

export type ParsedReso = z.infer<ReturnType<typeof makeSyncParsers>['zReso']>
export type ParsedInt = z.infer<ReturnType<typeof makeSyncParsers>['zInt']>
export type ParsedPipeline = z.infer<
  ReturnType<typeof makeSyncParsers>['zPipeline']
>

export const zSyncOptions = z.object({
  /** Only sync resource metadata and skip pipelines */
  metaOnly: z.boolean().nullish(),
  /**
   * Remove `state` of resource and trigger a full resync
   */
  fullResync: z.boolean().nullish(),

  /**
   * Triggers provider to refresh data from its source
   * https://plaid.com/docs/api/products/transactions/#transactionsrefresh
   * This may also load historical transactions. For example,
   * Finicity treats historical transaction as premium service.
   */
  todo_upstreamRefresh: z.boolean().nullish(),

  // See coda's implmementation. Requires adding a new message to the sync protocol
  // to remove all data from a particular source_id
  todo_removeUnsyncedData: z.boolean().nullish(),

  connectWith: zConnectWith.nullish(),
})

export function makeSyncParsers<
  TProviders extends readonly AnySyncProvider[],
  TLinks extends Record<string, LinkFactory>,
>({
  providers,
  linkMap,
  getDefaultPipeline,
  getDefaultConfig,
  metaService: m, // Destructure can cause dependencies to be loaded...
}: Pick<
  SyncEngineConfig<TProviders, TLinks>,
  'providers' | 'linkMap' | 'getDefaultPipeline'
> & {
  getDefaultConfig: (
    name: TProviders[number]['name'],
    integrationId?: Id<TProviders[number]['name']>['int'],
  ) => TProviders[number]['def']['_types']['integrationConfig']
  metaService: MetaService
}) {
  const providerMap = R.mapToObj(providers, (p) => [p.name, p])

  const zProvider = zInput.provider.transform(
    zGuard((input) => {
      const provider =
        providerMap[input] ?? providerMap[extractId(input as never)[1]]
      if (!provider) {
        throw new Error(`${input} is not a valid provider name`)
      }
      return provider
    }),
  )

  const zInt = castInput(zInput.integration)<
    IntegrationInput<TProviders[number]>
  >().transform(
    zGuard(async ({id, ...rest}) => {
      const integration = await m.tables.integration.get(id)
      const provider = zProvider.parse(id, {path: ['id']})
      const _config = deepMerge(
        getDefaultConfig(provider.name, id),
        integration?.config,
        rest.config,
      )
      const config = provider.def.integrationConfig?.parse(_config, {
        path: ['config'],
      }) as Record<string, Json>
      // Validated id only
      return {id, ...integration, ...rest, provider, config}
    }),
  )

  const zIns = zInput.institution.transform(
    zGuard(async ({id, ...rest}) => {
      const institution = await m.tables.institution.get(id)
      const provider = zProvider.parse(id, {path: ['id']})
      const external = deepMerge(institution?.external, rest.external)
      const standard = provider.def.institutionData?.parse(external, {
        path: ['external'],
      }) as ZStandard['institution']
      return {id, ...institution, ...rest, external, standard}
    }),
  )

  const zReso = castInput(zInput.resource)<
    ResourceInput<TProviders[number]>
  >().transform(
    zGuard(async ({id, ...rest}) => {
      const reso = await m.tables.resource.get(id)
      const [integration, institution] = await Promise.all([
        zInt.parseAsync(
          R.identity<z.infer<(typeof zInput)['integration']>>({
            id:
              reso?.integrationId ??
              rest.integrationId ??
              makeId('int', extractId(id)[1], ''),
            config: rest.integration?.config,
          }),
        ),
        zIns.optional().parseAsync(
          R.pipe(reso?.institutionId ?? rest.institutionId, (insId) =>
            // Unlike integration, we do not have default institution for provider
            // ins_plaid just makes no sense. Although ins_quickbooks does... so what gives?
            !insId
              ? undefined
              : R.identity<z.infer<(typeof zInput)['institution']>>({
                  id: insId,
                  external: rest.institution?.external,
                }),
          ),
        ),
      ])
      const settings = integration.provider.def.resourceSettings?.parse(
        deepMerge(reso?.settings, rest.settings),
        {path: ['settings']},
      ) as Record<string, Json>
      return {
        id,
        ...reso,
        ...rest,
        // For security do not allow userId to ever be automatically changed
        // once exists. Otherwise one could pass someone else's userId and get access
        // to their resource via just the `id`
        creatorId: reso?.creatorId ?? rest.creatorId,
        integration,
        integrationId: integration.id, // Ensure consistency
        institution,
        institutionId: institution?.id,
        settings,
      }
    }),
  )

  const zPipeline = z
    .preprocess((arg) => {
      const defaultPipe = getDefaultPipeline?.()
      return !arg
        ? defaultPipe
        : typeof arg === 'object'
        ? deepMerge(defaultPipe, arg)
        : arg
    }, castInput(zInput.pipeline)<PipelineInput<TProviders[number], TProviders[number], TLinks>>())
    .transform(
      zGuard(async ({id, ...rest}) => {
        const pipeline = await m.tables.pipeline.get(id)

        // This is a temporary workaround for default pipeline is overriding the explicit pipeline definition....
        // TODO: We should really re-work this where defaulting happens as a last step
        // Also it should not be possible to have the conn.id differ from connId
        function overrideId(cid: Id['reso'] | undefined | null) {
          return cid && extractId(cid)[2] ? cid : null
        }
        const [source, destination] = await Promise.all([
          zReso.parseAsync(
            deepMerge(rest.source, {
              id:
                overrideId(rest.sourceId ?? rest.source?.id) ??
                pipeline?.sourceId,
            }),
            {path: ['source']},
          ),
          // TODO: Re-think how deepMerge works here
          // especially relative to id vs content of the merge...
          // could it be a better idea to have a fully normalized API?
          zReso.parseAsync(
            deepMerge(rest.destination, {
              id:
                overrideId(rest.destinationId ?? rest.destination?.id) ??
                pipeline?.destinationId,
            }),
            {path: ['destination']},
          ),
        ])
        // console.log('[zPipeline]', {pipeline, destination, rest})

        // Validation happens inside for now
        const links = R.pipe(
          rest.linkOptions ?? pipeline?.linkOptions ?? [],
          R.map((l) =>
            typeof l === 'string'
              ? linkMap?.[l]?.(undefined)
              : linkMap?.[l[0]]?.(l[1]),
          ),
          R.compact,
        )
        const sourceState = source.integration.provider.def.sourceState?.parse(
          deepMerge(pipeline?.sourceState, rest.sourceState),
          {path: ['sourceState']},
        ) as Record<string, unknown>
        const destinationState =
          destination.integration.provider.def.destinationState?.parse(
            deepMerge(pipeline?.destinationState, rest.destinationState),
            {path: ['destinationState']},
          ) as Record<string, unknown>
        return {
          id,
          ...pipeline,
          ...rest,
          source,
          sourceId: source.id, // Ensure consistency
          destination,
          destinationId: destination.id, // Ensure consistency
          links,
          sourceState,
          destinationState,
          watch: rest.watch, // Should this be on pipeline too?
        }
      }),
    )
    .refine((pipe) => {
      console.dir(
        mapDeep(pipe, (v, k) =>
          k === 'provider'
            ? (v as AnySyncProvider).name
            : `${k}`.toLowerCase().includes('secret')
            ? '[redacted]'
            : v,
        ),
        {depth: null},
      )
      return true
    })

  return {zProvider, zInt, zIns, zReso, zPipeline}
}

type AuthSubject =
  | ['resource', Pick<ParsedReso, 'creatorId' | 'id'> | null | undefined]
  | [
      'pipeline',
      Pick<ParsedPipeline, 'source' | 'destination' | 'id'> | null | undefined,
    ]

/** TODO: Add row level security to fully protect ourselves */
export function checkAuthorization(ctx: UserInfo, ...pair: AuthSubject) {
  if (ctx.isAdmin) {
    return true
  }
  switch (pair[0]) {
    case 'resource':
      return pair[1] == null || pair[1].creatorId === ctx.userId
    case 'pipeline':
      return (
        pair[1] == null ||
        pair[1].source.creatorId === ctx.userId ||
        pair[1].destination.creatorId === ctx.userId
      )
  }
}

export function authorizeOrThrow(ctx: UserInfo, ...pair: AuthSubject) {
  if (!checkAuthorization(ctx, ...pair)) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: `${ctx.userId} does not have access to ${
        typeof pair[1] === 'string' ? pair[1] : pair[1]?.id
      }`,
    })
  }
}
