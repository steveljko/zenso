import client from './client';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export async function register(input: RegisterInput) {
  const { data } = await client.post('/register', input);
  return data;
}
