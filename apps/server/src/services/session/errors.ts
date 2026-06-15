import { TaggedError } from "better-result";

export class SessionError extends TaggedError("SessionError")<{
  reason:
    | "NotFound"
    | "AdminRequired"
    | "NotEnoughPlayers"
    | "AlreadyStarted"
    | "AlreadyStartedByOther"
    | "PlayerAlreadyExist"
    | "NoActivePlayer"
    | "PlayerNotInSession"
    | "SessionFull"
    | "FailedToChangeActivePlayer";
  message: string;
}>() {}

export class RemovePlayerFromSessionErrors extends TaggedError("RemovePlayerFromSessionErrors")<{
  reason: "ONLY ADMIN CAN REMOVE";
  message: string;
}>() {}
