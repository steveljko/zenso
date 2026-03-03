import client from './client';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput) {
  const { data } = await client.post('/register', input);
  return data;
}

export async function login(input: LoginInput) {
  const { data } = await client.post('/login', input);
  return data;
}
