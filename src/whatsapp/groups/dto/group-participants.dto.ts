import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, Matches } from 'class-validator';

export class GroupParticipantsDto {
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
