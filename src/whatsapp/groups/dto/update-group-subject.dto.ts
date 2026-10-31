import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateGroupSubjectDto {
  @ApiProperty({ example: 'Afra Updated Group' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subject: string;
}
