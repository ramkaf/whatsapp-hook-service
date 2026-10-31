import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { WhatsappConnectService } from '../../connection/providers/wa-connect.service.ts';

@Injectable()
export class WhatsappGroupService {
  private readonly logger = new Logger(WhatsappGroupService.name);

  constructor(private readonly connection: WhatsappConnectService) {}

  async findAll() {
    const socket = this.connection.getSocket();

    try {
      const groups = await socket.groupFetchAllParticipating();

      return Object.values(groups).map((group) => ({
        id: group.id,
        name: group.subject,
        description: group.desc ?? null,
        owner: group.owner ?? null,
        participantsCount: group.participants.length,
        announcementOnly: group.announce ?? false,
        adminsOnlySettings: group.restrict ?? false,
        createdAt: group.creation ?? null,
      }));
    } catch (error) {
      this.handleError(error, 'fetch groups');
    }
  }

  async findOne(groupJid: string) {
    const socket = this.connection.getSocket();

    try {
      const group = await socket.groupMetadata(groupJid);

      return {
        id: group.id,
        name: group.subject,
        description: group.desc ?? null,
        owner: group.owner ?? null,
        participantsCount: group.participants.length,
        announcementOnly: group.announce ?? false,
        adminsOnlySettings: group.restrict ?? false,
        createdAt: group.creation ?? null,
      };
    } catch (error) {
      this.handleError(error, 'fetch group details');
    }
  }

  async getParticipants(groupJid: string) {
    const socket = this.connection.getSocket();

    try {
      const group = await socket.groupMetadata(groupJid);
      return {
        groupJid: group.id,
        total: group.participants.length,
        participants: group.participants.map((participant) => ({
          id: participant.id,
          admin: participant.admin ?? null,
          phoneNumer: participant.phoneNumber,
        })),
      };
    } catch (error) {
      this.handleError(error, 'fetch group participants');
    }
  }

  async create(subject: string, participants: string[]) {
    const socket = this.connection.getSocket();

    try {
      const group = await socket.groupCreate(subject, participants);

      this.logger.log(`WhatsApp group created: ${group.id}`);

      return {
        id: group.id,
        name: group.subject,
        participantsCount: group.participants.length,
      };
    } catch (error) {
      this.handleError(error, 'create group');
    }
  }

  async updateSubject(groupJid: string, subject: string) {
    const socket = this.connection.getSocket();

    try {
      await socket.groupUpdateSubject(groupJid, subject);

      return {
        groupJid,
        subject,
        updated: true,
      };
    } catch (error) {
      this.handleError(error, 'update group subject');
    }
  }

  async updateDescription(groupJid: string, description: string) {
    const socket = this.connection.getSocket();

    try {
      await socket.groupUpdateDescription(groupJid, description);

      return {
        groupJid,
        description,
        updated: true,
      };
    } catch (error) {
      this.handleError(error, 'update group description');
    }
  }

  async addParticipants(groupJid: string, participants: string[]) {
    const socket = this.connection.getSocket();

    try {
      return await socket.groupParticipantsUpdate(
        groupJid,
        participants,
        'add',
      );
    } catch (error) {
      this.handleError(error, 'add group participants');
    }
  }

  async removeParticipants(groupJid: string, participants: string[]) {
    const socket = this.connection.getSocket();

    try {
      return await socket.groupParticipantsUpdate(
        groupJid,
        participants,
        'remove',
      );
    } catch (error) {
      this.handleError(error, 'remove group participants');
    }
  }

  async changeParticipantRole(
    groupJid: string,
    participants: string[],
    action: 'promote' | 'demote',
  ) {
    const socket = this.connection.getSocket();

    try {
      return await socket.groupParticipantsUpdate(
        groupJid,
        participants,
        action,
      );
    } catch (error) {
      this.handleError(error, 'change participant role');
    }
  }

  async getInviteCode(groupJid: string) {
    const socket = this.connection.getSocket();

    try {
      const code = await socket.groupInviteCode(groupJid);

      return {
        groupJid,
        code: code ?? null,
        inviteUrl: code ? `https://chat.whatsapp.com/${code}` : null,
      };
    } catch (error) {
      this.handleError(error, 'fetch group invite code');
    }
  }

  async revokeInviteCode(groupJid: string) {
    const socket = this.connection.getSocket();

    try {
      const code = await socket.groupRevokeInvite(groupJid);

      return {
        groupJid,
        code: code ?? null,
        inviteUrl: code ? `https://chat.whatsapp.com/${code}` : null,
      };
    } catch (error) {
      this.handleError(error, 'revoke group invite code');
    }
  }

  async joinByInvite(code: string) {
    const socket = this.connection.getSocket();

    try {
      const groupJid = await socket.groupAcceptInvite(code);

      return {
        groupJid: groupJid ?? null,
      };
    } catch (error) {
      this.handleError(error, 'join group by invite');
    }
  }

  async leave(groupJid: string) {
    const socket = this.connection.getSocket();

    try {
      await socket.groupLeave(groupJid);

      this.logger.log(`Left WhatsApp group: ${groupJid}`);

      return {
        groupJid,
        left: true,
      };
    } catch (error) {
      this.handleError(error, 'leave group');
    }
  }

  private handleError(error: unknown, operation: string): never {
    this.logger.error(
      `Failed to ${operation}`,
      error instanceof Error ? error.stack : String(error),
    );

    throw new BadGatewayException(`WhatsApp failed to ${operation}`);
  }
}
