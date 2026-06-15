import { TaggedError } from "better-result";

export class CellClaimingWorkflowError extends TaggedError("CellClaimingWorkflowError")<{
  reason: "OutOfBounds" | "NotActivePlayer" | "CellAlreadyClaimed" | "NotAdjacent" | "InvalidState";
  message: string;
}>() {}

export class GameStateError extends TaggedError("GameStateError")<{
  reason: "SessionNotFound";
  message: string;
}>() {}
