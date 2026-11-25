import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { map } from "rxjs/operators";
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    let status = 500,
      message = "Internal server error",
      errors: string[] = [];
    if (error instanceof HttpException) {
      status = error.getStatus();
      const r = error.getResponse() as any;
      const m = typeof r === "string" ? r : r.message;
      errors = Array.isArray(m) ? m : [String(m)];
      message = Array.isArray(m) ? "Validation failed" : String(m);
    } else if (error instanceof QueryFailedError) {
      const code = (error.driverError as any).code;
      if (
        [
          "ER_DUP_ENTRY",
          "ER_ROW_IS_REFERENCED_2",
          "ER_NO_REFERENCED_ROW_2",
          "ER_CHECK_CONSTRAINT_VIOLATED",
          "ER_LOCK_DEADLOCK",
          "ER_LOCK_WAIT_TIMEOUT",
        ].includes(code)
      ) {
        status = 409;
        message =
          code === "ER_DUP_ENTRY"
            ? "Unique value already exists"
            : "Related data, constraint or concurrent update conflict";
        errors = [message];
      }
    }
    if (status === 500) console.error(error?.message ?? error);
    host
      .switchToHttp()
      .getResponse()
      .status(status)
      .json({
        success: false,
        statusCode: status,
        message,
        errors,
        timestamp: new Date().toISOString(),
      });
  }
}
@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((data) => data));
  }
}
