import { Catch, type ArgumentsHost, type ExceptionFilter, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { GateBlocked, InsufficientFunds, LedgerError } from "./ledger";

@Catch(LedgerError)
export class LedgerExceptionFilter implements ExceptionFilter {
  catch(exception: LedgerError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.BAD_REQUEST;
    if (exception instanceof InsufficientFunds) status = HttpStatus.CONFLICT;
    if (exception instanceof GateBlocked) status = HttpStatus.FORBIDDEN;
    res.status(status).json({
      error: exception.message,
      code: exception.name,
      gate: exception instanceof GateBlocked ? exception.gate : undefined,
    });
  }
}
