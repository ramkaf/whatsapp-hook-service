import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class JoinGroupDto {
  @ApiProperty({
    example: 'AbCdEfGhIjKlMnOpQrStUv',
    description: 'WhatsApp group invite code, not the full URL',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{10,128}$/)
  code: string;
}
