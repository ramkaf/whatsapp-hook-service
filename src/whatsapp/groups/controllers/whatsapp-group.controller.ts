import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { WhatsappGroupService } from './../providers/whatsapp-group.service.ts';
import { CreateGroupDto } from './../dto/create-group.dto.ts';
import { UpdateGroupSubjectDto } from './../dto/update-group-subject.dto.ts';
import { UpdateGroupDescriptionDto } from './../dto/update-group-description.dto.ts';
import { GroupParticipantsDto } from './../dto/group-participants.dto.ts';
import { GroupParticipantRoleDto } from './../dto/group-participant-role.dto.ts';
import { JoinGroupDto } from './../dto/join-group.dto.ts';
import { WhatsappConnectionGuard } from '../../connection/guards/whatsapp-connection.guard.ts';

@ApiTags('WhatsApp Groups')
@UseGuards(WhatsappConnectionGuard)
@Controller('whatsapp/groups')
export class WhatsappGroupController {
  constructor(private readonly whatsappGroupsService: WhatsappGroupService) {}

  @Get()
  @ApiOperation({ summary: 'Get all joined WhatsApp groups' })
  findAll() {
    return this.whatsappGroupsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create WhatsApp group' })
  create(@Body() dto: CreateGroupDto) {
    return this.whatsappGroupsService.create(dto.subject, dto.participants);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join group using invite code' })
  join(@Body() dto: JoinGroupDto) {
    return this.whatsappGroupsService.joinByInvite(dto.code);
  }

  @Get(':groupJid')
  @ApiOperation({ summary: 'Get WhatsApp group details' })
  findOne(@Param('groupJid') groupJid: string) {
    return this.whatsappGroupsService.findOne(groupJid);
  }

  @Get(':groupJid/participants')
  @ApiOperation({ summary: 'Get group participants' })
  getParticipants(@Param('groupJid') groupJid: string) {
    return this.whatsappGroupsService.getParticipants(groupJid);
  }

  @Patch(':groupJid/subject')
  @ApiOperation({ summary: 'Update group subject' })
  updateSubject(
    @Param('groupJid') groupJid: string,
    @Body() dto: UpdateGroupSubjectDto,
  ) {
    return this.whatsappGroupsService.updateSubject(groupJid, dto.subject);
  }

  @Patch(':groupJid/description')
  @ApiOperation({ summary: 'Update group description' })
  updateDescription(
    @Param('groupJid') groupJid: string,
    @Body() dto: UpdateGroupDescriptionDto,
  ) {
    return this.whatsappGroupsService.updateDescription(
      groupJid,
      dto.description,
    );
  }

  @Post(':groupJid/participants')
  @ApiOperation({ summary: 'Add group participants' })
  addParticipants(
    @Param('groupJid') groupJid: string,
    @Body() dto: GroupParticipantsDto,
  ) {
    return this.whatsappGroupsService.addParticipants(
      groupJid,
      dto.participants,
    );
  }

  @Delete(':groupJid/participants')
  @ApiOperation({ summary: 'Remove group participants' })
  removeParticipants(
    @Param('groupJid') groupJid: string,
    @Body() dto: GroupParticipantsDto,
  ) {
    return this.whatsappGroupsService.removeParticipants(
      groupJid,
      dto.participants,
    );
  }

  @Patch(':groupJid/participants/role')
  @ApiOperation({ summary: 'Promote or demote participants' })
  changeParticipantRole(
    @Param('groupJid') groupJid: string,
    @Body() dto: GroupParticipantRoleDto,
  ) {
    return this.whatsappGroupsService.changeParticipantRole(
      groupJid,
      dto.participants,
      dto.action,
    );
  }

  @Get(':groupJid/invite')
  @ApiOperation({ summary: 'Get group invite code' })
  getInviteCode(@Param('groupJid') groupJid: string) {
    return this.whatsappGroupsService.getInviteCode(groupJid);
  }

  @Post(':groupJid/invite/revoke')
  @ApiOperation({ summary: 'Revoke group invite code' })
  revokeInviteCode(@Param('groupJid') groupJid: string) {
    return this.whatsappGroupsService.revokeInviteCode(groupJid);
  }

  @Post(':groupJid/leave')
  @ApiOperation({ summary: 'Leave WhatsApp group' })
  leave(@Param('groupJid') groupJid: string) {
    return this.whatsappGroupsService.leave(groupJid);
  }
}
