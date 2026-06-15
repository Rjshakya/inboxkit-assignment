import { TaggedError } from "better-result";

export class RedisError extends TaggedError("RedisError")<{
  message: string;
  operation: string;
}>() {}

export class DBError extends TaggedError("DBError")<{
  message: string;
  operation: string;
}>() {}

export class UnauthorizedError extends TaggedError("UnauthorizedError")<{
  message: string;
}>() {}
