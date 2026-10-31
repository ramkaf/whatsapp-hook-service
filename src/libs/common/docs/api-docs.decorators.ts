import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type {
  ApiBodyOptions,
  ApiResponseOptions,
  OperationObject,
} from '@nestjs/swagger';

interface ControllerDocsOptions {
  tag: string;
  bearerAuth?: string;
  responses?: ApiResponseOptions[];
}

interface EndpointDocsOptions {
  summary: string;
  description?: string;
  body?: ApiBodyOptions;
  responses: ApiResponseOptions[];
}

/** Shared documentation only; authentication guards remain on each controller. */
export function ApiControllerDocs(options: ControllerDocsOptions) {
  return applyDecorators(
    ApiTags(options.tag),
    ...(options.bearerAuth ? [ApiBearerAuth(options.bearerAuth)] : []),
    ...(options.responses ?? []).map((response) => ApiResponse(response)),
  );
}

/** Controllers own the endpoint's title, description, body and response schemas. */
export function ApiEndpointDocs(options: EndpointDocsOptions) {
  const operation: Partial<OperationObject> = { summary: options.summary };
  if (options.description !== undefined)
    operation.description = options.description;
  return applyDecorators(
    ApiOperation(operation),
    ...(options.body ? [ApiBody(options.body)] : []),
    ...options.responses.map((response) => ApiResponse(response)),
  );
}
