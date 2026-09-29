import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AgenticFormError } from './errors';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown) {
  if (error instanceof AgenticFormError) {
    return NextResponse.json({ error: error.toResponse() }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Request did not match the expected schema.',
        details: error.flatten(),
      },
    }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Request body must be valid JSON.',
      },
    }, { status: 400 });
  }
  return NextResponse.json({
    error: {
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Unexpected runtime error.',
    },
  }, { status: 500 });
}
