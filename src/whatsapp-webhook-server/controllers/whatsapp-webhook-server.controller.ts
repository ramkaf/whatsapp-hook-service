import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { BaseLogUtil } from "#common";

@Controller("whatsapp-webhook")
export class WhatsappWebhookController extends BaseLogUtil {
  @Get()
  verify(@Req() req: Request, @Res() res: Response) {
    this.log.info('request recieved')
    return res.status(200).send("OK");
  }

  @Post()
  @HttpCode(200)
  handleWebhook(@Body() body: any, @Req() req: Request) {
    console.log("recived webhook");
    return { status: "received" };
  }
}
