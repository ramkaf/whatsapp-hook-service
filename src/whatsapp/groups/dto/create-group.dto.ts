import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Afra Group' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subject: string;

  @ApiProperty({
    example: ['989121234567@s.whatsapp.net'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @Matches(/^\d+@s\.whatsapp\.net$/, { each: true })
  participants: string[];
}
