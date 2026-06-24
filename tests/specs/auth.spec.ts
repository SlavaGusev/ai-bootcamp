import { expect, test } from '@playwright/test';
import { login } from '../helpers/auth-api';
import { breakUser, restoreUser } from '../helpers/npm';

const creds = require('../creds.js') as {
  validUser: {
    email: string;
    password: string;
  };
  invalidPassword: string;
  nonexistentUser: {
    email: string;
    password: string;
  };
};

test('Scenario 1: Successful Authentication Flow', async ({ request }) => {
  const response = await login(request, creds.validUser);
  const body = await response.json();

  expect(response.status()).toBe(200);
  expect(body).toEqual({
    success: true,
    message: 'Login successful',
    user: {
      id: expect.any(Number),
      email: creds.validUser.email,
      status: 'active',
    },
  });
});

test('Scenario 2: Blocked User Detection', async ({ request }) => {
  try {
    breakUser(creds.validUser.email);

    const response = await login(request, creds.validUser);
    const body = await response.json();

    expect(response.status()).toBe(403);
    expect(body).toEqual({
      error: 'User account is blocked',
    });
  } finally {
    restoreUser(creds.validUser.email);
  }
});

test('Scenario 3: Invalid Credentials', async ({ request }) => {
  const response = await login(request, {
    email: creds.validUser.email,
    password: creds.invalidPassword,
  });
  const body = await response.json();

  expect(response.status()).toBe(401);
  expect(body).toEqual({
    error: 'Invalid email or password',
  });
});

test('Scenario 4: Non-existent User', async ({ request }) => {
  const response = await login(request, creds.nonexistentUser);
  const body = await response.json();

  expect(response.status()).toBe(401);
  expect(body).toEqual({
    error: 'Invalid email or password',
  });
});