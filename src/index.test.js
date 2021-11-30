/* eslint-disable max-lines */
import http from 'http'

import test from 'ava'
import fromString from 'from2-string'
import { TextHTTPError, JSONHTTPError } from 'micro-api-client'
import nock from 'nock'
import { v4 as uuidv4 } from 'uuid'

import { NetlifyAPI } from './index.js'

const scheme = 'http'
const domain = 'localhost'
const port = 1123
const pathPrefix = '/api/v10'
const host = `${domain}:${port}`
const origin = `${scheme}://${host}`
const testAccessToken = 'testAccessToken'

const AGENT_KEEP_ALIVE_MSECS = 60000
const AGENT_MAX_SOCKETS = 10
const AGENT_MAX_FREE_SOCKETS = 10
const AGENT_TIMEOUT = 60000
const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: AGENT_KEEP_ALIVE_MSECS,
  maxSockets: AGENT_MAX_SOCKETS,
  maxFreeSockets: AGENT_MAX_FREE_SOCKETS,
  timeout: AGENT_TIMEOUT,
})

const getClient = function (opts = {}) {
  return new NetlifyAPI(opts.accessToken, { scheme, host, pathPrefix, ...opts })
}

test('Default options', (t) => {
  const client = new NetlifyAPI({})
  t.is(client.scheme, 'https')
  t.is(client.host, 'api.netlify.com')
  t.is(client.pathPrefix, '/api/v1')
  t.is(client.accessToken, null)
  t.is(client.agent, undefined)
  t.deepEqual(client.globalParams, {})
  t.deepEqual(client.defaultHeaders, {
    'User-agent': 'netlify/js-client',
    accept: 'application/json',
  })
})

test('Can set|get scheme', (t) => {
  const client = new NetlifyAPI({ scheme })
  t.is(client.scheme, scheme)
})

test('Can set|get host', (t) => {
  const client = new NetlifyAPI({ host })
  t.is(client.host, host)
})

test('Can set|get pathPrefix', (t) => {
  const client = new NetlifyAPI({ pathPrefix })
  t.is(client.pathPrefix, pathPrefix)
})

test('Can set|get basePath', (t) => {
  const client = new NetlifyAPI({ scheme, host, pathPrefix })
  t.is(client.basePath, `${scheme}://${host}${pathPrefix}`)
})

test('Can update basePath', (t) => {
  const client = new NetlifyAPI({ scheme, host, pathPrefix })

  const newScheme = 'https'
  const newHost = `${domain}:1224`
  const newPathPrefix = '/v2'
  client.scheme = newScheme
  client.host = newHost
  client.pathPrefix = newPathPrefix

  t.is(client.basePath, `${newScheme}://${newHost}${newPathPrefix}`)
})

test('Can set user agent', (t) => {
  const userAgent = 'test'
  const client = new NetlifyAPI({ userAgent })
  t.is(client.defaultHeaders['User-agent'], userAgent)
})

test('Can set|get globalParams', (t) => {
  const testGlobalParams = { test: 'test' }
  const client = new NetlifyAPI({ globalParams: testGlobalParams })
  t.deepEqual(client.globalParams, testGlobalParams)
})

test('Can set|get access token', (t) => {
  const client = getClient()
  client.accessToken = testAccessToken
  t.is(client.accessToken, testAccessToken)
  t.is(client.defaultHeaders.Authorization, `Bearer ${testAccessToken}`)

  client.accessToken = undefined
  t.is(client.accessToken, null)
  t.is(client.defaultHeaders.Authorization, undefined)

  client.accessToken = testAccessToken
  t.is(client.accessToken, testAccessToken)
  t.is(client.defaultHeaders.Authorization, `Bearer ${testAccessToken}`)
})

test('Can specify access token as the first argument', (t) => {
  const client = new NetlifyAPI(testAccessToken, {})
  t.is(client.accessToken, testAccessToken)
})

test('Can specify access token as an option', (t) => {
  const client = new NetlifyAPI({ accessToken: testAccessToken })
  t.is(client.accessToken, testAccessToken)
})

test('Can use underscored parameters in path variables', async (t) => {
  const accountId = uuidv4()
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(200)

  const client = getClient()
  await client.getAccount({ account_id: accountId })

  t.true(scope.isDone())
})

test('Can use camelcase parameters in path variables', async (t) => {
  const accountId = uuidv4()
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(200)

  const client = getClient()
  await client.getAccount({ accountId })

  t.true(scope.isDone())
})

test('Can use global parameters in path variables', async (t) => {
  const accountId = uuidv4()
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(200)

  const client = getClient({ globalParams: { account_id: accountId } })
  await client.getAccount()

  t.true(scope.isDone())
})

test('Can use underscored parameters in query variables', async (t) => {
  const clientId = uuidv4()
  const scope = nock(origin).post(`${pathPrefix}/oauth/tickets`).query({ client_id: clientId }).reply(200)

  const client = getClient()
  await client.createTicket({ client_id: clientId })

  t.true(scope.isDone())
})

test('Can use camelcase parameters in query variables', async (t) => {
  const clientId = uuidv4()
  const scope = nock(origin).post(`${pathPrefix}/oauth/tickets`).query({ client_id: clientId }).reply(200)

  const client = getClient()
  await client.createTicket({ clientId })

  t.true(scope.isDone())
})

test('Can use global parameters in query variables', async (t) => {
  const clientId = uuidv4()
  const scope = nock(origin).post(`${pathPrefix}/oauth/tickets`).query({ client_id: clientId }).reply(200)

  const client = getClient({ globalParams: { client_id: clientId } })
  await client.createTicket()

  t.true(scope.isDone())
})

test('Allow array query parameters', async (t) => {
  const siteId = uuidv4()
  const scope = nock(origin)
    .get(
      `${pathPrefix}/sites/${siteId}/plugin_runs/latest?packages%5B%5D=%40scope%2Fpackage&packages%5B%5D=%40scope%2Fpackage-two`,
    )
    .reply(200)

  const client = getClient()
  await client.getLatestPluginRuns({ site_id: siteId, packages: ['@scope/package', '@scope/package-two'] })

  t.true(scope.isDone())
})

test('Can specify JSON request body as an object', async (t) => {
  const body = { test: 'test' }
  const scope = nock(origin).post(`${pathPrefix}/accounts`, body, { 'Content-Type': 'application/json' }).reply(200)

  const client = getClient()
  await client.createAccount({ body })

  t.true(scope.isDone())
})

test('Can specify JSON request body as a function', async (t) => {
  const body = { test: 'test' }
  const scope = nock(origin).post(`${pathPrefix}/accounts`, body, { 'Content-Type': 'application/json' }).reply(200)

  const client = getClient()
  await client.createAccount({ body: () => body })

  t.true(scope.isDone())
})

test('Can specify binary request body as a stream', async (t) => {
  const deployId = uuidv4()
  const path = 'testPath'
  const body = 'test'
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .put(`${pathPrefix}/deploys/${deployId}/files/${path}`, body, { 'Content-Type': 'application/octet-stream' })
    .reply(200, expectedResponse)

  const client = getClient()
  const response = await client.uploadDeployFile({ deploy_id: deployId, path, body: fromString(body) })

  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Can specify binary request body as a function', async (t) => {
  const deployId = uuidv4()
  const path = 'testPath'
  const body = 'test'
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .put(`${pathPrefix}/deploys/${deployId}/files/${path}`, body, { 'Content-Type': 'application/octet-stream' })
    .reply(200, expectedResponse)

  const client = getClient()
  const response = await client.uploadDeployFile({ deploy_id: deployId, path, body: () => fromString(body) })

  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Can use global parameters in request body', async (t) => {
  const body = { test: 'test' }
  const scope = nock(origin).post(`${pathPrefix}/accounts`, body).reply(200)

  const client = getClient({ globalParams: { body } })
  await client.createAccount()

  t.true(scope.isDone())
})

test('Validates required path parameters', async (t) => {
  const accountId = uuidv4()
  const scope = nock(origin).put(`${pathPrefix}/accounts/${accountId}`).reply(200)

  const client = getClient()
  await t.throwsAsync(client.updateAccount(), { message: "Missing required path variable 'account_id'" })

  t.false(scope.isDone())
})

test('Validates required query parameters', async (t) => {
  const accountSlug = uuidv4()
  const scope = nock(origin).post(`${pathPrefix}/${accountSlug}/members`).reply(200)

  const client = getClient()
  await t.throwsAsync(client.addMemberToAccount({ account_slug: accountSlug }), {
    message: "Missing required query variable 'email'",
  })

  t.false(scope.isDone())
})

test('Can set request headers', async (t) => {
  const headerName = 'test'
  const headerValue = 'test'
  const accountId = uuidv4()
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).matchHeader(headerName, headerValue).reply(200)

  const client = getClient()
  await client.getAccount({ account_id: accountId }, { headers: { [headerName]: headerValue } })

  t.true(scope.isDone())
})

test('Can parse JSON responses', async (t) => {
  const accountId = uuidv4()
  const expectedResponse = { test: 'test' }
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(200, expectedResponse)

  const client = getClient()
  const response = await client.getAccount({ account_id: accountId })

  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Can parse text responses', async (t) => {
  const accountId = uuidv4()
  const expectedResponse = 'test'
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(200, expectedResponse)

  const client = getClient()
  const response = await client.getAccount({ account_id: accountId })

  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Handle error empty responses', async (t) => {
  const accountId = uuidv4()
  const status = 404
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(status)

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id: accountId }))

  t.is(error.status, status)
  t.is(error.message, 'Not Found')
  t.is(error.data, '')
  t.true(error instanceof TextHTTPError)
  t.true(error.stack !== undefined)
  t.true(scope.isDone())
})

test('Handle error text responses', async (t) => {
  const accountId = uuidv4()
  const status = 404
  const expectedResponse = 'test'
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(status, expectedResponse)

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id: accountId }))

  t.is(error.status, status)
  t.is(error.message, 'Not Found')
  t.is(error.data, expectedResponse)
  t.true(error instanceof TextHTTPError)
  t.true(error.stack !== undefined)
  t.true(scope.isDone())
})

test('Handle error text responses on JSON endpoints', async (t) => {
  const accountId = uuidv4()
  const status = 404
  const expectedResponse = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(status, expectedResponse, { 'Content-Type': 'application/json' })

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id: accountId }))

  t.is(error.status, status)
  t.is(error.message, 'Not Found')
  t.is(error.data, expectedResponse)
  t.true(error instanceof TextHTTPError)
  t.true(error.stack !== undefined)
  t.true(scope.isDone())
})

test('Handle error JSON responses', async (t) => {
  const accountId = uuidv4()
  const status = 404
  const errorJson = { error: true }
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(status, errorJson)

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id: accountId }))

  t.is(error.status, status)
  t.is(error.message, 'Not Found')
  t.deepEqual(error.json, errorJson)
  t.true(error instanceof JSONHTTPError)
  t.true(error.stack !== undefined)
  t.true(scope.isDone())
})

test('Handle network errors', async (t) => {
  const accountId = uuidv4()
  const expectedResponse = 'test'
  const url = `${pathPrefix}/accounts/${accountId}`
  const scope = nock(origin).get(url).replyWithError(expectedResponse)

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id: accountId }))

  t.true(error instanceof Error)
  t.is(error.name, 'FetchError')
  t.true(error.message.includes(expectedResponse))
  t.is(error.url, `${origin}${url}`)
  t.is(error.data.method, 'GET')
  t.true(scope.isDone())
})

test('Can get an access token from a ticket', async (t) => {
  const ticketId = uuidv4()
  const accessToken = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/oauth/tickets/${ticketId}`)
    .reply(200, { authorized: true, id: ticketId })
    .post(`${pathPrefix}/oauth/tickets/${ticketId}/exchange`)
    .reply(200, { access_token: accessToken })

  const client = getClient()
  const timeout = 5e3
  const response = await client.getAccessToken({ id: ticketId, poll: 1, timeout })

  t.is(response, accessToken)
  t.is(client.accessToken, accessToken)
  t.true(scope.isDone())
})

test('Can poll for access token', async (t) => {
  const ticketId = uuidv4()
  const accessToken = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/oauth/tickets/${ticketId}`)
    .reply(200, {})
    .get(`${pathPrefix}/oauth/tickets/${ticketId}`)
    .reply(200, { authorized: true, id: ticketId })
    .post(`${pathPrefix}/oauth/tickets/${ticketId}/exchange`)
    .reply(200, { access_token: accessToken })

  const client = getClient()
  await client.getAccessToken({ id: ticketId })

  t.true(scope.isDone())
})

test('Can change access token polling', async (t) => {
  const ticketId = uuidv4()
  const accessToken = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/oauth/tickets/${ticketId}`)
    .reply(200, {})
    .get(`${pathPrefix}/oauth/tickets/${ticketId}`)
    .reply(200, { authorized: true, id: ticketId })
    .post(`${pathPrefix}/oauth/tickets/${ticketId}/exchange`)
    .reply(200, { access_token: accessToken })

  const client = getClient()
  await client.getAccessToken({ id: ticketId }, { poll: 1 })

  t.true(scope.isDone())
})

test('Can timeout access token polling', async (t) => {
  const ticketId = uuidv4()
  const accessToken = 'test'
  const scope = nock(origin)
    .get(`${pathPrefix}/oauth/tickets/${ticketId}`)
    .reply(200, {})
    .get(`${pathPrefix}/oauth/tickets/${ticketId}`)
    .reply(200, { authorized: true, id: ticketId })
    .post(`${pathPrefix}/oauth/tickets/${ticketId}/exchange`)
    .reply(200, { access_token: accessToken })

  const client = getClient()
  await t.throwsAsync(client.getAccessToken({ id: ticketId }, { poll: 1, timeout: 1 }), {
    message: 'Promise timed out after 1 milliseconds',
  })

  t.false(scope.isDone())
})

test('Retries on server errors', async (t) => {
  const accountId = uuidv4()
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(500)
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(200, expectedResponse)

  const client = getClient()
  const response = await client.getAccount({ account_id: accountId })

  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Handles API rate limiting', async (t) => {
  const accountId = uuidv4()
  const retryAtMs = Date.now() + TEST_RATE_LIMIT_DELAY
  const retryAt = Math.ceil(retryAtMs / SECS_TO_MSECS)
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(429, { retryAt }, { 'X-RateLimit-Reset': retryAt })
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(200, expectedResponse)

  const client = getClient()
  const response = await client.getAccount({ account_id: accountId })

  t.true(Date.now() >= retryAtMs)
  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Handles API rate limiting when date is in the past', async (t) => {
  const accountId = uuidv4()
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(429, { retryAt: 0 }, { 'X-RateLimit-Reset': 0 })
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(200, expectedResponse)

  const client = getClient()
  await client.getAccount({ account_id: accountId })

  t.true(scope.isDone())
})

test('Handles API rate limiting when X-RateLimit-Reset is missing', async (t) => {
  const accountId = uuidv4()
  const expectedResponse = { test: 'test' }
  const retryAt = 'invalid'
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(429, { retryAt })
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(200, expectedResponse)

  const client = getClient()
  await client.getAccount({ account_id: accountId })

  t.true(scope.isDone())
})

test('Gives up retrying on API rate limiting after a timeout', async (t) => {
  const accountId = uuidv4()
  const retryAt = Math.ceil(Date.now() / SECS_TO_MSECS)
  const expectedResponse = { test: 'test' }
  const times = 20
  const scope = nock(origin)
    .get(`${pathPrefix}/accounts/${accountId}`)
    .times(times)
    .reply(429, { retryAt }, { 'X-RateLimit-Reset': retryAt })
    .get(`${pathPrefix}/accounts/${accountId}`)
    .reply(200, expectedResponse)

  const client = getClient()
  const error = await t.throwsAsync(client.getAccount({ account_id: accountId }))

  t.is(error.status, 429)
  t.is(error.message, 'Too Many Requests')
  t.true(Number.isInteger(error.json.retryAt))

  t.false(scope.isDone())
})

const errorCodes = ['ETIMEDOUT', 'ECONNRESET']
errorCodes.forEach((code) => {
  test(`Retries on ${code} connection errors`, async (t) => {
    const accountId = uuidv4()
    const retryAtMs = Date.now() + TEST_RATE_LIMIT_DELAY
    const expectedResponse = { test: 'test' }
    const scope = nock(origin)
      .get(`${pathPrefix}/accounts/${accountId}`)
      .replyWithError({ code })
      .get(`${pathPrefix}/accounts/${accountId}`)
      .reply(200, expectedResponse)

    const client = getClient()
    const response = await client.getAccount({ account_id: accountId })

    t.true(Date.now() >= retryAtMs)
    t.deepEqual(response, expectedResponse)
    t.true(scope.isDone())
  })
})

test('Recreates a function body when handling API rate limiting', async (t) => {
  const deployId = uuidv4()
  const path = 'testPath'
  const body = 'test'
  const retryAtMs = Date.now() + TEST_RATE_LIMIT_DELAY
  const retryAt = Math.ceil(retryAtMs / SECS_TO_MSECS)
  const expectedResponse = { test: 'test' }
  const scope = nock(origin)
    .put(`${pathPrefix}/deploys/${deployId}/files/${path}`, body, { 'Content-Type': 'application/octet-stream' })
    .reply(429, { retryAt }, { 'X-RateLimit-Reset': retryAt })
    .put(`${pathPrefix}/deploys/${deployId}/files/${path}`, body, { 'Content-Type': 'application/octet-stream' })
    .reply(200, expectedResponse)
  const client = getClient()
  const response = await client.uploadDeployFile({ deploy_id: deployId, path, body: () => fromString(body) })

  t.true(Date.now() >= retryAtMs)
  t.deepEqual(response, expectedResponse)
  t.true(scope.isDone())
})

test('Can set (proxy) agent', (t) => {
  const client = getClient({ accessToken: testAccessToken, agent })
  t.is(client.agent, agent)
})

test('(Proxy) agent is passed as request option', async (t) => {
  const accountId = uuidv4()
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(200)

  const client = getClient({ accessToken: testAccessToken, agent })
  await client.getAccount({ account_id: accountId })
  t.is(scope.interceptors[0].req.options.agent, agent)
})

test('(Proxy) agent is not passed as request option if not set', async (t) => {
  const accountId = uuidv4()
  const scope = nock(origin).get(`${pathPrefix}/accounts/${accountId}`).reply(200)

  const client = getClient({ accessToken: testAccessToken })
  await client.getAccount({ account_id: accountId })
  t.falsy(scope.interceptors[0].req.options.agent)
})

const TEST_RATE_LIMIT_DELAY = 5e3
const SECS_TO_MSECS = 1e3
/* eslint-enable max-lines */
