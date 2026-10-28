import { Injectable, Logger } from '@nestjs/common';
import type { GroupMessageContext } from '../group-message.context.ts';

@Injectable()
export class GroupMessageHandler {
  private readonly logger = new Logger(GroupMessageHandler.name);

  handle(context: GroupMessageContext): void | Promise<void> {
    console.log({context});
    
    this.logger.log(
      `Received ${context.type ?? 'unknown'} message ${context.messageId} in ${context.groupJid}`,
    );

    // Run your application functions here, passing the full context:
    // await this.orders.process(context);
    // context.text, context.sender, context.group and context.raw are available.
    // Inject any required application services through this class's constructor.
  }
}
