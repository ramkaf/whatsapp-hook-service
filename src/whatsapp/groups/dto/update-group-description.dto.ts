import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateGroupDescriptionDto {
  @ApiProperty({ example: 'Internal coordination group' })
  @IsString()
  @MaxLength(2048)
  description: string;
}
