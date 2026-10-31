import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { GroupParticipantsDto } from './group-participants.dto.ts';

export class GroupParticipantRoleDto extends GroupParticipantsDto {
  @ApiProperty({
    enum: ['promote', 'demote'],
  })
  @IsIn(['promote', 'demote'])
  action: 'promote' | 'demote';
}
