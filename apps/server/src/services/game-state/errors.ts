import { TaggedError } from "better-result";

export class CellClaimingWorkflowError extends TaggedError("CellClaimingWorkflowError")<{
  reason: "NotActivePlayer" | "CellAlreadyClaimed" | "NotAdjacent" | "OutOfBounds";
  message: string;
}>() {}
