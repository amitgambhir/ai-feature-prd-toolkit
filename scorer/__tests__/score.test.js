import handler from '../pages/api/score';

// Minimal Next.js req/res mocks
function mockReq({ method = 'POST', body = {} } = {}) {
  return { method, body };
}

function mockRes() {
  const res = {
    _status: null,
    _json: null,
    status(code) { this._status = code; return this; },
    json(data) { this._json = data; return this; },
  };
  return res;
}

const VALID_PRD = 'A'.repeat(200);
const SCORE_RESPONSE = {
  total: 7,
  verdict: 'Address gaps before sprint planning',
  dimensions: [],
  top_gaps: ['No golden dataset'],
  summary: 'PRD is mostly complete.',
};

function makeAnthropicOk(body) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      content: [{ text: JSON.stringify(body) }],
    }),
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

afterEach(() => {
  jest.resetAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.SCORER_ACCESS_TOKEN;
});

// ── Method enforcement ──────────────────────────────────────────────────────

describe('method enforcement', () => {
  test.each(['GET', 'PUT', 'DELETE', 'PATCH'])('%s returns 405', async (method) => {
    const res = mockRes();
    await handler(mockReq({ method }), res);
    expect(res._status).toBe(405);
  });
});

// ── Input validation ────────────────────────────────────────────────────────

describe('input validation', () => {
  it('rejects missing prdText', async () => {
    const res = mockRes();
    await handler(mockReq({ body: {} }), res);
    expect(res._status).toBe(400);
  });

  it('rejects prdText shorter than 100 chars', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: 'A'.repeat(99) } }), res);
    expect(res._status).toBe(400);
  });

  it('accepts prdText of exactly 100 chars', async () => {
    global.fetch.mockReturnValue(makeAnthropicOk(SCORE_RESPONSE));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: 'A'.repeat(100) } }), res);
    expect(res._status).toBe(200);
  });

  it('rejects prdText longer than 50000 chars', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: 'A'.repeat(50001) } }), res);
    expect(res._status).toBe(400);
  });

  it('accepts prdText of exactly 50000 chars', async () => {
    global.fetch.mockReturnValue(makeAnthropicOk(SCORE_RESPONSE));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: 'A'.repeat(50000) } }), res);
    expect(res._status).toBe(200);
  });
});

// ── Security: input type enforcement ───────────────────────────────────────
// Non-string types must be rejected — passing objects/arrays could cause
// unexpected prompt injection or prototype-level weirdness downstream.

describe('security — input type enforcement', () => {
  it('rejects prdText as object', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: { evil: 'payload' } } }), res);
    expect(res._status).toBe(400);
  });

  it('rejects prdText as array', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: ['A'.repeat(200)] } }), res);
    expect(res._status).toBe(400);
  });

  it('rejects prdText as number', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: 12345 } }), res);
    expect(res._status).toBe(400);
  });

  it('rejects prdText as boolean', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: true } }), res);
    expect(res._status).toBe(400);
  });

  it('rejects prdText as null', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: null } }), res);
    expect(res._status).toBe(400);
  });
});

// ── Security: API key never exposed ────────────────────────────────────────

describe('security — API key not leaked', () => {
  it('does not include ANTHROPIC_API_KEY in the response', async () => {
    global.fetch.mockReturnValue(makeAnthropicOk(SCORE_RESPONSE));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    const body = JSON.stringify(res._json);
    expect(body).not.toContain('test-key');
    expect(body).not.toContain('ANTHROPIC_API_KEY');
  });

  it('passes the API key in the upstream request header, not the response', async () => {
    global.fetch.mockReturnValue(makeAnthropicOk(SCORE_RESPONSE));
    await handler(mockReq({ body: { prdText: VALID_PRD } }), mockRes());
    const [, fetchOptions] = global.fetch.mock.calls[0];
    expect(fetchOptions.headers['x-api-key']).toBe('test-key');
  });
});

// ── Security: response isolation ───────────────────────────────────────────
// The raw Anthropic response must never be forwarded. Only the parsed score
// object should reach the client.

describe('security — raw upstream response not forwarded', () => {
  it('returns only the parsed score fields, not the full Anthropic envelope', async () => {
    global.fetch.mockReturnValue(makeAnthropicOk(SCORE_RESPONSE));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._json).not.toHaveProperty('content');
    expect(res._json).not.toHaveProperty('model');
    expect(res._json).not.toHaveProperty('usage');
    expect(res._json).toHaveProperty('total');
    expect(res._json).toHaveProperty('verdict');
  });
});

// ── Code fence stripping ────────────────────────────────────────────────────
// Claude occasionally wraps JSON in markdown code fences despite instructions.

describe('code fence stripping', () => {
  it('parses JSON wrapped in ```json fences', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: '```json\n' + JSON.stringify(SCORE_RESPONSE) + '\n```' }],
      }),
    }));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(200);
    expect(res._json.total).toBe(7);
  });

  it('parses JSON wrapped in plain ``` fences', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: '```\n' + JSON.stringify(SCORE_RESPONSE) + '\n```' }],
      }),
    }));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(200);
    expect(res._json.total).toBe(7);
  });
});

// ── Error handling ──────────────────────────────────────────────────────────

describe('error handling', () => {
  it('returns 504 on request timeout', async () => {
    global.fetch.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(504);
  });

  it('returns 500 when Anthropic responds with a non-ok status', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 503,
      text: () => Promise.resolve('service unavailable'),
    }));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(500);
  });

  it('returns 500 when response content is missing', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ content: [] }),
    }));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(500);
  });

  it('returns 500 when Claude returns malformed JSON', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: 'this is not json {{}' }],
      }),
    }));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(500);
    // Malformed upstream content must not be forwarded raw
    expect(JSON.stringify(res._json)).not.toContain('this is not json');
  });
});

// ── Happy path ──────────────────────────────────────────────────────────────

describe('happy path', () => {
  it('returns 200 with the parsed score object', async () => {
    global.fetch.mockReturnValue(makeAnthropicOk(SCORE_RESPONSE));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(200);
    expect(res._json).toEqual(SCORE_RESPONSE);
  });
});

// ── Missing API key ──────────────────────────────────────────────────────────
// The handler must fail clearly when misconfigured rather than forwarding a
// blank API key to Anthropic and returning a cryptic error.

describe('missing API key', () => {
  it('returns 503 when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(503);
    expect(res._json.error).toMatch(/not configured/i);
  });

  it('does not call Anthropic when API key is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await handler(mockReq({ body: { prdText: VALID_PRD } }), mockRes());
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ── Access token gate ────────────────────────────────────────────────────────
// When SCORER_ACCESS_TOKEN is set, the endpoint is restricted. Unmatched or
// missing tokens must be rejected before Anthropic is ever called.

describe('access token gate', () => {
  beforeEach(() => {
    process.env.SCORER_ACCESS_TOKEN = 'secret-code';
  });

  it('returns 401 when access token is missing', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(401);
  });

  it('returns 401 when access token is wrong', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD, accessToken: 'wrong' } }), res);
    expect(res._status).toBe(401);
  });

  it('returns 401 for a non-string access token', async () => {
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD, accessToken: 12345 } }), res);
    expect(res._status).toBe(401);
  });

  it('does not call Anthropic when access token is wrong', async () => {
    await handler(mockReq({ body: { prdText: VALID_PRD, accessToken: 'wrong' } }), mockRes());
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('proceeds when access token is correct', async () => {
    global.fetch.mockReturnValue(makeAnthropicOk(SCORE_RESPONSE));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD, accessToken: 'secret-code' } }), res);
    expect(res._status).toBe(200);
  });

  it('is not required when SCORER_ACCESS_TOKEN env var is unset', async () => {
    delete process.env.SCORER_ACCESS_TOKEN;
    global.fetch.mockReturnValue(makeAnthropicOk(SCORE_RESPONSE));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(200);
  });
});

// ── Anthropic-specific error codes ───────────────────────────────────────────

describe('Anthropic error codes', () => {
  it('returns 500 with a key-invalid message on Anthropic 401', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 401,
      text: () => Promise.resolve('unauthorized'),
    }));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(500);
    expect(res._json.error).toMatch(/invalid/i);
  });

  it('returns 429 with a quota message on Anthropic 429', async () => {
    global.fetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
    }));
    const res = mockRes();
    await handler(mockReq({ body: { prdText: VALID_PRD } }), res);
    expect(res._status).toBe(429);
    expect(res._json.error).toMatch(/quota/i);
  });
});
