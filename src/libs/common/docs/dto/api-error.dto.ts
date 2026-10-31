import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ type: Number, example: 401 })
  statusCode: number;

  @ApiProperty({ type: String, example: 'Unauthorized' })
  error: string;

  @ApiProperty({ type: String, example: 'Invalid WhatsApp API bearer token' })
  message: string;
}
