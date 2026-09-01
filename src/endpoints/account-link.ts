import type { Endpoint, PayloadRequest } from 'payload'

type LinkUserDoc = {
  id: string | number
  email?: string | null
  role?: string[] | string | null
  medusaCustomerId?: string | null
  medusaCustomerEmail?: string | null
  accountLinkedAt?: string | null
  authentikSub?: string | null
}

function sharedSecret(): string {
  const secret = process.env.ACCOUNT_LINK_SHARED_SECRET
  if (!secret) {
    throw new Error('ACCOUNT_LINK_SHARED_SECRET is not configured')
  }
  return secret
}

function assertMedusaSecret(req: PayloadRequest) {
  const provided = req.headers.get('x-account-link-secret')
  if (!provided || provided !== sharedSecret()) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function rolesOf(user: LinkUserDoc): string[] {
  if (Array.isArray(user.role)) return user.role.filter(Boolean)
  if (typeof user.role === 'string' && user.role) return [user.role]
  return ['user']
}

function toLinkUser(user: LinkUserDoc) {
  return {
    id: String(user.id),
    email: user.email || '',
    roles: rolesOf(user),
    authentikSub: user.authentikSub || null,
    medusaCustomerId: user.medusaCustomerId || null,
  }
}

async function parseJson(req: PayloadRequest): Promise<Record<string, unknown>> {
  if (!req.json) return {}
  const body = await req.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
  return body as Record<string, unknown>
}

function medusaBaseUrl() {
  const url = process.env.MEDUSA_BACKEND_URL
  if (!url) {
    throw new Error('MEDUSA_BACKEND_URL is not configured')
  }
  return url.replace(/\/$/, '')
}

async function medusaInternal<T>(
  path: string,
  init: RequestInit & { method: string },
): Promise<T> {
  const response = await fetch(`${medusaBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-account-link-secret': sharedSecret(),
      ...(init.headers || {}),
    },
  })
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string
    message?: string
  }
  if (!response.ok) {
    throw new Error(
      (typeof body.error === 'string' && body.error) ||
        (typeof body.message === 'string' && body.message) ||
        `Medusa account-link request failed (${response.status})`,
    )
  }
  return body
}

/** Service: Medusa looks up a Payload user by email. */
export const accountLinkMedusaLookupHandler: Endpoint['handler'] = async (req) => {
  const unauthorized = assertMedusaSecret(req)
  if (unauthorized) return unauthorized

  const body = await parseJson(req)
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
  if (!email) {
    return Response.json({ error: 'email is required' }, { status: 400 })
  }

  const found = await req.payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  const user = found.docs[0] as LinkUserDoc | undefined
  return Response.json({ user: user ? toLinkUser(user) : null })
}

/** Service: Medusa completed a link — stamp ids on the Payload user. */
export const accountLinkMedusaCompleteHandler: Endpoint['handler'] = async (req) => {
  const unauthorized = assertMedusaSecret(req)
  if (unauthorized) return unauthorized

  const body = await parseJson(req)
  const payloadUserId = body.payloadUserId
  const medusaCustomerId = body.medusaCustomerId
  const medusaCustomerEmail = body.medusaCustomerEmail

  if (
    payloadUserId == null ||
    typeof medusaCustomerId !== 'string' ||
    typeof medusaCustomerEmail !== 'string'
  ) {
    return Response.json(
      { error: 'payloadUserId, medusaCustomerId, and medusaCustomerEmail are required' },
      { status: 400 },
    )
  }

  const updated = (await req.payload.update({
    collection: 'users',
    id: String(payloadUserId),
    data: {
      medusaCustomerId,
      medusaCustomerEmail: normalizeEmail(medusaCustomerEmail),
      accountLinkedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })) as unknown as LinkUserDoc

  return Response.json({ user: toLinkUser(updated) })
}

/** Service: clear Payload-side link fields. */
export const accountLinkMedusaUnlinkHandler: Endpoint['handler'] = async (req) => {
  const unauthorized = assertMedusaSecret(req)
  if (unauthorized) return unauthorized

  const body = await parseJson(req)
  let userId = body.payloadUserId != null ? String(body.payloadUserId) : null

  if (!userId && typeof body.medusaCustomerId === 'string') {
    const found = await req.payload.find({
      collection: 'users',
      where: { medusaCustomerId: { equals: body.medusaCustomerId } },
      limit: 1,
      overrideAccess: true,
    })
    userId = found.docs[0] ? String(found.docs[0].id) : null
  }

  if (!userId) {
    return Response.json({ ok: true, cleared: false })
  }

  await req.payload.update({
    collection: 'users',
    id: userId,
    data: {
      medusaCustomerId: null,
      medusaCustomerEmail: null,
      accountLinkedAt: null,
    },
    overrideAccess: true,
  })

  return Response.json({ ok: true, cleared: true })
}

/** Logged-in Payload user: start linking a shop account (OTP emailed to shop email). */
export const accountLinkShopStartHandler: Endpoint['handler'] = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await parseJson(req)
  const shopEmail = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
  if (!shopEmail) {
    return Response.json({ error: 'Shop account email is required' }, { status: 400 })
  }

  const user = req.user as LinkUserDoc
  if (user.medusaCustomerId) {
    return Response.json(
      { error: 'This itsMillerTime account is already linked to a shop account.' },
      { status: 409 },
    )
  }

  try {
    const result = await medusaInternal<{
      challenge_id: string
      target_email: string
      expires_in_seconds: number
    }>('/internal/account-link/start', {
      method: 'POST',
      body: JSON.stringify({
        payload_user_id: String(user.id),
        payload_email: user.email,
        shop_email: shopEmail,
        roles: rolesOf(user),
        authentik_sub: null,
      }),
    })

    return Response.json(result, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not start shop linking' },
      { status: 400 },
    )
  }
}

/** Logged-in Payload user: confirm OTP for shop link. */
export const accountLinkShopConfirmHandler: Endpoint['handler'] = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await parseJson(req)
  const challengeId = typeof body.challenge_id === 'string' ? body.challenge_id : ''
  const code = typeof body.code === 'string' ? body.code : ''
  if (!challengeId || !code) {
    return Response.json({ error: 'challenge_id and code are required' }, { status: 400 })
  }

  const user = req.user as LinkUserDoc

  try {
    const result = await medusaInternal<{
      linked: boolean
      customer_id: string
      payload_user_id: string
      payload_email: string
      roles: string[]
    }>('/internal/account-link/confirm', {
      method: 'POST',
      body: JSON.stringify({
        payload_user_id: String(user.id),
        challenge_id: challengeId,
        code,
      }),
    })

    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not confirm shop linking' },
      { status: 400 },
    )
  }
}

/** Logged-in Payload user: unlink shop account. */
export const accountLinkShopUnlinkHandler: Endpoint['handler'] = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = req.user as LinkUserDoc
  if (!user.medusaCustomerId) {
    return Response.json({ ok: true, unlinked: false })
  }

  try {
    await medusaInternal('/internal/account-link/unlink', {
      method: 'POST',
      body: JSON.stringify({
        payload_user_id: String(user.id),
        medusa_customer_id: user.medusaCustomerId,
      }),
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not unlink shop account' },
      { status: 400 },
    )
  }

  return Response.json({ ok: true, unlinked: true })
}

/** Logged-in Payload user: link status for www UI. */
export const accountLinkShopStatusHandler: Endpoint['handler'] = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = req.user as LinkUserDoc
  return Response.json({
    linked: Boolean(user.medusaCustomerId),
    medusa_customer_id: user.medusaCustomerId || null,
    medusa_customer_email: user.medusaCustomerEmail || null,
    linked_at: user.accountLinkedAt || null,
  })
}
