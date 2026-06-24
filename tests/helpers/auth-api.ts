import { APIRequestContext, APIResponse } from '@playwright/test';

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(
  request: APIRequestContext,
  payload: LoginPayload
): Promise<APIResponse> {
  return request.post('/login', {
    data: payload,
  });
}